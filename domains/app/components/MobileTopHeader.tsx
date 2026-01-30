import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Calendar as CalendarIcon,
  LayoutGrid,
  Map as MapIcon,
  UserCircle,
  Users as UsersIcon,
} from 'lucide-react'

import { TabGroup, type TabOption } from '../../../lib/ui/components/TabGroup'
import type { ActiveSection } from '../routing'
import { type EventsView, coerceEventsView } from '../../events/hooks/useEventNavigation'
import { type FriendsTab, coerceFriendsTab } from '../../friends/types'

interface MobileTopHeaderProps {
  pageTitle: string
  activeSection: ActiveSection
  eventsView: EventsView
  friendsTab: FriendsTab
  isEventsIndex: boolean
}

export function MobileTopHeader({
  pageTitle,
  activeSection,
  eventsView,
  friendsTab,
  isEventsIndex,
}: MobileTopHeaderProps) {
  const navigate = useNavigate()

  const inviteTabs: TabOption[] = [
    { id: 'list', label: 'Cards', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'map', label: 'Map', icon: <MapIcon className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="w-4 h-4" /> },
  ]

  const friendsTabs: TabOption[] = [
    { id: 'friends', label: 'Friends', icon: <UsersIcon className="w-4 h-4" /> },
    { id: 'groups', label: 'Groups', icon: <UserCircle className="w-4 h-4" /> },
  ]

  return (
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
  )
}

