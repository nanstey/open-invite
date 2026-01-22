import React from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm, useStore } from '@tanstack/react-form'

import type { ItineraryItem, LocationData, SocialEvent, User } from '../lib/types'
import { EventVisibility } from '../lib/types'
import { EventDetail, type EventTab } from './EventDetail'
import { createEvent, fetchEventById, updateEvent } from '../services/eventService'
import { createItineraryItem, deleteItineraryItem, updateItineraryItem } from '../services/itineraryService'

type EditorMode = 'create' | 'update'

const EMPTY_STRING_ARR: string[] = []
const EMPTY_REACTIONS: SocialEvent['reactions'] = {}
const EMPTY_COMMENTS: SocialEvent['comments'] = []

type DraftItineraryItem = {
  id: string
  title: string
  startTime: string // ISO
  durationMinutes: number
  location?: string
  description?: string
}

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

function toLocalDateTimeInputValue(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  // yyyy-MM-ddTHH:mm (local)
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

export function EventEditor(props: {
  mode: EditorMode
  currentUser: User
  initialEvent?: SocialEvent
  activeTab?: EventTab
  onTabChange?: (tab: EventTab) => void
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

  const deriveEventTimeFromItinerary = React.useCallback((items: DraftItineraryItem[]) => {
    if (!items.length) return null
    const sorted = [...items].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    const start = sorted[0]?.startTime
    if (!start) return null

    let maxEndMs = -Infinity
    for (const item of sorted) {
      const startMs = new Date(item.startTime).getTime()
      const durMs = Math.max(0, Number(item.durationMinutes) || 0) * 60_000
      maxEndMs = Math.max(maxEndMs, startMs + durMs)
    }

    if (!Number.isFinite(maxEndMs)) return null
    return { startTime: new Date(start).toISOString(), endTime: new Date(maxEndMs).toISOString() }
  }, [])

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
      const durationHours =
        value.durationHours === '' ? undefined : Number(value.durationHours)

      // Description is optional; everything else is required.
      // If itinerary has items, event time is derived from itinerary and the base date+duration inputs are optional/ignored.
      if (!title || !location || !activityType) {
        throw new Error('Missing required fields')
      }

      let startTime = defaultStartTimeIsoRef.current
      let endTime: string | undefined = undefined

      if (hasItinerary) {
        const derived = deriveEventTimeFromItinerary(itineraryItems)
        if (!derived) throw new Error('Itinerary is missing required fields')
        startTime = derived.startTime
        endTime = derived.endTime
      } else {
        if (!startDateTimeLocal || !durationHours || durationHours <= 0) {
          throw new Error('Missing required fields')
        }
        startTime = new Date(value.startDateTimeLocal).toISOString()
        endTime = new Date(new Date(value.startDateTimeLocal).getTime() + durationHours * 3_600_000).toISOString()
      }

      const maxSeats = value.maxSeats === '' ? undefined : Number(value.maxSeats)
      const normalizedMaxSeats = maxSeats && maxSeats > 0 ? maxSeats : undefined

      if (!isUpdate) {
        const created = await createEvent({
          title,
          headerImageUrl: value.headerImageUrl.trim() || undefined,
          location,
          description,
          startTime,
          endTime,
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
        if (!hasItinerary) {
          props.onSuccess(created)
          return
        }

        // Persist itinerary items after we have an event id.
        await Promise.all(
          itineraryItems.map((item) =>
            createItineraryItem({
              eventId: created.id,
              title: item.title,
              startTime: item.startTime,
              durationMinutes: item.durationMinutes,
              location: item.location,
              description: item.description,
            }),
          ),
        )

        const refreshed = await fetchEventById(created.id)
        props.onSuccess(refreshed ?? created)
        return
      }

      if (!props.initialEvent) throw new Error('Missing initialEvent for update mode')

      const updated = await updateEvent(props.initialEvent.id, {
        title,
        headerImageUrl: value.headerImageUrl.trim() || undefined,
        location,
        description,
        ...(hasItinerary ? {} : { startTime, endTime }),
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
      // Persist itinerary changes (create/update/delete) in one batch, then refresh.
      const initialItems = props.initialEvent.itineraryItems ?? []
      const initialById = new Map(initialItems.map((i) => [i.id, i] as const))
      const currentItems = itineraryItems

      const currentIds = new Set(currentItems.map((i) => i.id))
      const initialIds = new Set(initialItems.map((i) => i.id))

      const deletes = initialItems
        .filter((i) => !currentIds.has(i.id))
        .map((i) => deleteItineraryItem(i.id))

      const creates = currentItems
        .filter((i) => !initialIds.has(i.id))
        .map((i) =>
          createItineraryItem({
            eventId: props.initialEvent!.id,
            title: i.title,
            startTime: i.startTime,
            durationMinutes: i.durationMinutes,
            location: i.location,
            description: i.description,
          }),
        )

      const updates = currentItems
        .filter((i) => initialById.has(i.id))
        .map((i) => {
          const prev = initialById.get(i.id)!
          const prevLocation = prev.location ?? undefined
          const prevDescription = prev.description ?? undefined
          const nextLocation = i.location ?? undefined
          const nextDescription = i.description ?? undefined

          const changed =
            prev.title !== i.title ||
            prev.startTime !== i.startTime ||
            prev.durationMinutes !== i.durationMinutes ||
            prevLocation !== nextLocation ||
            prevDescription !== nextDescription

          if (!changed) return null

          return updateItineraryItem(i.id, {
            title: i.title,
            startTime: i.startTime,
            durationMinutes: i.durationMinutes,
            location: nextLocation,
            description: nextDescription,
          })
        })
        .filter((x): x is Promise<any> => !!x)

      await Promise.all([...deletes, ...updates, ...creates])

      const refreshed = await fetchEventById(props.initialEvent.id)
      props.onSuccess(refreshed ?? updated)
    },
    [deriveEventTimeFromItinerary, hasItinerary, isUpdate, itineraryItems, props.initialEvent?.id, props.onSuccess],
  )

  const form = useForm({
    defaultValues,
    onSubmit,
  })

  const values = useStore(form.store, (s) => s.values)

  const detailErrors = React.useMemo(() => {
    const title = values.title.trim()
    const description = values.description.trim()
    const location = values.location.trim()
    const activityType = String(values.activityType ?? '').trim()
    const startDateTimeLocal = values.startDateTimeLocal
    const durationHours = values.durationHours === '' ? undefined : Number(values.durationHours)

    const hasItinerary = itineraryItems.length > 0

    return {
      title: title ? undefined : 'Title is required',
      activityType: activityType ? undefined : 'Category is required',
      // Description is optional
      description: undefined,
      startTime: hasItinerary ? undefined : startDateTimeLocal ? undefined : 'Date & time is required',
      durationHours: hasItinerary ? undefined : durationHours && durationHours > 0 ? undefined : 'Duration is required',
      location: location ? undefined : 'Location is required',
    }
  }, [itineraryItems.length, values.activityType, values.description, values.durationHours, values.location, values.startDateTimeLocal, values.title])

  const canSubmit = Object.values(detailErrors).every((v) => !v)
  const [showValidation, setShowValidation] = React.useState(false)

  const submitMutation = useMutation({
    mutationFn: async () => {
      await form.handleSubmit()
    },
  })

  const previewEvent: SocialEvent = React.useMemo(() => {
    const derived = hasItinerary ? deriveEventTimeFromItinerary(itineraryItems) : null
    const startTimeIso = derived?.startTime
      ?? (values.startDateTimeLocal ? new Date(values.startDateTimeLocal).toISOString() : defaultStartTimeIsoRef.current)
    const endTimeIso = derived?.endTime ?? (() => {
      const durationHours = values.durationHours === '' ? undefined : Number(values.durationHours)
      return values.startDateTimeLocal && durationHours && durationHours > 0
        ? new Date(new Date(values.startDateTimeLocal).getTime() + durationHours * 3_600_000).toISOString()
        : undefined
    })()

    return {
      id: isUpdate ? (props.initialEvent?.id ?? draftIdRef.current) : draftIdRef.current,
      slug: isUpdate ? (props.initialEvent?.slug ?? 'draft') : 'draft',
      hostId: props.currentUser.id,
      title: values.title,
      headerImageUrl: values.headerImageUrl,
      description: values.description,
      activityType: values.activityType,
      location: values.location,
      coordinates: values.coordinates,
      locationData: values.locationData,
      startTime: startTimeIso,
      endTime: endTimeIso ?? props.initialEvent?.endTime,
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
      itineraryItems: itineraryItems.map((i) => ({
        id: i.id,
        eventId: isUpdate ? (props.initialEvent?.id ?? draftIdRef.current) : draftIdRef.current,
        title: i.title,
        startTime: i.startTime,
        durationMinutes: i.durationMinutes,
        location: i.location,
        description: i.description,
      })) satisfies ItineraryItem[],
    }
  }, [
    deriveEventTimeFromItinerary,
    hasItinerary,
    isUpdate,
    itineraryItems,
    props.currentUser.id,
    props.initialEvent?.attendees,
    props.initialEvent?.comments,
    props.initialEvent?.endTime,
    props.initialEvent?.id,
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

  const title = isUpdate ? 'Edit invite' : 'New invite'
  const primaryLabel = isUpdate ? 'Save changes' : 'Publish invite'

  const applyPatch = (patch: Partial<SocialEvent>) => {
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
  }

  return (
    <EventDetail
      event={previewEvent}
      currentUser={props.currentUser}
      onUpdateEvent={() => {}}
      onClose={props.onCancel}
      showBackButton
      layout="shell"
      mode="edit"
      activeTab={props.activeTab}
      onTabChange={props.onTabChange}
      edit={{
        canEdit: canSubmit,
        isSaving: submitMutation.isPending,
        primaryLabel,
        errors: showValidation ? detailErrors : undefined,
        startDateTimeLocal: values.startDateTimeLocal,
        onChangeStartDateTimeLocal: (value) => form.setFieldValue('startDateTimeLocal', value),
        durationHours: values.durationHours,
        onChangeDurationHours: (value) => form.setFieldValue('durationHours', value),
        onChange: applyPatch,
        itinerary: {
          items: itineraryItems.map((i) => ({
            id: i.id,
            eventId: isUpdate ? (props.initialEvent?.id ?? draftIdRef.current) : draftIdRef.current,
            title: i.title,
            startTime: i.startTime,
            durationMinutes: i.durationMinutes,
            location: i.location,
            description: i.description,
          })),
          onAdd: (input) => {
            const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now())
            setItineraryItems((prev) => [...prev, { id, ...input }])
            return id
          },
          onUpdate: (id, patch) => {
            setItineraryItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
          },
          onDelete: (id) => {
            setItineraryItems((prev) => prev.filter((i) => i.id !== id))
          },
        },
        onSave: () => {
          if (!canSubmit) {
            setShowValidation(true)
            return
          }
          submitMutation.mutate()
        },
        onCancel: props.onCancel,
      }}
    />
  )
}


