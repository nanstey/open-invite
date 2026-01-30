import React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Bell, CalendarDays, Plus, Users as UsersIcon } from 'lucide-react'

import type { User } from '../../../lib/types'
import type { ActiveSection } from '../routing'
import type { EventsView } from '../../events/hooks/useEventNavigation'

interface MobileBottomNavProps {
  user: User
  activeSection: ActiveSection
  eventsView: EventsView
  onComingSoon: (e: React.MouseEvent) => void
}

export function MobileBottomNav({
  user,
  activeSection,
  eventsView,
  onComingSoon,
}: MobileBottomNavProps) {
  const navigate = useNavigate()

  return (
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

      <button
        type="button"
        aria-disabled="true"
        onClick={onComingSoon}
        className="flex flex-col items-center gap-1 p-2 rounded-lg text-slate-500 opacity-60 cursor-not-allowed"
        title="Coming Soon!"
      >
        <UsersIcon className="w-6 h-6" />
        <span className="text-[10px] font-medium">Friends</span>
      </button>

      <button
        onClick={() => navigate({ to: '/events/new', search: { view: eventsView } })}
        className="-mt-8 bg-primary text-white p-3 rounded-full shadow-lg shadow-primary/30 border-4 border-slate-900 transform transition-transform hover:scale-105 active:scale-95"
        type="button"
      >
        <Plus className="w-7 h-7" />
      </button>

      <button
        type="button"
        aria-disabled="true"
        onClick={onComingSoon}
        className="flex flex-col items-center gap-1 p-2 rounded-lg text-slate-500 opacity-60 cursor-not-allowed"
        title="Coming Soon!"
      >
        <Bell className="w-6 h-6" />
        <span className="text-[10px] font-medium">Notifications</span>
      </button>

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
  )
}

