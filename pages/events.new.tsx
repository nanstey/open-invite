import React from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import type { SocialEvent } from '../lib/types'
import { CreateEventModal } from '../components/CreateEventModal'
import { createEvent } from '../services/eventService'

type EventsView = 'list' | 'map' | 'calendar'

function parseEventsView(value: unknown): EventsView {
  const view = typeof value === 'string' ? value.toLowerCase() : 'list'
  if (view === 'map' || view === 'calendar' || view === 'list') return view
  return 'list'
}

export const Route = createFileRoute('/events/new')({
  validateSearch: (search: Record<string, unknown>) => ({
    view: parseEventsView(search.view),
  }),
  beforeLoad: ({ context }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({ to: '/' })
    }
  },
  component: function EventsNewRouteComponent() {
    const navigate = useNavigate()
    const { view } = Route.useSearch()

    const onClose = () => navigate({ to: '/events', search: { view } })

    const onCreate = async (
      newEventData: Omit<SocialEvent, 'id' | 'hostId' | 'attendees' | 'comments' | 'reactions'>,
    ) => {
      try {
        await createEvent(newEventData)
      } finally {
        onClose()
      }
    }

    return <CreateEventModal onClose={onClose} onCreate={onCreate} />
  },
})

