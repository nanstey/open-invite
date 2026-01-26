import * as React from 'react'

import type { SocialEvent } from '../types'
import type { StatusFilter, TimeFilter } from '../components/list/EventsFilterBar'

type EventsGroup = { title: string; events: SocialEvent[] }

type EventFilterParams = {
  currentUserId: string
  dismissedEventIds: Set<string>
  searchTerm: string
  filterCategory: string
  timeFilter: TimeFilter
  statusFilter: StatusFilter
  showOpenOnly: boolean
  now: Date
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function isPastEvent(event: SocialEvent, now: Date) {
  return new Date(event.startTime) < now
}

function isDismissedAllowed(eventId: string, dismissedEventIds: Set<string>, statusFilter: StatusFilter) {
  const isDismissed = dismissedEventIds.has(eventId)
  if (statusFilter === 'DISMISSED') return isDismissed
  return !isDismissed
}

function isUserHostOrAttending(event: SocialEvent, currentUserId: string) {
  const isHost = event.hostId === currentUserId
  const isAttending = event.attendees.includes(currentUserId)
  return { isHost, isAttending }
}

function matchesStatusFilter(event: SocialEvent, params: Pick<EventFilterParams, 'currentUserId' | 'statusFilter' | 'now'>) {
  const { isHost, isAttending } = isUserHostOrAttending(event, params.currentUserId)
  const isPast = isPastEvent(event, params.now)

  if (params.statusFilter !== 'PAST' && params.statusFilter !== 'DISMISSED') {
    if (isPast) return false
  }
  if (params.statusFilter === 'PAST') {
    if (!isPast) return false
    if (!isHost && !isAttending) return false
  }

  if (params.statusFilter === 'HOSTING' && !isHost) return false
  if (params.statusFilter === 'ATTENDING' && (!isAttending || isHost)) return false
  if (params.statusFilter === 'PENDING') {
    if (isHost || isAttending) return false
  }

  return true
}

function matchesSearch(event: SocialEvent, searchTerm: string) {
  const term = searchTerm.toLowerCase()
  return (
    event.title.toLowerCase().includes(term) ||
    event.description.toLowerCase().includes(term) ||
    event.location.toLowerCase().includes(term)
  )
}

function matchesCategory(event: SocialEvent, filterCategory: string) {
  if (filterCategory === 'ALL') return true
  return event.activityType === filterCategory
}

function hasOpenSeats(event: SocialEvent) {
  const taken = event.attendees.length
  const max = event.maxSeats
  return max === undefined || taken < max
}

function matchesOpenOnly(event: SocialEvent, statusFilter: StatusFilter, showOpenOnly: boolean) {
  if (!(statusFilter === 'ALL' || statusFilter === 'PENDING')) return true
  if (!showOpenOnly) return true
  return hasOpenSeats(event)
}

function matchesTimeFilter(event: SocialEvent, params: Pick<EventFilterParams, 'timeFilter' | 'statusFilter' | 'now'>) {
  if (params.statusFilter === 'PAST') return true
  if (params.timeFilter === 'ALL') return true

  const nowZero = startOfDay(params.now)
  const eventZero = startOfDay(new Date(event.startTime))

  if (params.timeFilter === 'TODAY') return eventZero.getTime() === nowZero.getTime()
  if (params.timeFilter === 'TOMORROW') {
    const tomorrow = new Date(nowZero)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return eventZero.getTime() === tomorrow.getTime()
  }
  if (params.timeFilter === 'WEEK') {
    const nextWeek = new Date(nowZero)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return eventZero >= nowZero && eventZero <= nextWeek
  }

  return true
}

function compareByStartTime(statusFilter: StatusFilter) {
  return (a: SocialEvent, b: SocialEvent) => {
    const timeA = new Date(a.startTime).getTime()
    const timeB = new Date(b.startTime).getTime()
    return statusFilter === 'PAST' ? timeB - timeA : timeA - timeB
  }
}

function getGroupTitle(eventStartTime: string, now: Date, statusFilter: StatusFilter) {
  const eDate = new Date(eventStartTime)
  const today = startOfDay(now)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  const eDateOnly = startOfDay(eDate)

  if (statusFilter === 'PAST' || (eDate < now && statusFilter === 'DISMISSED')) return 'Past'
  if (eDateOnly.getTime() === today.getTime()) return 'Today'
  if (eDateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow'
  if (eDate < nextWeek) return 'This Week'
  if (eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear()) return 'This Month'

  return eDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function useEventFilters(events: SocialEvent[], currentUserId: string) {
  const [dismissedEventIds, setDismissedEventIds] = React.useState<Set<string>>(new Set())

  // --- Filtering State ---
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filterCategory, setFilterCategory] = React.useState('ALL')
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>('ALL')
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('ALL')
  const [showOpenOnly, setShowOpenOnly] = React.useState(false)

  const dismiss = React.useCallback((eventId: string) => {
    setDismissedEventIds((prev) => {
      const next = new Set(prev)
      next.add(eventId)
      return next
    })
  }, [])

  const restore = React.useCallback((eventId: string) => {
    setDismissedEventIds((prev) => {
      const next = new Set(prev)
      next.delete(eventId)
      return next
    })
  }, [])

  const clearFilters = React.useCallback(() => {
    setFilterCategory('ALL')
    setSearchTerm('')
    setTimeFilter('ALL')
    setShowOpenOnly(false)
    setStatusFilter('ALL')
  }, [])

  const filteredEvents = React.useMemo(() => {
    const now = new Date()

    return events
      .filter((event) => {
        const params: EventFilterParams = {
          currentUserId,
          dismissedEventIds,
          searchTerm,
          filterCategory,
          timeFilter,
          statusFilter,
          showOpenOnly,
          now,
        }

        if (!isDismissedAllowed(event.id, params.dismissedEventIds, params.statusFilter)) return false
        if (!matchesStatusFilter(event, params)) return false
        if (!matchesSearch(event, params.searchTerm)) return false
        if (!matchesCategory(event, params.filterCategory)) return false
        if (!matchesOpenOnly(event, params.statusFilter, params.showOpenOnly)) return false
        if (!matchesTimeFilter(event, params)) return false

        return true
      })
      .sort(compareByStartTime(statusFilter))
  }, [currentUserId, events, filterCategory, dismissedEventIds, searchTerm, showOpenOnly, statusFilter, timeFilter])

  const groupedEvents = React.useMemo<EventsGroup[]>(() => {
    if (filteredEvents.length === 0) return []

    const now = new Date()

    const groups: EventsGroup[] = []

    filteredEvents.forEach((event) => {
      const title = getGroupTitle(event.startTime, now, statusFilter)

      const lastGroup = groups[groups.length - 1]
      if (lastGroup && lastGroup.title === title) {
        lastGroup.events.push(event)
      } else {
        groups.push({ title, events: [event] })
      }
    })

    return groups
  }, [filteredEvents, statusFilter])

  return {
    // state
    searchTerm,
    setSearchTerm,
    filterCategory,
    setFilterCategory,
    timeFilter,
    setTimeFilter,
    statusFilter,
    setStatusFilter,
    showOpenOnly,
    setShowOpenOnly,

    // dismissed
    dismissedEventIds,
    dismiss,
    restore,

    // derived
    filteredEvents,
    groupedEvents,

    // helpers
    clearFilters,
  }
}


