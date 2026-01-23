import * as React from 'react'

import type { SocialEvent } from '../types'
import { isUuid } from '../components/detail/route/routing'
import { fetchEventById, fetchEventBySlug } from '../../../services/eventService'
import { realtimeService } from '../../../services/realtimeService'

export function useEventRouteData(args: {
  slugOrId: string
  pauseRealtime?: boolean
  onCanonicalSlug?: (canonicalSlug: string) => void
  onDelete?: () => void
}) {
  const { slugOrId, pauseRealtime, onCanonicalSlug, onDelete } = args

  const [event, setEvent] = React.useState<SocialEvent | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false

    ;(async () => {
      const slugIsUuid = isUuid(slugOrId)
      const matchesCurrentEvent =
        !!event && ((slugIsUuid && event.id === slugOrId) || (!slugIsUuid && event.slug === slugOrId))
      if (matchesCurrentEvent) return

      setEvent(null)
      setIsLoading(true)

      try {
        const fetched = slugIsUuid ? await fetchEventById(slugOrId) : await fetchEventBySlug(slugOrId)
        if (cancelled) return
        setEvent(fetched)
      } finally {
        if (cancelled) return
        setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [event?.id, event?.slug, slugOrId])

  React.useEffect(() => {
    if (!event) return
    if (!isUuid(slugOrId)) return
    onCanonicalSlug?.(event.slug)
  }, [event?.slug, slugOrId, onCanonicalSlug])

  React.useEffect(() => {
    if (!event) return
    if (pauseRealtime) return

    const unsubscribe = realtimeService.subscribeToEvent(event.id, {
      onUpdate: (updatedEvent) => setEvent(updatedEvent),
      onDelete: () => {
        setEvent(null)
        onDelete?.()
      },
    })
    return () => unsubscribe()
  }, [event?.id, pauseRealtime, onDelete])

  return { event, setEvent, isLoading }
}


