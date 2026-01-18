import React from 'react'
import { createFileRoute, redirect, useNavigate, useRouterState } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import type { SocialEvent } from '../lib/types'
import { useAuth } from '../components/AuthProvider'
import { EventEditor } from '../components/EventEditor'
import { EventDetail } from '../components/EventDetail'
import { fetchEventById, fetchEventBySlug, markEventViewedFromRouteParam, updateEvent } from '../services/eventService'
import { realtimeService } from '../services/realtimeService'

type EventsView = 'list' | 'map' | 'calendar'

function parseEventsView(value: unknown): EventsView {
  const view = typeof value === 'string' ? value.toLowerCase() : 'list'
  if (view === 'map' || view === 'calendar' || view === 'list') return view
  return 'list'
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export const Route = createFileRoute('/events/$slug')({
  beforeLoad: ({ context, params }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({
        to: '/e/$slug',
        params: { slug: params.slug },
      })
    }
  },
  component: function EventDetailRouteComponent() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const { slug } = Route.useParams()
    const { fromEventsView } = useRouterState({
      select: (s) => ({
        fromEventsView: s.location.state.fromEventsView,
      }),
    })
    const view = parseEventsView(fromEventsView)

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
        search: { view: undefined },
        replace: true,
        state: { fromEventsView: view },
      })
    }, [event?.slug, navigate, slug, view])

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

    const onUpdateEvent = async (updated: SocialEvent) => {
      const result = await updateEvent(updated.id, updated)
      if (result) setEvent(result)
    }

    const isHost = event.hostId === user.id

    if (isEditing && isHost) {
      return (
        <EventEditor
          mode="update"
          currentUser={user}
          initialEvent={event}
          onCancel={() => setIsEditing(false)}
          onSuccess={(updated) => {
            setEvent(updated)
            setIsEditing(false)
          }}
        />
      )
    }

    return (
      <div className="relative w-full h-full">
        {isHost ? (
          <div className="fixed top-4 right-4 z-[1400]">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-xl bg-slate-900/80 backdrop-blur border border-slate-700 text-white font-bold hover:bg-slate-800 transition-colors"
            >
              Edit
            </button>
          </div>
        ) : null}
        <EventDetail event={event} currentUser={user} onClose={onClose} onUpdateEvent={onUpdateEvent} />
      </div>
    )
  },
})

