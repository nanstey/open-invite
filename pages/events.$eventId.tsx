import React from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import type { SocialEvent } from '../lib/types'
import { useAuth } from '../components/AuthProvider'
import { EventDetail } from '../components/EventDetail'
import { fetchEventById, updateEvent } from '../services/eventService'
import { realtimeService } from '../services/realtimeService'

type EventsView = 'list' | 'map' | 'calendar'

function parseEventsView(value: unknown): EventsView {
  const view = typeof value === 'string' ? value.toLowerCase() : 'list'
  if (view === 'map' || view === 'calendar' || view === 'list') return view
  return 'list'
}

export const Route = createFileRoute('/events/$eventId')({
  validateSearch: (search: Record<string, unknown>) => ({
    view: parseEventsView(search.view),
  }),
  beforeLoad: ({ context }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({ to: '/' })
    }
  },
  component: function EventDetailRouteComponent() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const { eventId } = Route.useParams()
    const { view } = Route.useSearch()

    const [event, setEvent] = React.useState<SocialEvent | null>(null)

    React.useEffect(() => {
      let cancelled = false

      ;(async () => {
        const fetched = await fetchEventById(eventId)
        if (cancelled) return
        setEvent(fetched)
      })()

      return () => {
        cancelled = true
      }
    }, [eventId])

    React.useEffect(() => {
      const unsubscribe = realtimeService.subscribeToEvent(eventId, {
        onUpdate: (updatedEvent) => setEvent(updatedEvent),
        onDelete: () => navigate({ to: '/events', search: { view } }),
      })
      return () => unsubscribe()
    }, [eventId, navigate, view])

    if (!user) return null
    if (!event) return null

    const onClose = () => navigate({ to: '/events', search: { view } })

    const onUpdateEvent = async (updated: SocialEvent) => {
      const result = await updateEvent(updated.id, updated)
      if (result) setEvent(result)
    }

    return (
      <EventDetail event={event} currentUser={user} onClose={onClose} onUpdateEvent={onUpdateEvent} />
    )
  },
})

