import * as React from 'react'

import { photonGeocodeOne } from '../../../lib/ui/utils/photon'

export function useItineraryGeocoding(args: {
  enabled: boolean
  uniqueLocations: string[]
  eventLocation?: string
  eventCoordinates?: { lat: number; lng: number }
}) {
  const { enabled, uniqueLocations, eventLocation, eventCoordinates } = args

  const [geoByLocation, setGeoByLocation] = React.useState<Record<string, { lat: number; lng: number }>>({})
  const [loading, setLoading] = React.useState(false)

  const hasCoordinates = typeof eventCoordinates?.lat === 'number' && typeof eventCoordinates?.lng === 'number'

  React.useEffect(() => {
    if (!enabled) {
      setGeoByLocation({})
      setLoading(false)
      return
    }

    const controller = new AbortController()
    let cancelled = false

    ;(async () => {
      try {
        setLoading(true)

        const next: Record<string, { lat: number; lng: number }> = {}

        // Prefer the event's stored coordinates when a location matches the event location.
        const eventLoc = String(eventLocation ?? '').trim()
        if (eventLoc && hasCoordinates && eventCoordinates) {
          next[eventLoc] = { lat: eventCoordinates.lat, lng: eventCoordinates.lng }
        }

        for (const q of uniqueLocations) {
          if (cancelled) return
          if (next[q]) continue

          try {
            const coords = await photonGeocodeOne(q, { signal: controller.signal })
            if (!coords) continue
            next[q] = coords
          } catch (e) {
            if ((e as any)?.name === 'AbortError') return
          }
        }

        if (cancelled) return
        setGeoByLocation(next)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [enabled, uniqueLocations, eventLocation, eventCoordinates?.lat, eventCoordinates?.lng, hasCoordinates])

  return { geoByLocation, loading }
}


