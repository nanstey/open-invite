import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Route } from './events.$slug'

let mockSearch = { view: undefined, tab: undefined }
let mockParams = { slug: 'event-1' }
let mockFromEventsView: unknown = undefined
const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: any) => ({
    component: options.component,
    useSearch: () => mockSearch,
    useParams: () => mockParams,
  }),
  useNavigate: () => mockNavigate,
  useRouterState: ({ select }: { select: (state: any) => any }) =>
    select({ location: { state: { fromEventsView: mockFromEventsView } } }),
  redirect: (options: any) => options,
}))

vi.mock('../domains/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, loading: false }),
}))

let currentEvent = {
  id: 'event-1',
  slug: 'event-1',
  hostId: 'host-1',
  attendees: ['user-1'],
  comments: [{ id: 'comment-1', userId: 'user-2', text: 'hi', timestamp: '2025-01-01' }],
  reactions: { '🎉': { emoji: '🎉', count: 1, userReacted: false } },
}

const setEvent = vi.fn()

vi.mock('../domains/events/hooks/useEventRouteData', () => ({
  useEventRouteData: () => ({
    event: currentEvent,
    setEvent,
    isLoading: false,
  }),
}))

vi.mock('../domains/events/hooks/useEventDetailActions', () => ({
  useEventDetailActions: () => ({
    onUpdateEvent: vi.fn(),
    handleJoinEvent: vi.fn(),
    handleLeaveEvent: vi.fn(),
    handlePostComment: vi.fn(),
  }),
}))

vi.mock('../domains/events/components/detail/EventEditor', () => ({ EventEditor: () => null }))
vi.mock('../domains/events/components/detail/route/EventLoadingScreen', () => ({
  EventLoadingScreen: () => null,
}))
vi.mock('../domains/events/components/detail/route/EventNotFoundScreen', () => ({
  EventNotFoundScreen: () => null,
}))
vi.mock('../domains/events/components/detail/EventDetail', () => ({
  EventDetail: ({ event }: { event: typeof currentEvent }) => (
    <div data-testid="event-detail">
      {event.attendees.length}-{event.comments.length}-{Object.keys(event.reactions).length}
    </div>
  ),
}))

vi.mock('../services/eventService', () => ({
  markEventViewedFromRouteParam: vi.fn(async () => undefined),
}))

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

describe('Event detail page', () => {
  it('displays attendees, comments, and reactions and updates on change', async () => {
    const { container, root } = await renderRoute()

    const detail = container.querySelector('[data-testid=\"event-detail\"]')
    expect(detail?.textContent).toBe('1-1-1')

    currentEvent = {
      ...currentEvent,
      attendees: ['user-1', 'user-2'],
      comments: [...currentEvent.comments, { id: 'comment-2', userId: 'user-3', text: 'yo', timestamp: '2025-01-02' }],
      reactions: { ...currentEvent.reactions, '🔥': { emoji: '🔥', count: 2, userReacted: true } },
    }

    const Component = (Route as any).component
    await act(async () => {
      root.render(<Component />)
    })

    const updated = container.querySelector('[data-testid=\"event-detail\"]')
    expect(updated?.textContent).toBe('2-2-2')

    await act(async () => root.unmount())
  })
})
