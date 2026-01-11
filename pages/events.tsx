import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, createFileRoute, redirect, useNavigate, useRouterState } from '@tanstack/react-router'

import type { SocialEvent } from '../lib/types'
import { useAuth } from '../components/AuthProvider'
import { EventCard } from '../components/EventCard'
import { MapView } from '../components/MapView'
import { CalendarView } from '../components/CalendarView'
import { FilterBar, type StatusFilter, type TimeFilter } from '../components/FilterBar'
import { fetchEvents, joinEvent, leaveEvent } from '../services/eventService'
import { realtimeService } from '../services/realtimeService'
import { fetchUsers } from '../services/userService'

type EventsView = 'list' | 'map' | 'calendar'

function parseEventsView(value: unknown): EventsView | undefined {
  if (typeof value !== 'string') return undefined
  const view = value.toLowerCase()
  if (view === 'map' || view === 'calendar' || view === 'list') return view
  return undefined
}

export const Route = createFileRoute('/events')({
  validateSearch: (search: Record<string, unknown>) => ({
    view: parseEventsView(search.view),
  }),
  beforeLoad: ({ context }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({ to: '/' })
    }
  },
  component: function EventsRouteComponent() {
    const { pathname } = useRouterState({
      select: (s) => ({ pathname: s.location.pathname }),
    })

    const isEventsIndex = pathname === '/events'
    return (
      <>
        {isEventsIndex ? <EventsPage /> : null}
        <Outlet />
      </>
    )
  },
})

const EventsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user: currentUser, loading: authLoading } = useAuth()
  const view = Route.useSearch().view ?? 'list'

  const [events, setEvents] = useState<SocialEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const eventsLoadRef = useRef<{ userId: string | null; inFlight: Promise<void> | null }>({
    userId: null,
    inFlight: null,
  })

  const [dismissedEventIds, setDismissedEventIds] = useState<Set<string>>(new Set())

  // --- Filtering State ---
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [showOpenOnly, setShowOpenOnly] = useState(false)

  // --- Scroll & Visibility State ---
  const [isFilterBarVisible, setIsFilterBarVisible] = useState(true)
  const lastScrollY = useRef(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Reset visibility when view changes
  useEffect(() => {
    setIsFilterBarVisible(true)
    lastScrollY.current = 0
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [view])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Only apply logic in List view where FilterBar is relevant
    if (view !== 'list') return

    const currentScrollY = e.currentTarget.scrollTop
    const diff = currentScrollY - lastScrollY.current

    // Threshold to prevent jitter
    if (Math.abs(diff) > 10) {
      if (diff > 0 && currentScrollY > 50) {
        setIsFilterBarVisible(false)
      } else if (diff < 0) {
        setIsFilterBarVisible(true)
      }
      lastScrollY.current = currentScrollY
    }
  }

  // Load events on mount and when user changes
  useEffect(() => {
    if (authLoading) return

    if (!currentUser) {
      setEvents([])
      setEventsLoading(false)
      eventsLoadRef.current.userId = null
      eventsLoadRef.current.inFlight = null
      return
    }

    // Deduplicate initial loads (React StrictMode + multiple auth events can trigger this twice)
    if (eventsLoadRef.current.userId === currentUser.id && eventsLoadRef.current.inFlight) {
      return
    }

    eventsLoadRef.current.userId = currentUser.id
    const loadPromise = (async () => {
      setEventsLoading(true)
      try {
        const fetchedEvents = await fetchEvents(currentUser.id)
        const hostIds = [...new Set(fetchedEvents.map((e) => e.hostId))]
        await fetchUsers(hostIds, currentUser.id)
        setEvents(fetchedEvents)
      } catch (error) {
        console.error('Error loading events:', error)
        setEvents([])
      } finally {
        setEventsLoading(false)
      }
    })()

    eventsLoadRef.current.inFlight = loadPromise.finally(() => {
      if (eventsLoadRef.current.inFlight === loadPromise) {
        eventsLoadRef.current.inFlight = null
      }
    })

    const unsubscribeNewEvents = realtimeService.subscribeToAllEvents((newEvent) => {
      setEvents((prev) => {
        if (prev.some((e) => e.id === newEvent.id)) {
          return prev.map((e) => (e.id === newEvent.id ? newEvent : e))
        }
        return [newEvent, ...prev]
      })
    })

    return () => {
      unsubscribeNewEvents()
    }
  }, [currentUser, authLoading])

  const handleJoinEvent = async (eventId: string) => {
    if (!currentUser) return

    try {
      const success = await joinEvent(eventId)
      if (success) {
        const updated = await fetchEvents(currentUser.id)
        const event = updated.find((e) => e.id === eventId)
        if (event) {
          setEvents((prev) => prev.map((e) => (e.id === eventId ? event : e)))
        }
      }
    } catch (error) {
      console.error('Error joining event:', error)
    }
  }

  const handleLeaveEvent = async (eventId: string) => {
    if (!currentUser) return

    try {
      const success = await leaveEvent(eventId)
      if (success) {
        const updated = await fetchEvents(currentUser.id)
        const event = updated.find((e) => e.id === eventId)
        if (event) {
          setEvents((prev) => prev.map((e) => (e.id === eventId ? event : e)))
        }
      }
    } catch (error) {
      console.error('Error leaving event:', error)
    }
  }

  const handleDismiss = (eventId: string) => {
    setDismissedEventIds((prev) => {
      const next = new Set(prev)
      next.add(eventId)
      return next
    })
  }

  const handleRestore = (eventId: string) => {
    setDismissedEventIds((prev) => {
      const next = new Set(prev)
      next.delete(eventId)
      return next
    })
  }

  const filteredEvents = useMemo(() => {
    if (!currentUser) return []

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
        const isHost = event.hostId === currentUser.id
        const isAttending = event.attendees.includes(currentUser.id)
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
  }, [currentUser, events, searchTerm, filterCategory, showOpenOnly, timeFilter, statusFilter, dismissedEventIds])

  const groupedEvents = useMemo(() => {
    if (view !== 'list' || filteredEvents.length === 0) return []

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)

    const groups: { title: string; events: SocialEvent[] }[] = []

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
  }, [filteredEvents, view, statusFilter])

  const contentClass = useMemo(() => {
    if (view === 'calendar' || view === 'map') {
      return 'flex-1 flex flex-col overflow-hidden p-0 md:p-4 md:pt-2'
    }
    return 'flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-2'
  }, [view])

  if (authLoading || eventsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) return null

  return (
    <>
      <FilterBar
        isVisible={isFilterBarVisible}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCategory={filterCategory}
        onCategoryChange={setFilterCategory}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        showOpenOnly={showOpenOnly}
        onShowOpenOnlyChange={setShowOpenOnly}
      />

      <div ref={scrollContainerRef} className={contentClass} onScroll={handleScroll}>
        {view === 'list' ? (
          <>
            {filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <div className="text-4xl mb-4">🌪️</div>
                <p>No events found matching your filters.</p>
                <button
                  onClick={() => {
                    setFilterCategory('ALL')
                    setSearchTerm('')
                    setTimeFilter('ALL')
                    setShowOpenOnly(false)
                    setStatusFilter('ALL')
                  }}
                  className="mt-2 text-primary hover:underline"
                  type="button"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="pb-20 space-y-8">
                {groupedEvents.map((group) => (
                  <div key={group.title}>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 mt-6 first:mt-0 py-1">
                      {group.title}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                      {group.events.map((event) => (
                        <div key={event.id} className="relative group">
                          <EventCard
                            event={event}
                            onClick={() =>
                              navigate({
                                to: '/events/$slug',
                                params: { slug: event.slug },
                                search: { view: undefined },
                                state: { fromEventsView: view },
                              })
                            }
                            currentUser={currentUser}
                            onJoin={handleJoinEvent}
                            onLeave={handleLeaveEvent}
                            onHide={handleDismiss}
                            filterContext={statusFilter}
                          />
                          {statusFilter === 'DISMISSED' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRestore(event.id)
                              }}
                              className="absolute top-2 right-2 bg-slate-800 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/50 hover:bg-green-500/20 z-10"
                              type="button"
                            >
                              Restore
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-3">
                  <div className="w-16 h-1 bg-slate-800 rounded-full"></div>
                  <span className="text-xs font-bold uppercase tracking-widest">No more events</span>
                </div>
              </div>
            )}
          </>
        ) : view === 'map' ? (
          <MapView
            events={filteredEvents}
            onEventClick={(e) =>
              navigate({
                to: '/events/$slug',
                params: { slug: e.slug },
                search: { view: undefined },
                state: { fromEventsView: view },
              })
            }
            currentUser={currentUser}
          />
        ) : (
          <CalendarView
            events={filteredEvents}
            onEventClick={(e) =>
              navigate({
                to: '/events/$slug',
                params: { slug: e.slug },
                search: { view: undefined },
                state: { fromEventsView: view },
              })
            }
            currentUser={currentUser}
          />
        )}
      </div>
    </>
  )
}

