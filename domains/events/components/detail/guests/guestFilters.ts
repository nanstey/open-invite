import type { User } from '../../../../../lib/types'
import type { SocialEvent } from '../../../types'

export function getSelectedAttendeeIds(args: {
  event: SocialEvent
  activeFilterId: string
}): Set<string> {
  const { event, activeFilterId } = args
  if (!activeFilterId) return new Set<string>()

  const set = new Set<string>()
  for (const entry of event.itineraryAttendance ?? []) {
    if (entry.itineraryItemIds?.includes(activeFilterId)) {
      set.add(entry.userId)
    }
  }
  return set
}

export function orderAttendees(args: {
  attendees: User[]
  activeFilterId: string
  selectedAttendeeIds: Set<string>
}): User[] {
  const { attendees, activeFilterId, selectedAttendeeIds } = args
  if (!activeFilterId) return attendees

  const attending: User[] = []
  const others: User[] = []
  for (const attendee of attendees) {
    if (selectedAttendeeIds.has(attendee.id)) {
      attending.push(attendee)
    } else {
      others.push(attendee)
    }
  }
  return [...attending, ...others]
}

export function getGoingLabel(args: { attendeeCount: number; maxSeats?: number | null }): string {
  const { attendeeCount, maxSeats } = args
  return maxSeats ? `${attendeeCount}/${maxSeats}` : `${attendeeCount}`
}

export function getOpenSpots(args: { attendeeCount: number; maxSeats?: number | null }): number | null {
  const { attendeeCount, maxSeats } = args
  if (!maxSeats) return null
  return Math.max(maxSeats - attendeeCount, 0)
}
