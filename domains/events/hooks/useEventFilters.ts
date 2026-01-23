import * as React from 'react'

import type { SocialEvent } from '../types'
import type { StatusFilter, TimeFilter } from '../components/list/EventsFilterBar'

type EventsGroup = { title: string; events: SocialEvent[] }

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
        // 1. Dismissed Check (unless viewing Dismissed tab)
        const isDismissed = dismissedEventIds.has(event.id)
        if (statusFilter === 'DISMISSED') {
          if (!isDismissed) return false
        } else {
          if (isDismissed) return false
        }

        // 2. Status Filter Bucket Logic
        const isHost = event.hostId === currentUserId
        const isAttending = event.attendees.includes(currentUserId)
        const isPast = new Date(event.startTime) < now

        if (statusFilter !== 'PAST' && statusFilter !== 'DISMISSED') {
          if (isPast) return false
        }
        if (statusFilter === 'PAST') {
          if (!isPast) return false
          if (!isHost && !isAttending) return false
        }

        if (statusFilter === 'HOSTING' && !isHost) return false
        if (statusFilter === 'ATTENDING' && (!isAttending || isHost)) return false
        if (statusFilter === 'PENDING') {
          if (isHost || isAttending) return false
        }

        // 3. Search (Title, Description, Location)
        const term = searchTerm.toLowerCase()
        const matchesSearch =
          event.title.toLowerCase().includes(term) ||
          event.description.toLowerCase().includes(term) ||
          event.location.toLowerCase().includes(term)
        if (!matchesSearch) return false

        // 4. Category
        if (filterCategory !== 'ALL' && event.activityType !== filterCategory) return false

        // 5. Open Seats (Only for All/Pending)
        if ((statusFilter === 'ALL' || statusFilter === 'PENDING') && showOpenOnly) {
          const taken = event.attendees.length
          const max = event.maxSeats
          if (max !== undefined && taken >= max) return false
        }

        // 6. Time Filter (Skip if viewing Past)
        if (statusFilter !== 'PAST' && timeFilter !== 'ALL') {
          const eventDate = new Date(event.startTime)

          const checkDate = new Date(eventDate)
          checkDate.setHours(0, 0, 0, 0)
          const todayZero = new Date(now)
          todayZero.setHours(0, 0, 0, 0)

          if (timeFilter === 'TODAY') {
            if (checkDate.getTime() !== todayZero.getTime()) return false
          } else if (timeFilter === 'TOMORROW') {
            const tomorrow = new Date(todayZero)
            tomorrow.setDate(tomorrow.getDate() + 1)
            if (checkDate.getTime() !== tomorrow.getTime()) return false
          } else if (timeFilter === 'WEEK') {
            const nextWeek = new Date(todayZero)
            nextWeek.setDate(nextWeek.getDate() + 7)
            if (checkDate < todayZero || checkDate > nextWeek) return false
          }
        }

        return true
      })
      .sort((a, b) => {
        const timeA = new Date(a.startTime).getTime()
        const timeB = new Date(b.startTime).getTime()
        return statusFilter === 'PAST' ? timeB - timeA : timeA - timeB
      })
  }, [currentUserId, events, filterCategory, dismissedEventIds, searchTerm, showOpenOnly, statusFilter, timeFilter])

  const groupedEvents = React.useMemo<EventsGroup[]>(() => {
    if (filteredEvents.length === 0) return []

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)

    const groups: EventsGroup[] = []

    filteredEvents.forEach((event) => {
      const eDate = new Date(event.startTime)
      const eDateOnly = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate())

      let title = ''

      if (statusFilter === 'PAST' || (eDate < now && statusFilter === 'DISMISSED')) {
        title = 'Past'
      } else if (eDateOnly.getTime() === today.getTime()) {
        title = 'Today'
      } else if (eDateOnly.getTime() === tomorrow.getTime()) {
        title = 'Tomorrow'
      } else if (eDate < nextWeek) {
        title = 'This Week'
      } else if (eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear()) {
        title = 'This Month'
      } else {
        title = eDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }

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


