import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Route } from '../../pages/events'

let mockSearch = { view: 'list' as const }
let mockPathname = '/events'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: any) => ({
    component: options.component,
    useSearch: () => mockSearch,
  }),
  useRouterState: ({ select }: { select: (state: any) => any }) =>
    select({ location: { pathname: mockPathname, state: {} } }),
  Outlet: () => null,
  redirect: (options: any) => options,
}))

const mockEvents = [
  { id: 'event-1', title: 'Event One', startTime: '2025-01-01', hostId: 'host-1' },
]

vi.mock('../domains/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, loading: false }),
}))

vi.mock('../domains/events/hooks/useEventsFeed', () => ({
  useEventsFeed: () => ({
    events: mockEvents,
    loading: false,
    join: vi.fn(),
    leave: vi.fn(),
  }),
}))

vi.mock('../domains/events/hooks/useEventNavigation', () => ({
  useEventNavigation: () => vi.fn(),
}))

vi.mock('../domains/events/hooks/useEventFilters', () => ({
  useEventFilters: () => ({
    searchTerm: '',
    setSearchTerm: vi.fn(),
    filterCategory: null,
    setFilterCategory: vi.fn(),
    timeFilter: 'ALL',
    setTimeFilter: vi.fn(),
    statusFilter: 'UPCOMING',
    setStatusFilter: vi.fn(),
    showOpenOnly: false,
    setShowOpenOnly: vi.fn(),
    filteredEvents: mockEvents,
    groupedEvents: [{ title: 'Upcoming', events: mockEvents }],
    dismiss: vi.fn(),
    restore: vi.fn(),
    clearFilters: vi.fn(),
  }),
}))

vi.mock('../domains/events/hooks/useFilterBarVisibility', () => ({
  useFilterBarVisibility: () => ({
    isVisible: true,
    onScroll: vi.fn(),
    scrollRef: { current: null },
  }),
}))

vi.mock('../domains/events/components/list/EventsCardView', () => ({
  EventsCardView: ({ groupedEvents }: { groupedEvents: Array<{ events: Array<{ title: string }> }> }) => (
    <div data-testid="events-card-view">{groupedEvents[0]?.events[0]?.title}</div>
  ),
}))

vi.mock('../domains/events/components/list/EventsMapView', () => ({ MapView: () => null }))
vi.mock('../domains/events/components/list/CalendarView', () => ({ CalendarView: () => null }))
vi.mock('../domains/events/components/list/EventsFilterBar', () => ({ FilterBar: () => null }))
vi.mock('../domains/events/components/list/EventsEmptyState', () => ({ EventsEmptyState: () => null }))
vi.mock('../domains/events/components/list/EventsLoadingScreen', () => ({ EventsLoadingScreen: () => null }))

const renderRoute = async () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const Component = (Route as any).component
  await act(async () => {
    root.render(<Component />)
  })
  return { container, root }
}

describe('Events list page', () => {
  it('shows event cards for fetched events', async () => {
    const { container, root } = await renderRoute()

    const card = container.querySelector('[data-testid=\"events-card-view\"]')
    expect(card?.textContent).toBe('Event One')

    await act(async () => root.unmount())
  })
})
