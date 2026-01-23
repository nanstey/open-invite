import * as React from 'react'

import type { User } from '../../../../../lib/types'
import type { SocialEvent } from '../../../types'

export function useGuestsEditActions(input: {
  enabled: boolean
  event: SocialEvent
  attendeesList: User[]
  onChangeAttendees?: (nextAttendees: string[]) => void
}): { visibleAttendeesList: User[]; onRemoveAttendee: (attendeeId: string) => void } {
  const { enabled, event, attendeesList, onChangeAttendees } = input

  const [removedAttendeeIds, setRemovedAttendeeIds] = React.useState<Set<string>>(new Set())

  const visibleAttendeesList = React.useMemo(() => {
    if (!enabled) return attendeesList
    if (removedAttendeeIds.size === 0) return attendeesList
    return attendeesList.filter((u) => !removedAttendeeIds.has(u.id))
  }, [attendeesList, enabled, removedAttendeeIds])

  const onRemoveAttendee = React.useCallback(
    (attendeeId: string) => {
      if (!enabled) return
      if (!attendeeId) return
      if (attendeeId === event.hostId) return

      const nextAttendees = event.attendees.filter((id) => id !== attendeeId)
      onChangeAttendees?.(nextAttendees)
      setRemovedAttendeeIds((prev) => {
        const next = new Set(prev)
        next.add(attendeeId)
        return next
      })
    },
    [enabled, event.attendees, event.hostId, onChangeAttendees],
  )

  return { visibleAttendeesList, onRemoveAttendee }
}


