import React from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm, useStore } from '@tanstack/react-form'

import type { User } from '../../../../../lib/types'
import type { ItineraryItem, LocationData, SocialEvent } from '../../../types'
import { EventVisibility } from '../../../types'
import { createEvent, fetchEventById, updateEvent } from '../../../../../services/eventService'
import { createItineraryItem, deleteItineraryItem, updateItineraryItem } from '../../../../../services/itineraryService'
import { toLocalDateTimeInputValue } from '../../../../../lib/ui/utils/datetime'
import { validateEventEditor } from '../utils/validateEventEditor'
import { computeEventTimes, diffItineraryItems, mapDraftItineraryItems, type DraftItineraryItem } from '../utils/eventEditorUtils'

type EditorMode = 'create' | 'update'

const EMPTY_STRING_ARR: string[] = []
const EMPTY_REACTIONS: SocialEvent['reactions'] = {}
const EMPTY_COMMENTS: SocialEvent['comments'] = []

type EventEditorValues = {
  title: string
  headerImageUrl: string
  location: string
  description: string
  startDateTimeLocal: string
  durationHours: number | ''
  activityType: string
  isFlexibleStart: boolean
  isFlexibleEnd: boolean
  noPhones: boolean
  maxSeats: number | ''
  coordinates: { lat: number; lng: number } | undefined
  locationData: LocationData | undefined
}

async function persistItineraryChanges(args: {
  eventId: string
  initialItems: ItineraryItem[]
  currentDrafts: DraftItineraryItem[]
}): Promise<void> {
  const { deletes, creates, updates } = diffItineraryItems(args.initialItems, args.currentDrafts)

  await Promise.all([
    ...deletes.map((id) => deleteItineraryItem(id)),
    ...updates.map((u) => updateItineraryItem(u.id, u.patch)),
    ...creates.map((c) =>
      createItineraryItem({
        eventId: args.eventId,
        title: c.title,
        startTime: c.startTime,
        durationMinutes: c.durationMinutes,
        location: c.location,
        description: c.description,
      }),
    ),
  ])
}

