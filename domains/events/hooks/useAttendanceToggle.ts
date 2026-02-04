import * as React from 'react'

import type { SocialEvent } from '../types'

export function useAttendanceToggle(input: {
  enabled: boolean
  event: SocialEvent
  currentUserId?: string
  isHost: boolean
  isAttending: boolean
  isFull: boolean
  onJoin?: (eventId: string) => Promise<void> | void
  onLeave?: (eventId: string) => Promise<void> | void
  onRequireAuth?: () => void
  onUpdateEvent: (updated: SocialEvent) => void
}) {
  const {
    enabled,
    event,
    currentUserId,
    isHost,
    isAttending,
    isFull,
    onJoin,
    onLeave,
    onRequireAuth,
    onUpdateEvent,
  } = input

  const isJoinDisabled =
    !enabled ||
    (isFull && !isAttending) ||
    (!currentUserId && !onRequireAuth)

  const applyOptimisticUpdate = React.useCallback(
    (next: SocialEvent) => {
      if (!enabled) return
      onUpdateEvent(next)
    },
    [enabled, onUpdateEvent],
  )

  const handleJoin = React.useCallback(async () => {
    if (!currentUserId) {
      onRequireAuth?.()
      return
    }
    if (isFull) return
    if (onJoin) {
      await onJoin(event.id)
      return
    }

    if (!event.attendees.includes(currentUserId)) {
      applyOptimisticUpdate({
        ...event,
        attendees: [...event.attendees, currentUserId],
      })
    }
  }, [applyOptimisticUpdate, currentUserId, event, isFull, onJoin, onRequireAuth])

  const handleLeave = React.useCallback(async () => {
    if (!currentUserId) {
      onRequireAuth?.()
      return
    }
    if (onLeave) {
      await onLeave(event.id)
      return
    }

    applyOptimisticUpdate({
      ...event,
      attendees: event.attendees.filter((id) => id !== currentUserId),
    })
  }, [applyOptimisticUpdate, currentUserId, event, onLeave, onRequireAuth])

  const onJoinLeave = React.useCallback(async () => {
    if (!enabled) return
    if (isHost) return
    if (isAttending) {
      await handleLeave()
      return
    }
    await handleJoin()
  }, [enabled, handleJoin, handleLeave, isAttending, isHost])

  return { isJoinDisabled, onJoinLeave }
}
