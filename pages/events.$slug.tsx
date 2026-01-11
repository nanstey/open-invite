import React from 'react'
import { createFileRoute, redirect, useNavigate, useRouterState } from '@tanstack/react-router'

import type { SocialEvent } from '../lib/types'
import { useAuth } from '../components/AuthProvider'
import { EventDetail } from '../components/EventDetail'
import { fetchEventById, fetchEventBySlug, updateEvent } from '../services/eventService'
import { realtimeService } from '../services/realtimeService'

type EventsView = 'list' | 'map' | 'calendar'

function parseEventsView(value: unknown): EventsView {
  const view = typeof value === 'string' ? value.toLowerCase() : 'list'
  if (view === 'map' || view === 'calendar' || view === 'list') return view
  return 'list'
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export const Route = createFileRoute('/events/$slug')({
  beforeLoad: ({ context, params }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({
        to: '/e/$slug',
        params: { slug: params.slug },
      })
    }
  },
  component: function EventDetailRouteComponent() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const { slug } = Route.useParams()
    const { fromEventsView } = useRouterState({
      select: (s) => ({
        fromEventsView: s.location.state.fromEventsView,
      }),
    })
    const view = parseEventsView(fromEventsView)

    const [event, setEvent] = React.useState<SocialEvent | null>(null)

    React.useEffect(() => {
      let cancelled = false

      ;(async () => {
        const fetched = isUuid(slug) ? await fetchEventById(slug) : await fetchEventBySlug(slug)
        if (cancelled) return
        setEvent(fetched)
      })()

      return () => {
        cancelled = true
      }
    }, [slug])

    // Canonicalize UUID URLs -> slug URLs
    React.useEffect(() => {
      if (!event) return
      if (!isUuid(slug)) return

      navigate({
        to: '/events/$slug',
        params: { slug: event.slug },
        search: { view: undefined },
        replace: true,
        state: { fromEventsView: view },
      })
    }, [event?.slug, navigate, slug, view])

    React.useEffect(() => {
      if (!event) return

      const unsubscribe = realtimeService.subscribeToEvent(event.id, {
        onUpdate: (updatedEvent) => setEvent(updatedEvent),
        onDelete: () => navigate({ to: '/events', search: { view } }),
      })
      return () => unsubscribe()
    }, [event?.id, navigate, view])

    if (!user) return null
    if (!event) return null

    const onClose = () => navigate({ to: '/events', search: { view } })

    const onUpdateEvent = async (updated: SocialEvent) => {
      const result = await updateEvent(updated.id, updated)
      if (result) setEvent(result)
    }

    return <EventDetail event={event} currentUser={user} onClose={onClose} onUpdateEvent={onUpdateEvent} />
  },
})

