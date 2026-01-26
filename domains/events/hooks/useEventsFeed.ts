import * as React from 'react'

import type { SocialEvent } from '../types'
import { fetchEvents, joinEvent, leaveEvent } from '../../../services/eventService'
import { realtimeService } from '../../../services/realtimeService'
import { fetchUsers } from '../../../services/userService'

type UseEventsFeedArgs = {
  currentUserId: string | null
  enabled: boolean
}

export function useEventsFeed({ currentUserId, enabled }: UseEventsFeedArgs) {
  const [events, setEvents] = React.useState<SocialEvent[]>([])
  const [loading, setLoading] = React.useState(true)

  const loadRef = React.useRef<{ userId: string | null; inFlight: Promise<void> | null }>({
    userId: null,
    inFlight: null,
  })

  const refresh = React.useCallback(async () => {
    if (!enabled || !currentUserId) return
    const fetched = await fetchEvents(currentUserId)
    const hostIds = [...new Set(fetched.map((e) => e.hostId))]
    await fetchUsers(hostIds, currentUserId)
    setEvents(fetched)
  }, [currentUserId, enabled])

  React.useEffect(() => {
    if (!enabled) return

    if (!currentUserId) {
      setEvents([])
      setLoading(false)
      loadRef.current.userId = null
      loadRef.current.inFlight = null
      return
    }

    // Deduplicate initial loads (React StrictMode + multiple auth events can trigger this twice)
    if (loadRef.current.userId === currentUserId && loadRef.current.inFlight) {
      return
    }

    loadRef.current.userId = currentUserId
    const loadPromise = (async () => {
      setLoading(true)
      try {
        await refresh()
      } catch (error) {
        console.error('Error loading events:', error)
        setEvents([])
      } finally {
        setLoading(false)
      }
    })()

    loadRef.current.inFlight = loadPromise.finally(() => {
      if (loadRef.current.inFlight === loadPromise) {
        loadRef.current.inFlight = null
      }
    })

    const unsubscribeNewEvents = realtimeService.subscribeToAllEvents((newEvent) => {
      // Warm user cache (best-effort)
      fetchUsers([newEvent.hostId], currentUserId).catch(() => {})

      setEvents((prev) => {
        if (prev.some((e) => e.id === newEvent.id)) {
          return prev.map((e) => (e.id === newEvent.id ? newEvent : e))
        }
        return [newEvent, ...prev]
      })
    })

    return () => {
      unsubscribeNewEvents()
    }
  }, [currentUserId, enabled, refresh])

  const join = React.useCallback(
    async (eventId: string) => {
      if (!enabled || !currentUserId) return
      try {
        const success = await joinEvent(eventId)
        if (success) {
          const updated = await fetchEvents(currentUserId)
          const event = updated.find((e) => e.id === eventId)
          if (event) {
            setEvents((prev) => prev.map((e) => (e.id === eventId ? event : e)))
          }
        }
      } catch (error) {
        console.error('Error joining event:', error)
      }
    },
    [currentUserId, enabled],
  )

  const leave = React.useCallback(
    async (eventId: string) => {
      if (!enabled || !currentUserId) return
      try {
        const success = await leaveEvent(eventId)
        if (success) {
          const updated = await fetchEvents(currentUserId)
          const event = updated.find((e) => e.id === eventId)
          if (event) {
            setEvents((prev) => prev.map((e) => (e.id === eventId ? event : e)))
          }
        }
      } catch (error) {
        console.error('Error leaving event:', error)
      }
    },
    [currentUserId, enabled],
  )

  return { events, loading, refresh, join, leave }
}


