import React, { useMemo } from 'react'
import { Outlet, createFileRoute, redirect, useRouterState } from '@tanstack/react-router'

import { useAuth } from '../domains/auth/AuthProvider'
import { MapView } from '../domains/events/components/list/EventsMapView'
import { CalendarView } from '../domains/events/components/list/CalendarView'
import { EventsCardView } from '../domains/events/components/list/EventsCardView'
import { FilterBar } from '../domains/events/components/list/EventsFilterBar'
import { EventsEmptyState } from '../domains/events/components/list/EventsEmptyState'
import { EventsLoadingScreen } from '../domains/events/components/list/EventsLoadingScreen'
import { useEventFilters } from '../domains/events/hooks/useEventFilters'
import { useEventNavigation, type EventsView } from '../domains/events/hooks/useEventNavigation'
import { useEventsFeed } from '../domains/events/hooks/useEventsFeed'
import { useFilterBarVisibility } from '../domains/events/hooks/useFilterBarVisibility'

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
  const { user: currentUser, loading: authLoading } = useAuth()
  const view = Route.useSearch().view ?? 'list'

  const { events, loading: eventsLoading, join, leave } = useEventsFeed({
    currentUserId: currentUser?.id ?? null,
    enabled: !authLoading,
  })

  const goToEvent = useEventNavigation(view)

  const {
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
    filteredEvents,
    groupedEvents,
    dismiss,
    restore,
    clearFilters,
  } = useEventFilters(events, currentUser?.id ?? '')

  const { isVisible: isFilterBarVisible, onScroll: handleScroll, scrollRef: scrollContainerRef } =
    useFilterBarVisibility({ enabled: view === 'list', resetKey: view })

  const contentClass = useMemo(() => {
    if (view === 'calendar' || view === 'map') {
      return 'flex-1 flex flex-col overflow-hidden p-0 md:p-4 md:pt-2'
    }
    return 'flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-2'
  }, [view])

  if (authLoading || eventsLoading) return <EventsLoadingScreen />

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
              <EventsEmptyState onClearFilters={clearFilters} />
            ) : (
              <EventsCardView
                groupedEvents={groupedEvents}
                currentUser={currentUser}
                statusFilter={statusFilter}
                onEventClick={goToEvent}
                onJoin={join}
                onLeave={leave}
                onDismiss={dismiss}
                onRestore={restore}
              />
            )}
          </>
        ) : view === 'map' ? (
          <MapView
            events={filteredEvents}
            onEventClick={goToEvent}
            currentUser={currentUser}
          />
        ) : (
          <CalendarView
            events={filteredEvents}
            onEventClick={goToEvent}
            currentUser={currentUser}
          />
        )}
      </div>
    </>
  )
}

