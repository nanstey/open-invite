import React from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { useAuth } from '../components/AuthProvider'
import { EventEditor } from '../components/EventEditor'

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
    const { user } = useAuth()

    const onClose = () => navigate({ to: '/events', search: { view } })
    if (!user) return null

    return (
      <EventEditor
        mode="create"
        currentUser={user}
        onCancel={onClose}
        onSuccess={(created) =>
          navigate({
            to: '/events/$slug',
            params: { slug: created.slug },
            search: { view: undefined },
            replace: true,
            state: { fromEventsView: view },
          })
        }
      />
    )
  },
})

