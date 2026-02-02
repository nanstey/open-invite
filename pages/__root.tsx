import React from 'react'
import {
  Outlet,
  createRootRouteWithContext,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import type { RouterContext } from '../routerContext'
import { useAuth } from '../domains/auth/AuthProvider'
import { ComingSoonPopover, useComingSoonPopover } from '../lib/ui/components/ComingSoonPopover'
import { TabGroup } from '../lib/ui/components/TabGroup'
import { getActiveSection, getPageTitle } from '../domains/app/routing'
import { DesktopSidebar } from '../domains/app/components/DesktopSidebar'
import { MobileTopHeader } from '../domains/app/components/MobileTopHeader'
import { MobileBottomNav } from '../domains/app/components/MobileBottomNav'
import { HeaderTabsProvider, useHeaderTabs } from '../domains/app/HeaderTabsContext'
import { coerceEventsView, type EventsView } from '../domains/events/hooks/useEventNavigation'

function AppShellLayout() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const comingSoon = useComingSoonPopover()
  const headerTabs = useHeaderTabs()
  const { pathname, search } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, search: s.location.search }),
  })

  const activeSection = getActiveSection(pathname)
  const pageTitle = getPageTitle(pathname)
  const isEventsIndex = pathname === '/events'
  const isEventsChildRoute = pathname.startsWith('/events/') && !isEventsIndex
  const hideShellHeaderForRoute =
    (activeSection === 'EVENTS' && isEventsChildRoute) ||
    activeSection === 'PROFILE' ||
    activeSection === 'FRIENDS'
  const hideMobileBottomNavForRoute = activeSection === 'EVENTS' && isEventsChildRoute

  const eventsView = React.useMemo<EventsView>(() => coerceEventsView((search as any)?.view), [search])

  React.useEffect(() => {
    if (!loading && !user && activeSection !== 'PUBLIC') {
      if (pathname.startsWith('/events/') && pathname !== '/events/new') {
        const eventId = pathname.slice('/events/'.length).split('/')[0]
        if (eventId) {
          navigate({ to: '/e/$slug', params: { slug: eventId }, search: { tab: undefined }, replace: true })
          return
        }
      }

      navigate({ to: '/', replace: true })
    }
  }, [loading, user, activeSection, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const handleComingSoon = (e: React.MouseEvent) => comingSoon.show(e, 'Coming Soon!')

  return (
    <div className="min-h-screen min-h-0 w-full flex flex-col md:flex-row overflow-hidden h-screen text-slate-100 bg-background">
      <DesktopSidebar
        user={user}
        activeSection={activeSection}
        eventsView={eventsView}
        onComingSoon={handleComingSoon}
      />

      {!hideShellHeaderForRoute && <MobileTopHeader pageTitle={pageTitle} />}

      {/* Main Content Area */}
      <main
        className={`flex-1 min-h-0 relative flex flex-col bg-background overflow-hidden ${
          hideShellHeaderForRoute ? 'pt-0' : 'pt-14'
        } ${hideMobileBottomNavForRoute ? 'pb-0' : 'pb-16'} md:pt-0 md:pb-0 h-screen md:h-auto`}
      >
        {/* Desktop Header */}
        {!hideShellHeaderForRoute && (
          <header className="hidden md:flex flex-col gap-4 p-4 md:p-6 pb-2 shrink-0 border-b border-transparent z-10">
            <div className="flex items-center justify-between w-full">
              <h1 className="text-2xl font-bold text-white whitespace-nowrap">{pageTitle}</h1>
              <div className="block">
                {headerTabs && (
                  <TabGroup
                    tabs={headerTabs.tabs}
                    activeTab={headerTabs.activeTab}
                    onChange={headerTabs.onChange}
                  />
                )}
              </div>
            </div>
          </header>
        )}

        {/* Page Content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          <Outlet />
        </div>
      </main>

      {!hideMobileBottomNavForRoute && (
        <MobileBottomNav
          user={user}
          activeSection={activeSection}
          eventsView={eventsView}
          onComingSoon={handleComingSoon}
        />
      )}

      <ComingSoonPopover state={comingSoon.state} />
    </div>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: function RootComponent() {
    const { pathname } = useRouterState({ select: (s) => ({ pathname: s.location.pathname }) })

    const activeSection = getActiveSection(pathname)

    return (
      <>
        {activeSection === 'PUBLIC' ? <Outlet /> : (
          <HeaderTabsProvider>
            <AppShellLayout />
          </HeaderTabsProvider>
        )}
        {import.meta.env.VITE_SHOW_DEVTOOLS === 'true' || (import.meta.env.VITE_SHOW_DEVTOOLS === undefined && import.meta.env.DEV) ? <TanStackRouterDevtools position="bottom-right" /> : null}
      </>
    )
  },
})
