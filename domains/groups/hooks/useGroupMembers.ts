import * as React from 'react';

import { fetchGroupMembersWithRoles, type GroupMember } from '../../../services/groupService';

type UseGroupMembersReturn = {
  members: GroupMember[];
  membersGroupId: string | null;
  loadingMembers: boolean;
  refreshMembers: (groupId: string) => Promise<void>;
  clearMembers: () => void;
};

export function useGroupMembers(): UseGroupMembersReturn {
  const [members, setMembers] = React.useState<GroupMember[]>([]);
  const [membersGroupId, setMembersGroupId] = React.useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = React.useState(false);

  const refreshMembers = React.useCallback(async (groupId: string) => {
    setLoadingMembers(true);
    setMembersGroupId(null);
    setMembers([]);
    const groupMembers = await fetchGroupMembersWithRoles(groupId);
    setMembers(groupMembers);
    setMembersGroupId(groupId);
    setLoadingMembers(false);
  }, []);

  const clearMembers = React.useCallback(() => {
    setLoadingMembers(false);
    setMembersGroupId(null);
    setMembers([]);
  }, []);

  return { members, membersGroupId, loadingMembers, refreshMembers, clearMembers };
}
