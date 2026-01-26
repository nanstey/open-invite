import * as React from 'react'

import type { SocialEvent } from '../../../types'

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
}): { isToggling: boolean; isJoinDisabled: boolean; onJoinLeave: () => Promise<void> } {
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

  const [isToggling, setIsToggling] = React.useState(false)

  const isGuest = !currentUserId
  const isJoinDisabled = isToggling || (!isAttending && isFull)

  const onJoinLeave = React.useCallback(async () => {
    if (!enabled) return
    if (isHost) return
    if (isGuest) {
      onRequireAuth?.()
      return
    }

    // If the parent provided join/leave handlers, use those (persist to DB).
    if (onJoin && onLeave) {
      if (isToggling) return
      if (!isAttending && isFull) return // Full

      setIsToggling(true)
      try {
        if (isAttending) {
          await onLeave(event.id)
        } else {
          await onJoin(event.id)
        }
      } finally {
        setIsToggling(false)
      }
      return
    }

    // Fallback: local-only toggle (used in previews/public shells)
    let newAttendees: string[]
    if (isAttending) {
      newAttendees = event.attendees.filter((id) => id !== currentUserId)
    } else {
      if (isFull) return // Full
      newAttendees = [...event.attendees, currentUserId!]
    }
    onUpdateEvent({ ...event, attendees: newAttendees })
  }, [currentUserId, enabled, event, isAttending, isFull, isGuest, isHost, isToggling, onJoin, onLeave, onRequireAuth, onUpdateEvent])

  return { isToggling, isJoinDisabled, onJoinLeave }
}


