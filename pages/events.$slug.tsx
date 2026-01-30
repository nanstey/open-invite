import React from 'react'
import { createFileRoute, redirect, useNavigate, useRouterState } from '@tanstack/react-router'

import type { SocialEvent } from '../domains/events/types'
import { useAuth } from '../domains/auth/AuthProvider'
import { EventEditor } from '../domains/events/components/detail/EventEditor'
import { EventDetail } from '../domains/events/components/detail/EventDetail'
import { EventLoadingScreen } from '../domains/events/components/detail/route/EventLoadingScreen'
import { EventNotFoundScreen } from '../domains/events/components/detail/route/EventNotFoundScreen'
import { coerceEventTab, parseEventTab, type EventTab } from '../domains/events/components/detail/route/routing'
import { useEventRouteData } from '../domains/events/hooks/useEventRouteData'
import { useEventDetailActions } from '../domains/events/hooks/useEventDetailActions'
import { markEventViewedFromRouteParam } from '../services/eventService'
import { parseEventsView, parseEventsViewOptional } from '../domains/events/hooks/useEventNavigation'

function parseEventTabSearch(value: unknown): EventTab | undefined {
  return parseEventTab(value)
}

export const Route = createFileRoute('/events/$slug')({
  validateSearch: (search: Record<string, unknown>) => ({
    view: parseEventsViewOptional(search.view),
    tab: parseEventTabSearch(search.tab),
  }),
  beforeLoad: ({ context, params }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({
        to: '/e/$slug',
        params: { slug: params.slug },
        search: { tab: undefined },
      })
    }
  },
  component: function EventDetailRouteComponent() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const { slug } = Route.useParams()
    const search = Route.useSearch()
    const activeTab = coerceEventTab(search.tab, 'details')
    const { fromEventsView } = useRouterState({
      select: (s) => ({
        fromEventsView: s.location.state.fromEventsView,
      }),
    })
    const view = parseEventsView(fromEventsView)
    const handleTabChange = (next: EventTab) =>
      navigate({
        to: '/events/$slug',
        params: { slug },
        search: { ...search, tab: next },
        replace: true,
        state: { fromEventsView },
      })

    const [isEditing, setIsEditing] = React.useState(false)

    // Treat opening an event while authenticated as "invited by link" so it shows up in Pending/Going.
    React.useEffect(() => {
      if (!user) return
      markEventViewedFromRouteParam(slug).catch((e) => console.warn('markEventViewedFromRouteParam failed:', e))
    }, [slug, user?.id])

    const { event, setEvent, isLoading } = useEventRouteData({
      slugOrId: slug,
      pauseRealtime: isEditing,
      onCanonicalSlug: (canonicalSlug) =>
        navigate({
          to: '/events/$slug',
          params: { slug: canonicalSlug },
          search: { view: undefined, tab: activeTab },
          replace: true,
          state: { fromEventsView: view },
        }),
      onDelete: () => navigate({ to: '/events', search: { view } }),
    })

    // IMPORTANT: Call hooks unconditionally to preserve hook ordering across renders.
    // `user` may be null briefly while auth is initializing, or `event` may be null while loading.
    const { onUpdateEvent, handleJoinEvent, handleLeaveEvent, handlePostComment } = useEventDetailActions({
      userId: user?.id ?? '',
      setEvent,
    })

    if (!user) return null

    const onClose = () => navigate({ to: '/events', search: { view } })

    if (isLoading) {
      return <EventLoadingScreen />
    }

    if (!event) {
      return (
        <EventNotFoundScreen
          message="This event may have been removed or is unavailable."
          primaryLabel="Back to events"
          onPrimary={onClose}
          onBack={onClose}
        />
      )
    }

    const isHost = event.hostId === user.id

    if (isEditing && isHost) {
      return (
        <EventEditor
          mode="update"
          currentUser={user}
          initialEvent={event}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onCancel={() => setIsEditing(false)}
          onSuccess={(updated) => {
            setEvent(updated)
            setIsEditing(false)
          }}
        />
      )
    }

    return (
      <EventDetail
        event={event}
        currentUser={user}
        onClose={onClose}
        onUpdateEvent={onUpdateEvent}
        onPostComment={handlePostComment}
        onJoin={handleJoinEvent}
        onLeave={handleLeaveEvent}
        onEditRequested={isHost ? () => setIsEditing(true) : undefined}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    )
  },
})

