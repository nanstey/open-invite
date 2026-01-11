import React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { EventDetail } from '../components/EventDetail'
import { LoginModal } from '../components/LoginModal'
import { useAuth } from '../components/AuthProvider'
import type { SocialEvent } from '../lib/types'
import { fetchEventById } from '../services/eventService'
import { realtimeService } from '../services/realtimeService'

export const Route = createFileRoute('/e/$eventId')({
  component: function PublicEventDetailRouteComponent() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const { eventId } = Route.useParams()

    const [event, setEvent] = React.useState<SocialEvent | null>(null)
    const [showLoginModal, setShowLoginModal] = React.useState(false)

    React.useEffect(() => {
      let cancelled = false

      ;(async () => {
        const fetched = await fetchEventById(eventId)
        if (cancelled) return
        setEvent(fetched)
      })()

      return () => {
        cancelled = true
      }
    }, [eventId])

    React.useEffect(() => {
      const unsubscribe = realtimeService.subscribeToEvent(eventId, {
        onUpdate: (updatedEvent) => setEvent(updatedEvent),
        onDelete: () => setEvent(null),
      })
      return () => unsubscribe()
    }, [eventId])

    React.useEffect(() => {
      if (!user) return
      setShowLoginModal(false)
      navigate({ to: '/events/$eventId', params: { eventId }, replace: true, search: { view: 'list' } })
    }, [user, navigate, eventId])

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

