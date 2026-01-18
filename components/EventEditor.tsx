import React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm, useStore } from '@tanstack/react-form'

import type { SocialEvent, User } from '../lib/types'
import { EventVisibility } from '../lib/types'
import { EventDetail } from './EventDetail'
import { fetchGroups } from '../services/friendService'
import { createEvent, updateEvent } from '../services/eventService'

type EditorMode = 'create' | 'update'

const EMPTY_STRING_ARR: string[] = []
const EMPTY_REACTIONS: SocialEvent['reactions'] = {}
const EMPTY_COMMENTS: SocialEvent['comments'] = []

type EventEditorValues = {
  title: string
  location: string
  description: string
  startDateTimeLocal: string
  activityType: string
  isFlexibleStart: boolean
  isFlexibleEnd: boolean
  noPhones: boolean
  maxSeats: number | ''
  visibilityType: EventVisibility
  groupIds: string[]
  allowFriendInvites: boolean
  coordinates: { lat: number; lng: number }
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

function randomVicBcCoords(): { lat: number; lng: number } {
  const baseLat = 48.4284
  const baseLng = -123.3656
  const randomOffsetLat = (Math.random() - 0.5) * 0.05
  const randomOffsetLng = (Math.random() - 0.5) * 0.05
  return { lat: baseLat + randomOffsetLat, lng: baseLng + randomOffsetLng }
}

export function EventEditor(props: {
  mode: EditorMode
  currentUser: User
  initialEvent?: SocialEvent
  onCancel: () => void
  onSuccess: (event: SocialEvent) => void
}) {
  const isUpdate = props.mode === 'update'
  const draftIdRef = React.useRef<string>(globalThis.crypto?.randomUUID?.() ?? String(Date.now()))
  const defaultStartTimeIsoRef = React.useRef<string>(new Date().toISOString())

  const defaultValues = React.useMemo<EventEditorValues>(() => {
    const ev = props.initialEvent
    if (ev) {
      return {
        title: ev.title,
        location: ev.location,
        description: ev.description,
        startDateTimeLocal: toLocalDateTimeInputValue(ev.startTime),
        activityType: ev.activityType,
        isFlexibleStart: ev.isFlexibleStart,
        isFlexibleEnd: ev.isFlexibleEnd,
        noPhones: ev.noPhones,
        maxSeats: ev.maxSeats ?? '',
        visibilityType: ev.visibilityType,
        groupIds: ev.groupIds ?? [],
        allowFriendInvites: ev.allowFriendInvites,
        coordinates: ev.coordinates ?? randomVicBcCoords(),
      }
    }

    return {
      title: '',
      location: '',
      description: '',
      startDateTimeLocal: '',
      activityType: 'Social',
      isFlexibleStart: false,
      isFlexibleEnd: false,
      noPhones: false,
      maxSeats: '',
      visibilityType: EventVisibility.ALL_FRIENDS,
      groupIds: [],
      allowFriendInvites: false,
      coordinates: randomVicBcCoords(),
    }
  }, [
    props.initialEvent?.activityType,
    props.initialEvent?.allowFriendInvites,
    props.initialEvent?.coordinates?.lat,
    props.initialEvent?.coordinates?.lng,
    props.initialEvent?.description,
    props.initialEvent?.id,
    props.initialEvent?.isFlexibleEnd,
    props.initialEvent?.isFlexibleStart,
    props.initialEvent?.location,
    props.initialEvent?.maxSeats,
    props.initialEvent?.noPhones,
    props.initialEvent?.startTime,
    props.initialEvent?.title,
    props.initialEvent?.visibilityType,
    // Note: groupIds is an array; depend on id + joined values to keep memo stable across ref changes.
    props.initialEvent?.groupIds?.join('|'),
  ])

  const onSubmit = React.useCallback(
    async ({ value }: { value: EventEditorValues }) => {
      const startTime = value.startDateTimeLocal
        ? new Date(value.startDateTimeLocal).toISOString()
        : defaultStartTimeIsoRef.current

      if (!isUpdate) {
        const created = await createEvent({
          title: value.title,
          location: value.location,
          description: value.description,
          startTime,
          activityType: value.activityType,
          isFlexibleStart: value.isFlexibleStart,
          isFlexibleEnd: value.isFlexibleEnd,
          noPhones: value.noPhones,
          maxSeats: value.maxSeats === '' ? undefined : Number(value.maxSeats),
          visibilityType: value.visibilityType,
          groupIds: value.visibilityType === EventVisibility.GROUPS ? value.groupIds : [],
          allowFriendInvites: value.allowFriendInvites,
          coordinates: value.coordinates,
        })
        if (!created) throw new Error('createEvent returned null')
        props.onSuccess(created)
        return
      }

      if (!props.initialEvent) throw new Error('Missing initialEvent for update mode')

      const updated = await updateEvent(props.initialEvent.id, {
        title: value.title,
        location: value.location,
        description: value.description,
        startTime,
        activityType: value.activityType,
        isFlexibleStart: value.isFlexibleStart,
        isFlexibleEnd: value.isFlexibleEnd,
        noPhones: value.noPhones,
        maxSeats: value.maxSeats === '' ? undefined : Number(value.maxSeats),
        visibilityType: value.visibilityType,
        groupIds: value.visibilityType === EventVisibility.GROUPS ? value.groupIds : [],
        allowFriendInvites: value.allowFriendInvites,
        coordinates: value.coordinates,
      })

      if (!updated) throw new Error('updateEvent returned null')
      props.onSuccess(updated)
    },
    [isUpdate, props.initialEvent?.id, props.onSuccess],
  )

  const form = useForm({
    defaultValues,
    onSubmit,
  })

  const values = useStore(form.store, (s) => s.values)

  const groupsQuery = useQuery({
    queryKey: ['groups', props.currentUser.id],
    queryFn: () => fetchGroups(props.currentUser.id),
    enabled: values.visibilityType === EventVisibility.GROUPS,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      await form.handleSubmit()
    },
  })

  const previewEvent: SocialEvent = React.useMemo(() => {
    const startTimeIso = values.startDateTimeLocal
      ? new Date(values.startDateTimeLocal).toISOString()
      : defaultStartTimeIsoRef.current

    return {
      id: isUpdate ? (props.initialEvent?.id ?? draftIdRef.current) : draftIdRef.current,
      slug: isUpdate ? (props.initialEvent?.slug ?? 'draft') : 'draft',
      hostId: props.currentUser.id,
      title: values.title || 'Untitled invite',
      description: values.description || '',
      activityType: values.activityType,
      location: values.location || '',
      coordinates: values.coordinates,
      startTime: startTimeIso,
      endTime: props.initialEvent?.endTime,
      isFlexibleStart: values.isFlexibleStart,
      isFlexibleEnd: values.isFlexibleEnd,
      visibilityType: values.visibilityType,
      groupIds: values.visibilityType === EventVisibility.GROUPS ? values.groupIds : EMPTY_STRING_ARR,
      allowFriendInvites: values.allowFriendInvites,
      maxSeats: values.maxSeats === '' ? undefined : Number(values.maxSeats),
      attendees: props.initialEvent?.attendees ?? EMPTY_STRING_ARR,
      noPhones: values.noPhones,
      comments: props.initialEvent?.comments ?? EMPTY_COMMENTS,
      reactions: props.initialEvent?.reactions ?? EMPTY_REACTIONS,
    }
  }, [
    isUpdate,
    props.currentUser.id,
    props.initialEvent?.attendees,
    props.initialEvent?.comments,
    props.initialEvent?.endTime,
    props.initialEvent?.id,
    props.initialEvent?.reactions,
    props.initialEvent?.slug,
    values.activityType,
    values.allowFriendInvites,
    values.coordinates,
    values.description,
    values.groupIds,
    values.isFlexibleEnd,
    values.isFlexibleStart,
    values.location,
    values.maxSeats,
    values.noPhones,
    values.startDateTimeLocal,
    values.title,
    values.visibilityType,
  ])

  const title = isUpdate ? 'Edit invite' : 'New invite'
  const primaryLabel = isUpdate ? 'Save changes' : 'Publish invite'

  const applyPatch = (patch: Partial<SocialEvent>) => {
    if (patch.title !== undefined) form.setFieldValue('title', patch.title)
    if (patch.location !== undefined) form.setFieldValue('location', patch.location)
    if (patch.description !== undefined) form.setFieldValue('description', patch.description)
    if (patch.activityType !== undefined) form.setFieldValue('activityType', patch.activityType)
    if (patch.isFlexibleStart !== undefined) form.setFieldValue('isFlexibleStart', patch.isFlexibleStart)
    if (patch.isFlexibleEnd !== undefined) form.setFieldValue('isFlexibleEnd', patch.isFlexibleEnd)
    if (patch.noPhones !== undefined) form.setFieldValue('noPhones', patch.noPhones)
    if (patch.maxSeats !== undefined) form.setFieldValue('maxSeats', patch.maxSeats === undefined ? '' : Number(patch.maxSeats))
    if (patch.visibilityType !== undefined) form.setFieldValue('visibilityType', patch.visibilityType)
    if (patch.groupIds !== undefined) form.setFieldValue('groupIds', patch.groupIds)
    if (patch.allowFriendInvites !== undefined) form.setFieldValue('allowFriendInvites', patch.allowFriendInvites)
    if (patch.coordinates !== undefined) form.setFieldValue('coordinates', patch.coordinates)
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
      edit={{
        canEdit: true,
        isSaving: submitMutation.isPending,
        primaryLabel,
        groups: groupsQuery.data ?? [],
        groupsLoading: groupsQuery.isLoading,
        onChange: applyPatch,
        onSave: () => submitMutation.mutate(),
        onCancel: props.onCancel,
      }}
    />
  )
}


