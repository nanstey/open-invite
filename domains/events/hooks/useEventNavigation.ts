import { useNavigate } from '@tanstack/react-router'

import type { SocialEvent } from '../types'

export type EventsView = 'list' | 'map' | 'calendar'

export function parseEventsView(value: unknown): EventsView {
  const view = typeof value === 'string' ? value.toLowerCase() : 'list'
  if (view === 'map' || view === 'calendar' || view === 'list') return view
  return 'list'
}

export function parseEventsViewOptional(value: unknown): EventsView | undefined {
  if (typeof value !== 'string') return undefined
  const view = value.toLowerCase()
  if (view === 'map' || view === 'calendar' || view === 'list') return view
  return undefined
}

export function coerceEventsView(value: unknown): EventsView {
  const v = typeof value === 'string' ? value.toLowerCase() : 'list'
  return v === 'map' || v === 'calendar' || v === 'list' ? v : 'list'
}

export function useEventNavigation(view: EventsView) {
  const navigate = useNavigate()

  return (event: SocialEvent) =>
    navigate({
      to: '/events/$slug',
      params: { slug: event.slug },
      search: { view: undefined, tab: undefined },
      state: { fromEventsView: view },
    })
}


