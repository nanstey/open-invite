import { Link } from '@tanstack/react-router';
import { Bell, CalendarDays, Compass, Plus, Users as UsersIcon } from 'lucide-react';

import type { User } from '../../../lib/types';
import { NotificationBadge } from '../../alerts/NotificationBadge';
import type { EventsView } from '../../events/hooks/useEventNavigation';
import type { ActiveSection } from '../routing';

interface DesktopSidebarProps {
  user: User;
  activeSection: ActiveSection;
  eventsView: EventsView;
  unreadCount: number;
  onCreateInvite: () => void;
}

export function DesktopSidebar({
  user,
  activeSection,
  eventsView,
  unreadCount,
  onCreateInvite,
}: DesktopSidebarProps) {
  return (
    <nav className="hidden md:flex w-20 lg:w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between items-center p-4 z-20 shrink-0">
      <div className="flex flex-col items-center gap-8 w-full">
        <Link
          to="/explore"
          className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary cursor-pointer select-none mb-4"
        >
          <span className="lg:hidden">0i!</span>
          <span className="hidden lg:block">Open invite!</span>
        </Link>

        <div className="flex flex-col gap-4 w-full">
          <Link
            to="/explore"
            className={`p-3 rounded-xl transition-all flex items-center justify-start gap-3 w-full ${
              activeSection === 'EXPLORE'
                ? 'bg-primary/10 text-primary'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Compass className="w-6 h-6" />
            <span className="hidden lg:block font-medium">Explore</span>
          </Link>

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
            <span className="hidden lg:block font-medium">My Invites</span>
          </Link>

          <Link
            to="/friends"
            search={{ tab: 'friends' }}
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
            onClick={onCreateInvite}
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
            <NotificationBadge count={unreadCount} className="absolute -top-2 -right-2" />
          </div>
          <span className="hidden lg:block font-medium">Alerts</span>
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
  );
}
