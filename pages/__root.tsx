import React from 'react'
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import {
  Bell,
  Calendar as CalendarIcon,
  CalendarDays,
  LayoutGrid,
  Map as MapIcon,
  Plus,
  UserCircle,
  Users as UsersIcon,
} from 'lucide-react'

import type { RouterContext } from '../routerContext'
import { useAuth } from '../components/AuthProvider'
import { TabGroup, type TabOption } from '../components/TabGroup'

function getPageTitle(pathname: string) {
  if (pathname.startsWith('/friends')) return 'Friends'
  if (pathname.startsWith('/alerts')) return 'Alerts'
  if (pathname.startsWith('/profile')) return 'Profile'
  return 'Events'
}

function getActiveSection(pathname: string) {
  if (pathname.startsWith('/friends')) return 'FRIENDS'
  if (pathname.startsWith('/alerts')) return 'ALERTS'
  if (pathname.startsWith('/profile')) return 'PROFILE'
  if (pathname.startsWith('/events')) return 'EVENTS'
  return 'PUBLIC'
}

type EventsView = 'list' | 'map' | 'calendar'
type FriendsTab = 'friends' | 'groups'

function parseEventsView(searchStr: string): EventsView {
  const p = new URLSearchParams(searchStr)
  const view = (p.get('view') || 'list').toLowerCase()
  return view === 'map' || view === 'calendar' || view === 'list' ? view : 'list'
}

function parseFriendsTab(searchStr: string): FriendsTab {
  const p = new URLSearchParams(searchStr)
  const tab = (p.get('tab') || 'friends').toLowerCase()
  return tab === 'groups' ? 'groups' : 'friends'
}

function coerceEventsView(value: unknown): EventsView {
  const v = typeof value === 'string' ? value.toLowerCase() : 'list'
  return v === 'map' || v === 'calendar' || v === 'list' ? v : 'list'
}

function coerceFriendsTab(value: unknown): FriendsTab {
  const v = typeof value === 'string' ? value.toLowerCase() : 'friends'
  return v === 'groups' || v === 'friends' ? v : 'friends'
}