export function useEventEditorController(props: {
  mode: EditorMode
  currentUser: User
  initialEvent?: SocialEvent
  onCancel: () => void
  onSuccess: (event: SocialEvent) => void
}) {
  const isUpdate = props.mode === 'update'
  const draftIdRef = React.useRef<string>(globalThis.crypto?.randomUUID?.() ?? String(Date.now()))
  const defaultStartTimeIsoRef = React.useRef<string>(new Date().toISOString())

  const [itineraryItems, setItineraryItems] = React.useState<DraftItineraryItem[]>(() => {
    const existing = props.initialEvent?.itineraryItems ?? []
    return existing.map((i) => ({
      id: i.id,
      title: i.title,
      startTime: i.startTime,
      durationMinutes: i.durationMinutes,
      location: i.location,
      description: i.description,
    }))
  })

  const hasItinerary = itineraryItems.length > 0

  const defaultValues = React.useMemo<EventEditorValues>(() => {
    const ev = props.initialEvent
    if (ev) {
      const durationHours =
        ev.endTime
          ? Math.max(
              0,
              Math.round(((new Date(ev.endTime).getTime() - new Date(ev.startTime).getTime()) / 3_600_000) * 4) / 4,
            )
          : ''
      return {
        title: ev.title,
        headerImageUrl: ev.headerImageUrl ?? '',
        location: ev.location,
        description: ev.description,
        startDateTimeLocal: toLocalDateTimeInputValue(ev.startTime),
        durationHours: durationHours === 0 ? '' : durationHours,
        activityType: ev.activityType,
        isFlexibleStart: ev.isFlexibleStart,
        isFlexibleEnd: ev.isFlexibleEnd,
        noPhones: ev.noPhones,
        maxSeats: ev.maxSeats && ev.maxSeats > 0 ? ev.maxSeats : '',
        coordinates: ev.coordinates,
        locationData: ev.locationData,
      }
    }

    return {
      title: '',
      headerImageUrl: '',
      location: '',
      description: '',
      startDateTimeLocal: '',
      durationHours: '',
      activityType: 'Social',
      isFlexibleStart: false,
      isFlexibleEnd: false,
      noPhones: false,
      maxSeats: '',
      coordinates: undefined,
      locationData: undefined,
    }
  }, [
    props.initialEvent?.activityType,
    props.initialEvent?.coordinates?.lat,
    props.initialEvent?.coordinates?.lng,
    props.initialEvent?.locationData,
    props.initialEvent?.description,
    props.initialEvent?.headerImageUrl,
    props.initialEvent?.id,
    props.initialEvent?.isFlexibleEnd,
    props.initialEvent?.isFlexibleStart,
    props.initialEvent?.location,
    props.initialEvent?.maxSeats,
    props.initialEvent?.noPhones,
    props.initialEvent?.startTime,
    props.initialEvent?.title,
  ])

  const onSubmit = React.useCallback(
    async ({ value }: { value: EventEditorValues }) => {
      const title = value.title.trim()
      const location = value.location.trim()
      const description = value.description.trim()
      const activityType = String(value.activityType ?? '').trim()
      const startDateTimeLocal = value.startDateTimeLocal

      const errors = validateEventEditor(value, hasItinerary)
      if (Object.values(errors).some(Boolean)) throw new Error('Missing required fields')

      const times = computeEventTimes({
        hasItinerary,
        strictItinerary: hasItinerary,
        itineraryItems,
        startDateTimeLocal,
        durationHours: value.durationHours,
        fallbackStartIso: defaultStartTimeIsoRef.current,
      })
      if (!times) throw new Error('Missing required fields')
      if (!hasItinerary && !times.endTime) throw new Error('Missing required fields')
      if (hasItinerary && !times.endTime) throw new Error('Itinerary is missing required fields')

      const maxSeats = value.maxSeats === '' ? undefined : Number(value.maxSeats)
      const normalizedMaxSeats = maxSeats && maxSeats > 0 ? maxSeats : undefined

      if (!isUpdate) {
        const created = await createEvent({
          title,
          headerImageUrl: value.headerImageUrl.trim() || undefined,
          location,
          description,
          startTime: times.startTime,
          endTime: times.endTime,
          activityType,
          isFlexibleStart: value.isFlexibleStart,
          isFlexibleEnd: value.isFlexibleEnd,
          noPhones: value.noPhones,
          maxSeats: normalizedMaxSeats,
          visibilityType: EventVisibility.INVITE_ONLY,
          groupIds: [],
          allowFriendInvites: false,
          coordinates: value.coordinates,
          locationData: value.locationData,
        })
        if (!created) throw new Error('createEvent returned null')

        if (hasItinerary) {
          await persistItineraryChanges({
            eventId: created.id,
            initialItems: [],
            currentDrafts: itineraryItems,
          })
          const refreshed = await fetchEventById(created.id)
          props.onSuccess(refreshed ?? created)
          return
        }

        props.onSuccess(created)
        return
      }

      if (!props.initialEvent) throw new Error('Missing initialEvent for update mode')

      const updated = await updateEvent(props.initialEvent.id, {
        title,
        headerImageUrl: value.headerImageUrl.trim() || undefined,
        location,
        description,
        ...(hasItinerary ? {} : { startTime: times.startTime, endTime: times.endTime }),
        activityType,
        isFlexibleStart: value.isFlexibleStart,
        isFlexibleEnd: value.isFlexibleEnd,
        noPhones: value.noPhones,
        maxSeats: normalizedMaxSeats,
        visibilityType: EventVisibility.INVITE_ONLY,
        groupIds: [],
        allowFriendInvites: false,
        coordinates: value.coordinates,
        locationData: value.locationData,
      })

      if (!updated) throw new Error('updateEvent returned null')

      await persistItineraryChanges({
        eventId: props.initialEvent.id,
        initialItems: props.initialEvent.itineraryItems ?? [],
        currentDrafts: itineraryItems,
      })

      const refreshed = await fetchEventById(props.initialEvent.id)
      props.onSuccess(refreshed ?? updated)
    },
    [
      hasItinerary,
      isUpdate,
      itineraryItems,
      props.initialEvent,
      props.onSuccess,
    ],
  )

  const form = useForm({
    defaultValues,
    onSubmit,
  })

  const values = useStore(form.store, (s) => s.values)

  const detailErrors = React.useMemo(() => {
    const hasItinerary = itineraryItems.length > 0
    return validateEventEditor(values, hasItinerary)
  }, [itineraryItems.length, values.activityType, values.description, values.durationHours, values.location, values.startDateTimeLocal, values.title])

  const canSubmit = Object.values(detailErrors).every((v) => !v)
  const [showValidation, setShowValidation] = React.useState(false)

  const submitMutation = useMutation({
    mutationFn: async () => {
      await form.handleSubmit()
    },
  })

  const editingEventId = isUpdate ? (props.initialEvent?.id ?? draftIdRef.current) : draftIdRef.current

  const previewEvent: SocialEvent = React.useMemo(() => {
    const times = computeEventTimes({
      hasItinerary,
      strictItinerary: false,
      itineraryItems,
      startDateTimeLocal: values.startDateTimeLocal,
      durationHours: values.durationHours,
      fallbackStartIso: defaultStartTimeIsoRef.current,
    })

    return {
      id: editingEventId,
      slug: isUpdate ? (props.initialEvent?.slug ?? 'draft') : 'draft',
      hostId: props.currentUser.id,
      title: values.title,
      headerImageUrl: values.headerImageUrl,
      description: values.description,
      activityType: values.activityType,
      location: values.location,
      coordinates: values.coordinates,
      locationData: values.locationData,
      startTime: times?.startTime ?? defaultStartTimeIsoRef.current,
      endTime: times?.endTime ?? props.initialEvent?.endTime,
      isFlexibleStart: values.isFlexibleStart,
      isFlexibleEnd: values.isFlexibleEnd,
      visibilityType: EventVisibility.INVITE_ONLY,
      groupIds: EMPTY_STRING_ARR,
      allowFriendInvites: false,
      maxSeats:
        values.maxSeats === ''
          ? undefined
          : Number(values.maxSeats) > 0
            ? Number(values.maxSeats)
            : undefined,
      attendees: props.initialEvent?.attendees ?? EMPTY_STRING_ARR,
      noPhones: values.noPhones,
      comments: props.initialEvent?.comments ?? EMPTY_COMMENTS,
      reactions: props.initialEvent?.reactions ?? EMPTY_REACTIONS,
      itineraryItems: mapDraftItineraryItems(itineraryItems, editingEventId),
    }
  }, [
    editingEventId,
    hasItinerary,
    isUpdate,
    itineraryItems,
    props.currentUser.id,
    props.initialEvent?.attendees,
    props.initialEvent?.comments,
    props.initialEvent?.endTime,
    props.initialEvent?.reactions,
    props.initialEvent?.slug,
    values.activityType,
    values.coordinates,
    values.headerImageUrl,
    values.locationData,
    values.description,
    values.durationHours,
    values.isFlexibleEnd,
    values.isFlexibleStart,
    values.location,
    values.maxSeats,
    values.noPhones,
    values.startDateTimeLocal,
    values.title,
  ])

  const applyPatch = React.useCallback(
    (patch: Partial<SocialEvent>) => {
      if (patch.title !== undefined) form.setFieldValue('title', patch.title)
      if (patch.headerImageUrl !== undefined) form.setFieldValue('headerImageUrl', patch.headerImageUrl ?? '')
      if (patch.location !== undefined) form.setFieldValue('location', patch.location)
      if (patch.description !== undefined) form.setFieldValue('description', patch.description)
      if (patch.activityType !== undefined) form.setFieldValue('activityType', patch.activityType)
      if (patch.isFlexibleStart !== undefined) form.setFieldValue('isFlexibleStart', patch.isFlexibleStart)
      if (patch.isFlexibleEnd !== undefined) form.setFieldValue('isFlexibleEnd', patch.isFlexibleEnd)
      if (patch.noPhones !== undefined) form.setFieldValue('noPhones', patch.noPhones)
      if ('maxSeats' in patch) {
        const n = patch.maxSeats === undefined ? undefined : Number(patch.maxSeats)
        form.setFieldValue('maxSeats', n && n > 0 ? n : '')
      }
      if ('coordinates' in patch) form.setFieldValue('coordinates', patch.coordinates)
      if ('locationData' in patch) form.setFieldValue('locationData', patch.locationData)
      if (patch.startTime !== undefined) form.setFieldValue('startDateTimeLocal', toLocalDateTimeInputValue(patch.startTime))
    },
    [form],
  )

  const onChangeStartDateTimeLocal = React.useCallback(
    (value: string) => form.setFieldValue('startDateTimeLocal', value),
    [form],
  )

  const onChangeDurationHours = React.useCallback(
    (value: number | '') => form.setFieldValue('durationHours', value),
    [form],
  )

  const itineraryEditItems = React.useMemo(() => {
    return mapDraftItineraryItems(itineraryItems, editingEventId)
  }, [editingEventId, itineraryItems])

  const onAddItineraryItem = React.useCallback(
    (input: { title: string; startTime: string; durationMinutes: number; location?: string; description?: string }) => {
      const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now())
      setItineraryItems((prev) => [...prev, { id, ...input }])
      return id
    },
    [],
  )

  const onUpdateItineraryItem = React.useCallback(
    (
      id: string,
      patch: Partial<{ title: string; startTime: string; durationMinutes: number; location?: string; description?: string }>,
    ) => {
      setItineraryItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    },
    [],
  )

  const onDeleteItineraryItem = React.useCallback((id: string) => {
    setItineraryItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const itineraryApi = React.useMemo(() => {
    return {
      items: itineraryEditItems,
      onAdd: onAddItineraryItem,
      onUpdate: onUpdateItineraryItem,
      onDelete: onDeleteItineraryItem,
    }
  }, [itineraryEditItems, onAddItineraryItem, onDeleteItineraryItem, onUpdateItineraryItem])

  const primaryLabel = isUpdate ? 'Save changes' : 'Publish invite'

  const onSave = React.useCallback(() => {
    if (!canSubmit) {
      setShowValidation(true)
      return
    }
    submitMutation.mutate()
  }, [canSubmit, submitMutation])

  const editModel = React.useMemo(() => {
    return {
      canEdit: canSubmit,
      isSaving: submitMutation.isPending,
      primaryLabel,
      errors: showValidation ? detailErrors : undefined,
      startDateTimeLocal: values.startDateTimeLocal,
      onChangeStartDateTimeLocal,
      durationHours: values.durationHours,
      onChangeDurationHours,
      onChange: applyPatch,
      itinerary: itineraryApi,
      onSave,
      onCancel: props.onCancel,
    }
  }, [
    applyPatch,
    canSubmit,
    detailErrors,
    itineraryApi,
    onChangeDurationHours,
    onChangeStartDateTimeLocal,
    onSave,
    primaryLabel,
    props.onCancel,
    showValidation,
    submitMutation.isPending,
    values.durationHours,
    values.startDateTimeLocal,
  ])

  return { previewEvent, editModel }
}


