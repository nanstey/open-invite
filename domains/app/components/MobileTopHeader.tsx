import { Link } from '@tanstack/react-router';
import { Bell } from 'lucide-react';

import { TabGroup } from '../../../lib/ui/components/TabGroup';
import { alertsAriaLabel, NotificationBadge } from '../../alerts/NotificationBadge';
import { useHeaderTabs } from '../HeaderTabsContext';

interface MobileTopHeaderProps {
  pageTitle: string;
  unreadCount: number;
  isAlertsActive: boolean;
}

export function MobileTopHeader({ pageTitle, unreadCount, isAlertsActive }: MobileTopHeaderProps) {
  const headerTabs = useHeaderTabs();

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-40 flex items-center justify-between px-4 shadow-lg">
      <h1 className="text-2xl font-bold text-white tracking-wide">{pageTitle}</h1>
      <div className="flex items-center gap-3">
        {headerTabs && (
          <TabGroup
            tabs={headerTabs.tabs}
            activeTab={headerTabs.activeTab}
            onChange={headerTabs.onChange}
            hideLabel
          />
        )}
        <Link
          to="/alerts"
          aria-label={alertsAriaLabel(unreadCount)}
          className={`relative p-1 transition-colors ${
            isAlertsActive ? 'text-primary' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Bell className="w-6 h-6" />
          <NotificationBadge count={unreadCount} className="absolute -top-1 -right-1" />
        </Link>
      </div>
    </div>
  );
}
