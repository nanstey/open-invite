import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { User, Users } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useSetHeaderTabs } from '../domains/app/HeaderTabsContext';
import { FriendsView } from '../domains/friends/FriendsView';
import { coerceFriendsTab, parseFriendsTab, resolveFriendsTab } from '../domains/friends/types';
import { GroupsView } from '../domains/groups/GroupsView';
import { useFeatureFlag } from '../lib/featureFlags';
import type { TabOption } from '../lib/ui/components/TabGroup';

const friendsTabs: TabOption[] = [
  { id: 'friends', label: 'Friends', icon: <User className="w-4 h-4" /> },
  { id: 'groups', label: 'Groups', icon: <Users className="w-4 h-4" /> },
];

export function getFriendsTabs(groupsEnabled: boolean): TabOption[] {
  return groupsEnabled ? friendsTabs : friendsTabs.filter(tab => tab.id !== 'groups');
}

export const Route = createFileRoute('/friends')({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: parseFriendsTab(search.tab),
  }),
  beforeLoad: ({ context }) => {
    if (!context.auth.loading && !context.auth.user) {
      throw redirect({ to: '/' });
    }
  },
  component: function FriendsRouteComponent() {
    const navigate = useNavigate();
    const groupsEnabled = useFeatureFlag('groups');
    const requestedTab = Route.useSearch().tab ?? 'friends';
    const tab = resolveFriendsTab(requestedTab, groupsEnabled);
    const activeTab = tab === 'groups' ? 'GROUPS' : 'FRIENDS';
    const availableTabs = getFriendsTabs(groupsEnabled);

    const handleTabChange = useCallback(
      (id: string) => navigate({ to: '/friends', search: { tab: coerceFriendsTab(id) } }),
      [navigate]
    );

    useEffect(() => {
      if (requestedTab !== tab) {
        navigate({ to: '/friends', search: { tab }, replace: true });
      }
    }, [navigate, requestedTab, tab]);

    useSetHeaderTabs(availableTabs, tab, handleTabChange);

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-2">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'FRIENDS' || !groupsEnabled ? <FriendsView /> : <GroupsView />}
        </div>
      </div>
    );
  },
});
