import { useNavigate } from '@tanstack/react-router'

import type { SocialEvent } from '../types'

export type EventsView = 'list' | 'map' | 'calendar'

export function useEventNavigation(view: EventsView) {
  const navigate = useNavigate()

  return (event: SocialEvent) =>
    navigate({
      to: '/events/$slug',
      params: { slug: event.slug },
      search: { view: undefined },
      state: { fromEventsView: view },
    })
}