function AppShellLayout() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { pathname, search } = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, search: s.location.search }),
  })

  const activeSection = getActiveSection(pathname)
  const pageTitle = getPageTitle(pathname)
  const isEventsIndex = pathname === '/events'
  const isEventsChildRoute = pathname.startsWith('/events/') && !isEventsIndex
  const isEventDetailRoute = pathname.startsWith('/events/') && pathname !== '/events/new'
  const hideShellHeaderForRoute = activeSection === 'EVENTS' && isEventsChildRoute
  const hideMobileBottomNavForRoute = activeSection === 'EVENTS' && isEventDetailRoute

  const eventsView = React.useMemo<EventsView>(() => coerceEventsView((search as any)?.view), [search])
  const friendsTab = React.useMemo<FriendsTab>(() => coerceFriendsTab((search as any)?.tab), [search])

  React.useEffect(() => {
    if (!loading && !user && activeSection !== 'PUBLIC') {
      if (pathname.startsWith('/events/') && pathname !== '/events/new') {
        const eventId = pathname.slice('/events/'.length).split('/')[0]
        if (eventId) {
          navigate({ to: '/e/$slug', params: { slug: eventId }, replace: true })
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

  const inviteTabs: TabOption[] = [
    { id: 'list', label: 'Cards', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'map', label: 'Map', icon: <MapIcon className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="w-4 h-4" /> },
  ]

  const friendsTabs: TabOption[] = [
    { id: 'friends', label: 'Friends', icon: <UsersIcon className="w-4 h-4" /> },
    { id: 'groups', label: 'Groups', icon: <UserCircle className="w-4 h-4" /> },
  ]

  const headerTabs =
    activeSection === 'EVENTS' && isEventsIndex ? (
      <TabGroup
        tabs={inviteTabs}
        activeTab={eventsView}
        onChange={(id) => navigate({ to: '/events', search: { view: coerceEventsView(id) } })}
      />
    ) : activeSection === 'FRIENDS' ? (
      <TabGroup
        tabs={friendsTabs}
        activeTab={friendsTab}
        onChange={(id) => navigate({ to: '/friends', search: { tab: coerceFriendsTab(id) } })}
      />
    ) : null

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row overflow-hidden h-screen text-slate-100 bg-background">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-20 lg:w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between items-center p-4 z-20 shrink-0">
        <div className="flex flex-col items-center gap-8 w-full">
          <Link
            to="/events"
            search={{ view: 'list' }}
            className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary cursor-pointer select-none mb-4"
          >
            Open Invite
          </Link>

          <div className="flex flex-col gap-4 w-full">
            <Link
              to="/events"
              search={{ view: eventsView }}
              className={`p-3 rounded-xl transition-all flex items-center justify-start gap-3 w-full ${
                activeSection === 'EVENTS'
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <CalendarDays className="w-6 h-6" />
              <span className="hidden lg:block font-medium">Events</span>
            </Link>

            <Link
              to="/friends"
              search={{ tab: friendsTab }}
              className={`p-3 rounded-xl transition-all flex items-center justify-start gap-3 w-full ${
                activeSection === 'FRIENDS'
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UsersIcon className="w-6 h-6" />
              <span className="hidden lg:block font-medium">Friends</span>
            </Link>

            <button
              onClick={() => navigate({ to: '/events/new', search: { view: eventsView } })}
              className="p-3 rounded-xl transition-all flex items-center justify-start gap-3 w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 group"
              type="button"
            >
              <Plus className="w-6 h-6" />
              <span className="hidden lg:block font-bold">New Invite</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
          <Link
            to="/alerts"
            className={`p-3 rounded-xl transition-all flex items-center justify-start gap-3 w-full ${
              activeSection === 'ALERTS'
                ? 'bg-primary/10 text-primary'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
            </div>
            <span className="hidden lg:block font-medium">Notifications</span>
          </Link>

          <Link
            to="/profile"
            className={`p-3 rounded-xl transition-all flex items-center justify-start gap-3 w-full ${
              activeSection === 'PROFILE'
                ? 'bg-primary/10 text-primary'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary p-[1px] ${
                activeSection === 'PROFILE'
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-slate-900'
                  : ''
              }`}
            >
              <img
                src={user.avatar}
                alt="Me"
                className="rounded-full w-full h-full bg-slate-900 object-cover"
              />
            </div>
            <span className="hidden lg:block font-medium">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Mobile Top Header (Fixed) */}
      {!hideShellHeaderForRoute ? (
        <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-40 flex items-center justify-between px-4 shadow-lg">
          <h1 className="text-lg font-bold text-white tracking-wide">{pageTitle}</h1>
          <div>
            {activeSection === 'EVENTS' && isEventsIndex ? (
              <TabGroup
                tabs={inviteTabs}
                activeTab={eventsView}
                onChange={(id) => navigate({ to: '/events', search: { view: coerceEventsView(id) } })}
                hideLabel
              />
            ) : null}
            {activeSection === 'FRIENDS' ? (
              <TabGroup
                tabs={friendsTabs}
                activeTab={friendsTab}
                onChange={(id) => navigate({ to: '/friends', search: { tab: coerceFriendsTab(id) } })}
                hideLabel
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Main Content Area */}
      <main
        className={`flex-1 relative flex flex-col bg-background overflow-hidden ${
          hideShellHeaderForRoute ? 'pt-0' : 'pt-14'
        } ${hideMobileBottomNavForRoute ? 'pb-0' : 'pb-16'} md:pt-0 md:pb-0 h-screen md:h-auto`}
      >
        {/* Desktop Header */}
        {!hideShellHeaderForRoute ? (
          <header className="hidden md:flex flex-col gap-4 p-4 md:p-6 pb-2 shrink-0 border-b border-transparent z-10">
            <div className="flex items-center justify-between w-full">
              <h1 className="text-2xl font-bold text-white whitespace-nowrap">{pageTitle}</h1>
              <div className="block">{headerTabs}</div>
            </div>
          </header>
        ) : null}

        {/* Page Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Footer (Fixed) */}
      {!hideMobileBottomNavForRoute ? (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 z-50 flex justify-around items-center px-1 pb-safe-area shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
          <Link
            to="/events"
            search={{ view: eventsView }}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeSection === 'EVENTS' ? 'text-primary' : 'text-slate-400'
            }`}
          >
            <CalendarDays className="w-6 h-6" />
            <span className="text-[10px] font-medium">Events</span>
          </Link>

          <Link
            to="/friends"
            search={{ tab: friendsTab }}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeSection === 'FRIENDS' ? 'text-primary' : 'text-slate-400'
            }`}
          >
            <UsersIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">Friends</span>
          </Link>

          <button
            onClick={() => navigate({ to: '/events/new', search: { view: eventsView } })}
            className="-mt-8 bg-primary text-white p-3 rounded-full shadow-lg shadow-primary/30 border-4 border-slate-900 transform transition-transform hover:scale-105 active:scale-95"
            type="button"
          >
            <Plus className="w-7 h-7" />
          </button>

          <Link
            to="/alerts"
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeSection === 'ALERTS' ? 'text-primary' : 'text-slate-400'
            }`}
          >
            <div className="relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
            </div>
            <span className="text-[10px] font-medium">Alerts</span>
          </Link>

          <Link
            to="/profile"
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeSection === 'PROFILE' ? 'text-primary' : 'text-slate-400'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full overflow-hidden border ${
                activeSection === 'PROFILE' ? 'border-primary' : 'border-slate-500'
              }`}
            >
              <img src={user.avatar} alt="Me" className="w-full h-full object-cover" />
            </div>
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </nav>
      ) : null}
    </div>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: function RootComponent() {
    const { pathname } = useRouterState({ select: (s) => ({ pathname: s.location.pathname }) })

    const activeSection = getActiveSection(pathname)

    return (
      <>
        {activeSection === 'PUBLIC' ? <Outlet /> : <AppShellLayout />}
        {import.meta.env.DEV ? <TanStackRouterDevtools position="bottom-right" /> : null}
      </>
    )
  },
})
