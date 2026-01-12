import React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { EventDetail } from '../components/EventDetail'
import { LoginModal } from '../components/LoginModal'
import { useAuth } from '../components/AuthProvider'
import type { SocialEvent } from '../lib/types'
import { fetchEventById, fetchEventBySlug } from '../services/eventService'
import { realtimeService } from '../services/realtimeService'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export const Route = createFileRoute('/e/$slug')({
  component: function PublicEventDetailRouteComponent() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const { slug } = Route.useParams()

    const [event, setEvent] = React.useState<SocialEvent | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [showLoginModal, setShowLoginModal] = React.useState(false)

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
        to: '/e/$slug',
        params: { slug: event.slug },
        replace: true,
      })
    }, [event?.slug, navigate, slug])

    React.useEffect(() => {
      if (!event) return

      const unsubscribe = realtimeService.subscribeToEvent(event.id, {
        onUpdate: (updatedEvent) => setEvent(updatedEvent),
        onDelete: () => setEvent(null),
      })
      return () => unsubscribe()
    }, [event?.id])

    React.useEffect(() => {
      if (!user) return
      setShowLoginModal(false)
      navigate({
        to: '/events/$slug',
        params: { slug },
        search: { view: undefined },
        replace: true,
        state: { fromEventsView: 'list' },
      })
    }, [user, navigate, slug])

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
        <div className="min-h-screen w-full flex items-center justify-center bg-background text-slate-100 p-6">
          <div className="text-center">
            <div className="text-xl font-bold text-white">Event not found</div>
            <div className="text-slate-400 mt-2">This invite may have been removed or is unavailable.</div>
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="mt-6 px-5 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
            >
              Sign in
            </button>
          </div>
          {showLoginModal ? <LoginModal onClose={() => setShowLoginModal(false)} /> : null}
        </div>
      )
    }

    return (
      <div className="min-h-screen w-full flex flex-col bg-background text-slate-100">
        <EventDetail
          event={event}
          currentUser={null}
          onClose={undefined}
          onUpdateEvent={() => {}}
          showBackButton={false}
          layout="public"
          onRequireAuth={() => setShowLoginModal(true)}
        />
        {showLoginModal ? <LoginModal onClose={() => setShowLoginModal(false)} /> : null}
      </div>
    )
  },
})

