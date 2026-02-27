import * as React from 'react';

import type { Group } from '../../../lib/types';
import { fetchFriends } from '../../../services/friendService';
import { fetchCurrentUserGroupRoles, fetchGroups } from '../../../services/groupService';
import { useAuth } from '../../auth/AuthProvider';

type UseGroupsDataReturn = {
  groups: Group[];
  roleByGroupId: Record<string, 'ADMIN' | 'MEMBER'>;
  friends: { id: string; name: string; avatar: string }[];
  isLoading: boolean;
  refreshGroups: () => Promise<void>;
};

export function useGroupsData(): UseGroupsDataReturn {
  const { user } = useAuth();
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [roleByGroupId, setRoleByGroupId] = React.useState<Record<string, 'ADMIN' | 'MEMBER'>>({});
  const [friends, setFriends] = React.useState<{ id: string; name: string; avatar: string }[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadGroupsData = React.useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const [groupData, roleData, friendData] = await Promise.all([
      fetchGroups(user.id),
      fetchCurrentUserGroupRoles(user.id),
      fetchFriends(),
    ]);
    setGroups(groupData);
    setRoleByGroupId(roleData);
    setFriends(friendData);
    setIsLoading(false);
  }, [user?.id]);

  React.useEffect(() => {
    void loadGroupsData();
  }, [loadGroupsData]);

  return { groups, roleByGroupId, friends, isLoading, refreshGroups: loadGroupsData };
}
