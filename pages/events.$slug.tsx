import React from 'react'
import { createFileRoute, redirect, useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import type { SocialEvent } from '../lib/types'
import { useAuth } from '../components/AuthProvider'
import { EventEditor } from '../components/EventEditor'
import { EventDetail } from '../components/EventDetail'
import { addComment, fetchEventById, fetchEventBySlug, joinEvent, leaveEvent, markEventViewedFromRouteParam } from '../services/eventService'
import { realtimeService } from '../services/realtimeService'

type EventsView = 'list' | 'map' | 'calendar'
type EventTab = 'details' | 'guests' | 'chat'

function parseEventsView(value: unknown): EventsView {
  const view = typeof value === 'string' ? value.toLowerCase() : 'list'
  if (view === 'map' || view === 'calendar' || view === 'list') return view
  return 'list'
}

function parseEventsViewSearch(value: unknown): EventsView | undefined {
  if (typeof value !== 'string') return undefined
  const view = value.toLowerCase()
  if (view === 'map' || view === 'calendar' || view === 'list') return view
  return undefined
}

function parseEventTabSearch(value: unknown): EventTab | undefined {
  if (typeof value !== 'string') return undefined
  const tab = value.toLowerCase()
  if (tab === 'details' || tab === 'guests' || tab === 'chat') return tab
  return undefined
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export const Route = createFileRoute('/events/$slug')({
  validateSearch: (search: Record<string, unknown>) => ({
    view: parseEventsViewSearch(search.view),
    tab: parseEventTabSearch(search.tab),
  }),
  beforeLoad: ({ context, params }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({
        to: '/e/$slug',
        params: { slug: params.slug },
        search: { tab: undefined },
      })
    }
  },
  component: function EventDetailRouteComponent() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const { slug } = Route.useParams()
    const search = Route.useSearch()
    const { tab } = search
    const activeTab = tab ?? 'details'
    const { fromEventsView } = useRouterState({
      select: (s) => ({
        fromEventsView: s.location.state.fromEventsView,
      }),
    })
    const view = parseEventsView(fromEventsView)
    const handleTabChange = (next: EventTab) =>
      navigate({
        to: '/events/$slug',
        params: { slug },
        search: { ...search, tab: next },
        replace: true,
        state: { fromEventsView },
      })

    const [event, setEvent] = React.useState<SocialEvent | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [isEditing, setIsEditing] = React.useState(false)

    // Treat opening an event while authenticated as "invited by link" so it shows up in Pending/Going.
    React.useEffect(() => {
      if (!user) return
      markEventViewedFromRouteParam(slug).catch((e) => console.warn('markEventViewedFromRouteParam failed:', e))
    }, [slug, user?.id])

    React.useEffect(() => {
      let cancelled = false

      ;(async () => {
        const slugIsUuid = isUuid(slug)
        const matchesCurrentEvent =
          !!event && ((slugIsUuid && event.id === slug) || (!slugIsUuid && event.slug === slug))
        if (matchesCurrentEvent) return

        // Avoid flashing stale event data when navigating between slugs.
        setEvent(null)
        setIsLoading(true)

        try {
          const fetched = slugIsUuid ? await fetchEventById(slug) : await fetchEventBySlug(slug)
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
    }, [event?.id, event?.slug, slug])

    // Canonicalize UUID URLs -> slug URLs
    React.useEffect(() => {
      if (!event) return
      if (!isUuid(slug)) return

      navigate({
        to: '/events/$slug',
        params: { slug: event.slug },
        search: { view: undefined, tab: activeTab },
        replace: true,
        state: { fromEventsView: view },
      })
    }, [event?.slug, navigate, slug, view, activeTab])

    React.useEffect(() => {
      if (!event) return

      if (isEditing) return
      const unsubscribe = realtimeService.subscribeToEvent(event.id, {
        onUpdate: (updatedEvent) => setEvent(updatedEvent),
        onDelete: () => navigate({ to: '/events', search: { view } }),
      })
      return () => unsubscribe()
    }, [event?.id, navigate, view, isEditing])

    if (!user) return null

    const onClose = () => navigate({ to: '/events', search: { view } })

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-slate-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-slate-400">Loading...</p>
          </div>
        </div>
      )
    }

    if (!event) {
      return (
        <div className="min-h-screen w-full flex flex-col bg-background text-slate-100 relative">
          <div className="absolute top-4 left-4">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="bg-black/40 hover:bg-black/60 p-2 rounded-full text-white backdrop-blur transition-all border border-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="text-xl font-bold text-white">Event not found</div>
              <div className="text-slate-400 mt-2">This event may have been removed or is unavailable.</div>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 px-5 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
              >
                Back to events
              </button>
            </div>
          </div>
        </div>
      )
    }

    const handleJoinEvent = async (eventId: string) => {
      // Optimistic UI: update immediately so the user sees the join.
      setEvent((prev) => {
        if (!prev) return prev
        if (prev.id !== eventId) return prev
        if (prev.attendees.includes(user.id)) return prev
        return { ...prev, attendees: [...prev.attendees, user.id] }
      })

      try {
        const success = await joinEvent(eventId)
        if (success) {
          const refreshed = await fetchEventById(eventId)
          if (refreshed) setEvent(refreshed)
        } else {
          // Roll back optimistic update on failure.
          setEvent((prev) => {
            if (!prev) return prev
            if (prev.id !== eventId) return prev
            return { ...prev, attendees: prev.attendees.filter((id) => id !== user.id) }
          })
        }
      } catch (error) {
        console.error('Error joining event:', error)
        // Roll back optimistic update on exception.
        setEvent((prev) => {
          if (!prev) return prev
          if (prev.id !== eventId) return prev
          return { ...prev, attendees: prev.attendees.filter((id) => id !== user.id) }
        })
      }
    }

    const handleLeaveEvent = async (eventId: string) => {
      // Optimistic UI.
      setEvent((prev) => {
        if (!prev) return prev
        if (prev.id !== eventId) return prev
        return { ...prev, attendees: prev.attendees.filter((id) => id !== user.id) }
      })

      try {
        const success = await leaveEvent(eventId)
        if (success) {
          const refreshed = await fetchEventById(eventId)
          if (refreshed) setEvent(refreshed)
        } else {
          // Roll back (re-add self) on failure.
          setEvent((prev) => {
            if (!prev) return prev
            if (prev.id !== eventId) return prev
            if (prev.attendees.includes(user.id)) return prev
            return { ...prev, attendees: [...prev.attendees, user.id] }
          })
        }
      } catch (error) {
        console.error('Error leaving event:', error)
        // Roll back (re-add self) on exception.
        setEvent((prev) => {
          if (!prev) return prev
          if (prev.id !== eventId) return prev
          if (prev.attendees.includes(user.id)) return prev
          return { ...prev, attendees: [...prev.attendees, user.id] }
        })
      }
    }

    // Local-only updates for the in-memory event object shown on this page.
    // (Persistence is handled by dedicated handlers like join/leave/postComment.)
    const onUpdateEvent = (updated: SocialEvent) => {
      setEvent(updated)
    }

    const handlePostComment = async (eventId: string, text: string) => {
      const optimisticId = `optimistic-${Date.now().toString()}`
      const optimistic = {
        id: optimisticId,
        userId: user.id,
        text,
        timestamp: new Date().toISOString(),
      }

      setEvent((prev) => {
        if (!prev) return prev
        if (prev.id !== eventId) return prev
        return { ...prev, comments: [...prev.comments, optimistic] }
      })

      const inserted = await addComment(eventId, text)
      if (!inserted) {
        // Roll back optimistic comment on failure.
        setEvent((prev) => {
          if (!prev) return prev
          if (prev.id !== eventId) return prev
          return { ...prev, comments: prev.comments.filter((c) => c.id !== optimisticId) }
        })
        return
      }

      // Replace optimistic comment with the real one (real id + server timestamp).
      setEvent((prev) => {
        if (!prev) return prev
        if (prev.id !== eventId) return prev
        const withoutOptimistic = prev.comments.filter((c) => c.id !== optimisticId)
        return { ...prev, comments: [...withoutOptimistic, inserted] }
      })
    }

    const isHost = event.hostId === user.id

    if (isEditing && isHost) {
      return (
        <EventEditor
          mode="update"
          currentUser={user}
          initialEvent={event}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onCancel={() => setIsEditing(false)}
          onSuccess={(updated) => {
            setEvent(updated)
            setIsEditing(false)
          }}
        />
      )
    }

    return (
      <EventDetail
        event={event}
        currentUser={user}
        onClose={onClose}
        onUpdateEvent={onUpdateEvent}
        onPostComment={handlePostComment}
        onJoin={handleJoinEvent}
        onLeave={handleLeaveEvent}
        onEditRequested={isHost ? () => setIsEditing(true) : undefined}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    )
  },
})

