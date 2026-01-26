import React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { EventDetail } from '../domains/events/components/detail/EventDetail'
import { LoginModal } from '../domains/auth/LoginModal'
import { useAuth } from '../domains/auth/AuthProvider'
import { coerceEventTab, parseEventTab, type EventTab } from '../domains/events/components/detail/route/routing'
import { useEventRouteData } from '../domains/events/hooks/useEventRouteData'
import { EventLoadingScreen } from '../domains/events/components/detail/route/EventLoadingScreen'
import { EventNotFoundScreen } from '../domains/events/components/detail/route/EventNotFoundScreen'

export const Route = createFileRoute('/e/$slug')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parseEventTab(search.tab),
  }),
  component: function PublicEventDetailRouteComponent() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const { slug } = Route.useParams()
    const search = Route.useSearch()
    const tab = coerceEventTab(search.tab, 'details')
    const handleTabChange = (next: EventTab) =>
      navigate({
        to: '/e/$slug',
        params: { slug },
        search: { ...search, tab: next },
        replace: true,
      })

    const [showLoginModal, setShowLoginModal] = React.useState(false)

    const { event, isLoading } = useEventRouteData({
      slugOrId: slug,
      onCanonicalSlug: (canonicalSlug) =>
        navigate({
          to: '/e/$slug',
          params: { slug: canonicalSlug },
          search: { tab },
          replace: true,
        }),
    })

    React.useEffect(() => {
      if (!user) return
      setShowLoginModal(false)
      navigate({
        to: '/events/$slug',
        params: { slug },
        search: { view: undefined, tab },
        replace: true,
        state: { fromEventsView: 'list' },
      })
    }, [user, navigate, slug, tab])

    if (isLoading) {
      return <EventLoadingScreen />
    }

    if (!event) {
      return (
        <>
          <EventNotFoundScreen
            message="This invite may have been removed or is unavailable."
            primaryLabel="Sign in"
            onPrimary={() => setShowLoginModal(true)}
            primaryClassName="mt-6 px-5 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 transition-colors"
          />
          {showLoginModal ? <LoginModal onClose={() => setShowLoginModal(false)} /> : null}
        </>
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
          activeTab={tab}
          onTabChange={handleTabChange}
        />
        {showLoginModal ? <LoginModal onClose={() => setShowLoginModal(false)} /> : null}
      </div>
    )
  },
})

