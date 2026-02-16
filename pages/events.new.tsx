import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { useAuth } from '../domains/auth/AuthProvider'
import { EventEditor } from '../domains/events/components/detail/EventEditor'
import { parseEventsView } from '../domains/events/hooks/useEventNavigation'

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
            search: { view: undefined, tab: undefined },
            replace: true,
            state: { fromEventsView: view },
          })
        }
      />
    )
  },
})

