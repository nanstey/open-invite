import { ArrowLeft, Lock, MoreVertical, Plus, Settings, UserMinus, Users } from 'lucide-react';
import * as React from 'react';

import { useClickOutside } from '../../lib/hooks/useClickOutside';
import type { Group } from '../../lib/types';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../lib/ui/9ui/alert-dialog';
import {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '../../lib/ui/9ui/combobox';
import { Switch } from '../../lib/ui/9ui/switch';
import { EmptyState } from '../../lib/ui/components/EmptyState';
import { SearchInput } from '../../lib/ui/components/SearchInput';
import { SectionHeader } from '../../lib/ui/components/SectionHeader';
import { TabGroup, type TabOption } from '../../lib/ui/components/TabGroup';
import { UserAvatar } from '../../lib/ui/components/UserAvatar';
import { fetchFriends } from '../../services/friendService';
import {
  addUserToGroup,
  approveGroupMemberRequest,
  createGroup,
  createGroupMemberRequest,
  deleteGroup,
  denyGroupMemberRequest,
  fetchCurrentUserGroupRoles,
  fetchGroupMemberRequests,
  fetchGroupMembersWithRoles,
  fetchGroups,
  type GroupMember,
  type GroupMemberRequest,
  removeUserFromGroup,
  updateGroup,
} from '../../services/groupService';
import { useAuth } from '../auth/AuthProvider';

// Chat tab disabled - coming soon (ARCH-001: Unified messaging table for future implementation)
const groupTabs: TabOption[] = [
  { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

type GroupSettingsDraft = {
  name: string;
  allowMembersCreateEvents: boolean;
  allowMembersAddMembers: boolean;
  newMembersRequireAdminApproval: boolean;
};

export function GroupsView() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [roleByGroupId, setRoleByGroupId] = React.useState<Record<string, 'ADMIN' | 'MEMBER'>>({});
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
  const [members, setMembers] = React.useState<GroupMember[]>([]);
  const [membersGroupId, setMembersGroupId] = React.useState<string | null>(null);
  const [friends, setFriends] = React.useState<{ id: string; name: string; avatar: string }[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = React.useState<string[]>([]);
  const [memberPickerValue, setMemberPickerValue] = React.useState<{
    id: string;
    name: string;
    avatar: string;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadingMembers, setLoadingMembers] = React.useState(false);
  const [addingMembers, setAddingMembers] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('members');
  const [groupSettingsDraft, setGroupSettingsDraft] = React.useState<GroupSettingsDraft | null>(
    null
  );
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [settingsMessage, setSettingsMessage] = React.useState<string | null>(null);
  const [membersMessage, setMembersMessage] = React.useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = React.useState<GroupMemberRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = React.useState(false);
  const [processingRequestId, setProcessingRequestId] = React.useState<string | null>(null);
  const [removeTargetMember, setRemoveTargetMember] = React.useState<GroupMember | null>(null);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = React.useState(false);
  const [removingMemberId, setRemovingMemberId] = React.useState<string | null>(null);
  const [openMemberMenuId, setOpenMemberMenuId] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = React.useState('');
  const [deletingGroup, setDeletingGroup] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const memberMenuRef = React.useRef<HTMLDivElement | null>(null);
  const lastSelectionResetGroupIdRef = React.useRef<string | null>(null);
  const groupNameInputId = React.useId();

  useClickOutside(memberMenuRef, () => setOpenMemberMenuId(null), openMemberMenuId !== null);

  React.useEffect(() => {
    const load = async () => {
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
      setSelectedGroupId(prev => {
        const isDesktopViewport =
          typeof window !== 'undefined' &&
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(min-width: 1024px)').matches;
        if (!isDesktopViewport) return null;
        if (prev && groupData.some(group => group.id === prev)) return prev;
        return groupData[0]?.id ?? null;
      });
      setIsLoading(false);
    };
    void load();
  }, [user?.id]);

  React.useEffect(() => {
    if (!selectedGroupId) {
      setLoadingMembers(false);
      setMembersGroupId(null);
      setMembers([]);
      return;
    }

    let cancelled = false;

    const loadMembers = async () => {
      setLoadingMembers(true);
      setMembersGroupId(null);
      setMembers([]);
      const groupMembers = await fetchGroupMembersWithRoles(selectedGroupId);
      if (cancelled) return;
      setMembers(groupMembers);
      setMembersGroupId(selectedGroupId);
      setLoadingMembers(false);
    };
    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [selectedGroupId]);

  const filteredGroups = React.useMemo(
    () => groups.filter(group => group.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [groups, searchTerm]
  );

  const selectedGroup = React.useMemo(
    () => groups.find(group => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const isAdmin = selectedGroup
    ? roleByGroupId[selectedGroup.id] === 'ADMIN' || selectedGroup.createdBy === user?.id
    : false;
  const canAddMembers = selectedGroup ? isAdmin || selectedGroup.allowMembersAddMembers : false;

  const addableFriends = React.useMemo(() => {
    const memberIds = new Set(members.map(member => member.id));
    return friends.filter(friend => !memberIds.has(friend.id));
  }, [friends, members]);

  const selectedFriends = React.useMemo(() => {
    const friendsById = new Map(friends.map(friend => [friend.id, friend] as const));
    return selectedFriendIds
      .map(friendId => friendsById.get(friendId))
      .filter((friend): friend is { id: string; name: string; avatar: string } => !!friend);
  }, [friends, selectedFriendIds]);

  const selectableFriends = React.useMemo(() => {
    const selectedIds = new Set(selectedFriendIds);
    return addableFriends.filter(friend => !selectedIds.has(friend.id));
  }, [addableFriends, selectedFriendIds]);

  const settingsDirty = React.useMemo(() => {
    if (!selectedGroup || !groupSettingsDraft) return false;
    return (
      selectedGroup.name !== groupSettingsDraft.name ||
      selectedGroup.allowMembersCreateEvents !== groupSettingsDraft.allowMembersCreateEvents ||
      selectedGroup.allowMembersAddMembers !== groupSettingsDraft.allowMembersAddMembers ||
      selectedGroup.newMembersRequireAdminApproval !==
        groupSettingsDraft.newMembersRequireAdminApproval
    );
  }, [groupSettingsDraft, selectedGroup]);

  const handleCreateGroup = async () => {
    const fallbackName = `New Group ${groups.length + 1}`;
    const created = await createGroup(fallbackName);
    if (!created) return;
    setGroups(prev => [created, ...prev]);
    setRoleByGroupId(prev => ({ ...prev, [created.id]: 'ADMIN' }));
    setSelectedGroupId(created.id);
  };

  const handleSelectFriend = (friend: { id: string; name: string; avatar: string } | null) => {
    setMemberPickerValue(null);
    if (!friend) return;
    setSelectedFriendIds(prev => (prev.includes(friend.id) ? prev : [...prev, friend.id]));
  };

  const handleRemoveSelectedFriend = (friendId: string) => {
    setSelectedFriendIds(prev => prev.filter(id => id !== friendId));
  };

  const handleAddMembers = async () => {
    if (!selectedGroup || selectedFriendIds.length === 0 || addingMembers) return;
    const groupId = selectedGroup.id;
    const requiresApproval = selectedGroup.newMembersRequireAdminApproval && !isAdmin;
    const pendingFriendIds = [...selectedFriendIds];
    setAddingMembers(true);
    try {
      const failedFriendIds: string[] = [];
      const addedFriendIds: string[] = [];

      for (const friendId of pendingFriendIds) {
        const added = requiresApproval
          ? await createGroupMemberRequest(groupId, friendId)
          : await addUserToGroup(friendId, groupId);
        if (added) {
          addedFriendIds.push(friendId);
        } else {
          failedFriendIds.push(friendId);
        }
      }

      if (!requiresApproval && addedFriendIds.length > 0) {
        setMembers(prev => {
          const existingIds = new Set(prev.map(member => member.id));
          const additions = addedFriendIds
            .map(friendId => friends.find(friend => friend.id === friendId))
            .filter((friend): friend is { id: string; name: string; avatar: string } => !!friend)
            .filter(friend => !existingIds.has(friend.id))
            .map(friend => ({
              ...friend,
              user: {
                id: friend.id,
                name: friend.name,
                avatar: friend.avatar,
              },
              role: 'MEMBER' as const,
            }));

          return additions.length > 0 ? [...prev, ...additions] : prev;
        });
      }

      if (!requiresApproval) {
        const refreshed = await fetchGroupMembersWithRoles(groupId);
        if (refreshed.length > 0) {
          setMembers(refreshed);
        }
      }

      setSelectedFriendIds(failedFriendIds);
    } finally {
      setAddingMembers(false);
    }
  };

  React.useEffect(() => {
    if (lastSelectionResetGroupIdRef.current === selectedGroupId) return;
    lastSelectionResetGroupIdRef.current = selectedGroupId;
    setSelectedFriendIds([]);
    setMemberPickerValue(null);
  }, [selectedGroupId]);

  React.useEffect(() => {
    setMembersMessage(null);
    setRemoveTargetMember(null);
    setIsRemoveDialogOpen(false);
    setRemovingMemberId(null);
    setOpenMemberMenuId(null);
    if (!selectedGroup) {
      setGroupSettingsDraft(null);
      return;
    }
    setGroupSettingsDraft({
      name: selectedGroup.name,
      allowMembersCreateEvents: selectedGroup.allowMembersCreateEvents,
      allowMembersAddMembers: selectedGroup.allowMembersAddMembers,
      newMembersRequireAdminApproval: selectedGroup.allowMembersAddMembers
        ? selectedGroup.newMembersRequireAdminApproval
        : false,
    });
    setSettingsMessage(null);
    setProcessingRequestId(null);
  }, [selectedGroup]);

  const refreshPendingRequests = React.useCallback(async () => {
    if (!selectedGroup || !isAdmin) {
      setPendingRequests([]);
      return;
    }
    setLoadingRequests(true);
    const requests = await fetchGroupMemberRequests(selectedGroup.id);
    setPendingRequests(requests);
    setLoadingRequests(false);
  }, [isAdmin, selectedGroup]);

  React.useEffect(() => {
    if (activeTab !== 'settings') return;
    void refreshPendingRequests();
  }, [activeTab, refreshPendingRequests]);

  const handleSaveSettings = async () => {
    if (!selectedGroup || !groupSettingsDraft || savingSettings) return;
    const trimmedName = groupSettingsDraft.name.trim();
    const newMembersRequireAdminApproval =
      groupSettingsDraft.allowMembersAddMembers &&
      groupSettingsDraft.newMembersRequireAdminApproval;
    if (!trimmedName) {
      setSettingsMessage('Group name is required.');
      return;
    }

    setSavingSettings(true);
    setSettingsMessage(null);
    const updated = await updateGroup(selectedGroup.id, {
      name: trimmedName,
      allowMembersCreateEvents: groupSettingsDraft.allowMembersCreateEvents,
      allowMembersAddMembers: groupSettingsDraft.allowMembersAddMembers,
      newMembersRequireAdminApproval,
    });
    if (!updated) {
      setSettingsMessage('Failed to save settings. Please try again.');
      setSavingSettings(false);
      return;
    }

    setGroups(prev => prev.map(group => (group.id === updated.id ? updated : group)));
    setGroupSettingsDraft({
      name: updated.name,
      allowMembersCreateEvents: updated.allowMembersCreateEvents,
      allowMembersAddMembers: updated.allowMembersAddMembers,
      newMembersRequireAdminApproval: updated.allowMembersAddMembers
        ? updated.newMembersRequireAdminApproval
        : false,
    });
    setSettingsMessage('Settings saved.');
    setSavingSettings(false);

    if (updated.allowMembersAddMembers && updated.newMembersRequireAdminApproval) {
      void refreshPendingRequests();
    } else {
      setPendingRequests([]);
    }
  };

  const handleApproveRequest = async (request: GroupMemberRequest) => {
    if (!selectedGroup || processingRequestId) return;
    setProcessingRequestId(request.id);
    const approved = await approveGroupMemberRequest(request.id);
    if (!approved) {
      setSettingsMessage('Failed to approve request.');
      setProcessingRequestId(null);
      return;
    }

    const [updatedMembers] = await Promise.all([
      fetchGroupMembersWithRoles(selectedGroup.id),
      refreshPendingRequests(),
    ]);
    setMembers(updatedMembers);
    setSettingsMessage('Request approved.');
    setProcessingRequestId(null);
  };

  const handleDenyRequest = async (requestId: string) => {
    if (processingRequestId) return;
    setProcessingRequestId(requestId);
    const denied = await denyGroupMemberRequest(requestId);
    if (!denied) {
      setSettingsMessage('Failed to deny request.');
      setProcessingRequestId(null);
      return;
    }
    await refreshPendingRequests();
    setSettingsMessage('Request denied.');
    setProcessingRequestId(null);
  };

  const handleDeleteDialogOpenChange = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    setDeleteConfirmationInput('');
    setDeleteError(null);
    if (!open) {
      setDeletingGroup(false);
    }
  };

  const handleRemoveDialogOpenChange = (open: boolean) => {
    setIsRemoveDialogOpen(open);
    if (!open) {
      setRemoveTargetMember(null);
      setRemovingMemberId(null);
    }
  };

  const handleOpenRemoveMemberDialog = (member: GroupMember) => {
    if (!selectedGroup || !isAdmin) return;
    const isCreatorRow = member.id === selectedGroup.createdBy;
    const isSelfRow = member.id === user?.id;
    if (isCreatorRow || isSelfRow) return;

    setOpenMemberMenuId(null);
    setMembersMessage(null);
    setRemoveTargetMember(member);
    setIsRemoveDialogOpen(true);
  };

  const handleConfirmRemoveMember = async () => {
    if (!selectedGroup || !removeTargetMember || removingMemberId) return;
    const isCreatorRow = removeTargetMember.id === selectedGroup.createdBy;
    const isSelfRow = removeTargetMember.id === user?.id;
    if (!isAdmin || isCreatorRow || isSelfRow) return;

    setMembersMessage(null);
    setRemovingMemberId(removeTargetMember.id);
    const removed = await removeUserFromGroup(removeTargetMember.id, selectedGroup.id);

    if (!removed) {
      setMembersMessage('Failed to remove member. Please try again.');
      setRemovingMemberId(null);
      return;
    }

    setMembers(prev => prev.filter(member => member.id !== removeTargetMember.id));
    setMembersMessage(`${removeTargetMember.name} removed from this group.`);
    setRemovingMemberId(null);
    setRemoveTargetMember(null);
    setIsRemoveDialogOpen(false);
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup || deletingGroup) return;
    if (deleteConfirmationInput.trim() !== selectedGroup.name) return;

    const groupId = selectedGroup.id;
    setDeletingGroup(true);
    setDeleteError(null);

    const deleted = await deleteGroup(groupId);
    if (!deleted) {
      setDeleteError('Failed to delete group. Please try again.');
      setDeletingGroup(false);
      return;
    }

    setGroups(prev => prev.filter(group => group.id !== groupId));
    setRoleByGroupId(prev => {
      const next = { ...prev };
      delete next[groupId];
      return next;
    });
    setSelectedGroupId(null);
    setMembers([]);
    setPendingRequests([]);
    setLoadingRequests(false);
    setProcessingRequestId(null);
    setSettingsMessage(null);
    setGroupSettingsDraft(null);
    setActiveTab('members');
    setDeleteConfirmationInput('');
    setDeleteError(null);
    setDeletingGroup(false);
    setIsDeleteDialogOpen(false);
  };

  const membersCanAddMembers =
    groupSettingsDraft?.allowMembersAddMembers ?? selectedGroup?.allowMembersAddMembers ?? false;
  const newMembersRequireAdminApprovalEnabled =
    membersCanAddMembers &&
    (groupSettingsDraft?.newMembersRequireAdminApproval ??
      selectedGroup?.newMembersRequireAdminApproval ??
      false);
  const canConfirmDelete = !!selectedGroup && deleteConfirmationInput.trim() === selectedGroup.name;

  const showDetailOnMobile = !!selectedGroupId;

  return (
    <div className="w-full pt-2 pb-20 md:pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
        <section className={`${showDetailOnMobile ? 'hidden lg:block' : 'block'} space-y-6`}>
          <div className="flex items-stretch gap-2">
            <div className="bg-slate-900/50 p-1 rounded-xl flex-1">
              <SearchInput
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Search groups..."
                size="lg"
              />
            </div>
            <button
              type="button"
              onClick={handleCreateGroup}
              className="h-[54px] w-[54px] mt-0.5 sm:w-auto sm:px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold inline-flex items-center justify-center gap-2 shrink-0"
              aria-label="Create group"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>

          <div className="space-y-4">
            <SectionHeader
              title="Your Groups"
              count={isLoading ? 'Loading...' : `${filteredGroups.length} Groups`}
            />
            {isLoading ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
                Loading groups...
              </div>
            ) : filteredGroups.length === 0 ? (
              <EmptyState
                icon={<Users className="w-full h-full" />}
                message={
                  searchTerm
                    ? 'No groups found matching your search.'
                    : 'No groups yet. Create one to get started.'
                }
                className="py-8"
              />
            ) : (
              <div className="space-y-4">
                {filteredGroups.map(group => {
                  const isOwner = group.createdBy === user?.id;
                  const role = isOwner
                    ? 'OWNER'
                    : roleByGroupId[group.id] === 'ADMIN'
                      ? 'ADMIN'
                      : null;
                  const selected = selectedGroupId === group.id;
                  return (
                    <button
                      type="button"
                      key={group.id}
                      onClick={() => {
                        setSelectedGroupId(group.id);
                        setActiveTab('members');
                      }}
                      className={`w-full bg-surface border p-4 rounded-xl text-left flex items-center gap-3 transition-colors ${
                        selected
                          ? 'border-primary bg-slate-700/60'
                          : 'border-slate-700 hover:border-primary/50'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full shrink-0 border border-slate-500 bg-slate-700/70 flex items-center justify-center text-white font-bold">
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate">{group.name}</div>
                      </div>
                      {role ? (
                        <span className="text-xs font-semibold tracking-wide px-2.5 py-1 rounded-full border border-slate-600 text-slate-300">
                          {role}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className={`${showDetailOnMobile ? 'block' : 'hidden lg:block'} min-h-[380px]`}>
          {selectedGroup ? (
            <div className="bg-surface border border-slate-700 rounded-2xl p-4 md:p-5 space-y-4 h-full">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedGroupId(null)}
                  className="lg:hidden p-2 rounded-full border border-slate-700 text-slate-300"
                  aria-label="Back to groups"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedGroup.name}</h2>
                </div>
              </div>

              <TabGroup tabs={groupTabs} activeTab={activeTab} onChange={setActiveTab} />

              {activeTab === 'members' ? (
                <div className="space-y-4">
                  {canAddMembers ? (
                    <div className="flex gap-2">
                      <Combobox<{ id: string; name: string; avatar: string }>
                        items={selectableFriends}
                        value={memberPickerValue}
                        onValueChange={handleSelectFriend}
                        itemToString={friend => friend?.name ?? ''}
                        className="flex-1"
                      >
                        <ComboboxInput
                          disabled={addableFriends.length === 0 || addingMembers}
                          showClear={false}
                          placeholder={
                            addableFriends.length === 0
                              ? 'No friends to add'
                              : 'Add friends to this group...'
                          }
                          startContent={
                            selectedFriends.length > 0 ? (
                              <ComboboxChips>
                                {selectedFriends.map(friend => (
                                  <ComboboxChip key={friend.id}>
                                    <span>{friend.name}</span>
                                    <ComboboxChipRemove
                                      onClick={event => {
                                        event.stopPropagation();
                                        handleRemoveSelectedFriend(friend.id);
                                      }}
                                      aria-label={`Remove ${friend.name}`}
                                    />
                                  </ComboboxChip>
                                ))}
                              </ComboboxChips>
                            ) : null
                          }
                        />
                        <ComboboxContent>
                          <ComboboxEmpty>
                            {addableFriends.length === 0
                              ? 'All friends are already members.'
                              : 'No friends match your search.'}
                          </ComboboxEmpty>
                          <ComboboxList<{ id: string; name: string; avatar: string }>>
                            {friend => (
                              <ComboboxItem key={friend.id} value={friend}>
                                {friend.name}
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                      <button
                        type="button"
                        onClick={handleAddMembers}
                        disabled={selectedFriendIds.length === 0 || addingMembers}
                        className="px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold"
                      >
                        {addingMembers
                          ? 'Adding...'
                          : `Add${selectedFriendIds.length > 0 ? ` (${selectedFriendIds.length})` : ''}`}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 text-sm text-slate-300">
                      Only admins can add members for this group.
                    </div>
                  )}
                  {membersMessage ? (
                    <div
                      className={`text-xs ${
                        membersMessage.startsWith('Failed') ? 'text-red-300' : 'text-slate-300'
                      }`}
                    >
                      {membersMessage}
                    </div>
                  ) : null}

                  {loadingMembers || membersGroupId !== selectedGroup.id ? (
                    <div className="text-sm text-slate-400">Loading members...</div>
                  ) : (
                    <div className="space-y-3">
                      {members.map(member => {
                        const isCreatorRow = member.id === selectedGroup.createdBy;
                        const isSelfRow = member.id === user?.id;
                        const memberRole = isCreatorRow
                          ? 'OWNER'
                          : member.role === 'ADMIN'
                            ? 'ADMIN'
                            : null;
                        const canRemoveMember = isAdmin && !isSelfRow && !isCreatorRow;
                        const isRemovingThisMember = removingMemberId === member.id;

                        return (
                          <div
                            key={member.id}
                            className="bg-slate-900/40 border border-slate-700 rounded-xl p-3 flex items-center gap-3"
                          >
                            <UserAvatar
                              src={member.avatar}
                              alt={member.name}
                              size="sm"
                              className="border-slate-500"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-white truncate">{member.name}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {memberRole ? (
                                <span className="text-xs text-slate-300 tracking-wide">
                                  {memberRole}
                                </span>
                              ) : null}
                              {canRemoveMember ? (
                                <div
                                  className="relative shrink-0"
                                  ref={openMemberMenuId === member.id ? memberMenuRef : null}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenMemberMenuId(prev =>
                                        prev === member.id ? null : member.id
                                      )
                                    }
                                    disabled={!!removingMemberId}
                                    className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label={`Open actions menu for ${member.name}`}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                  {openMemberMenuId === member.id ? (
                                    <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 min-w-[140px] py-1">
                                      <button
                                        type="button"
                                        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={() => handleOpenRemoveMemberDialog(member)}
                                        disabled={!!removingMemberId}
                                      >
                                        <UserMinus className="w-4 h-4" />
                                        {isRemovingThisMember ? 'Removing...' : 'Remove'}
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {activeTab === 'settings' ? (
                isAdmin ? (
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor={groupNameInputId}
                        className="block text-xs uppercase tracking-wider text-slate-400 mb-2"
                      >
                        Group name
                      </label>
                      <input
                        id={groupNameInputId}
                        value={groupSettingsDraft?.name ?? selectedGroup.name}
                        onChange={event =>
                          setGroupSettingsDraft(prev =>
                            prev
                              ? {
                                  ...prev,
                                  name: event.target.value,
                                }
                              : prev
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white"
                      />
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 space-y-3">
                      <div className="text-sm font-semibold text-white">Permissions</div>
                      <div className="flex items-center gap-3 text-sm text-slate-200">
                        <Switch
                          aria-label="Members can create events"
                          checked={
                            groupSettingsDraft?.allowMembersCreateEvents ??
                            selectedGroup.allowMembersCreateEvents
                          }
                          onCheckedChange={(checked: boolean) =>
                            setGroupSettingsDraft(prev =>
                              prev
                                ? {
                                    ...prev,
                                    allowMembersCreateEvents: checked,
                                  }
                                : prev
                            )
                          }
                        />
                        <span>Members can create events</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-200">
                        <Switch
                          aria-label="Members can add members"
                          checked={
                            groupSettingsDraft?.allowMembersAddMembers ??
                            selectedGroup.allowMembersAddMembers
                          }
                          onCheckedChange={(checked: boolean) =>
                            setGroupSettingsDraft(prev =>
                              prev
                                ? {
                                    ...prev,
                                    allowMembersAddMembers: checked,
                                    newMembersRequireAdminApproval: checked
                                      ? prev.newMembersRequireAdminApproval
                                      : false,
                                  }
                                : prev
                            )
                          }
                        />
                        <span>Members can add members</span>
                      </div>
                      <div
                        className={`ml-7 flex items-center gap-3 text-sm ${
                          membersCanAddMembers ? 'text-slate-200' : 'text-slate-400'
                        }`}
                      >
                        <Switch
                          aria-label="New members require admin approval"
                          checked={newMembersRequireAdminApprovalEnabled}
                          disabled={!membersCanAddMembers}
                          onCheckedChange={(checked: boolean) =>
                            setGroupSettingsDraft(prev =>
                              prev
                                ? {
                                    ...prev,
                                    newMembersRequireAdminApproval: checked,
                                  }
                                : prev
                            )
                          }
                        />
                        <span>New members require admin approval</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        disabled={!settingsDirty || savingSettings}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold"
                      >
                        {savingSettings ? 'Saving...' : 'Save settings'}
                      </button>
                      {settingsMessage ? (
                        <div className="text-xs text-slate-300">{settingsMessage}</div>
                      ) : null}
                    </div>

                    {newMembersRequireAdminApprovalEnabled ? (
                      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-white">
                            Membership requests
                          </div>
                          <span className="text-xs text-slate-400">
                            {pendingRequests.length} pending
                          </span>
                        </div>

                        {loadingRequests ? (
                          <div className="text-sm text-slate-400">Loading requests...</div>
                        ) : pendingRequests.length === 0 ? (
                          <div className="text-sm text-slate-400">No pending requests.</div>
                        ) : (
                          <div className="space-y-2">
                            {pendingRequests.map(request => (
                              <div
                                key={request.id}
                                className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
                              >
                                <UserAvatar
                                  src={request.requester.avatar}
                                  alt={request.requester.name}
                                  size="sm"
                                  className="border-slate-500"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold text-white truncate">
                                    {request.requester.name}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    Requested {new Date(request.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void handleApproveRequest(request)}
                                  disabled={processingRequestId === request.id}
                                  className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-xs text-white font-semibold"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDenyRequest(request.id)}
                                  disabled={processingRequestId === request.id}
                                  className="px-3 py-1.5 rounded-lg border border-slate-600 hover:border-slate-500 disabled:opacity-50 text-xs text-slate-200 font-semibold"
                                >
                                  Deny
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 space-y-3">
                      <div className="text-sm font-semibold text-red-200">Danger zone</div>
                      <div className="text-xs text-red-100/80">
                        Deleting this group is a destructive action and cannot be undone.
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteDialogOpenChange(true)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30"
                      >
                        Delete group
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 text-center text-slate-300 flex flex-col items-center gap-3">
                    <Lock className="w-5 h-5 text-slate-400" />
                    Settings are available to group admins only.
                  </div>
                )
              ) : null}
            </div>
          ) : (
            <div className="hidden lg:flex items-center justify-center bg-surface border border-slate-700 rounded-2xl h-full text-slate-400">
              Select a group to see details.
            </div>
          )}
        </section>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="pt-4">
              <p>Type the group name to confirm:</p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <input
            value={deleteConfirmationInput}
            onChange={event => setDeleteConfirmationInput(event.target.value)}
            placeholder={selectedGroup?.name ?? ''}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500"
          />
          {deleteError ? <div className="mt-2 text-xs text-red-300">{deleteError}</div> : null}

          <AlertDialogFooter>
            <AlertDialogClose
              disabled={deletingGroup}
              className="px-4 py-2 rounded-xl text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
            >
              Cancel
            </AlertDialogClose>
            <button
              type="button"
              onClick={() => void handleDeleteGroup()}
              disabled={!canConfirmDelete || deletingGroup}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletingGroup ? 'Deleting...' : 'Delete'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRemoveDialogOpen} onOpenChange={handleRemoveDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription className="pt-4">
              {removeTargetMember && selectedGroup
                ? `Remove ${removeTargetMember.name} from ${selectedGroup.name}?`
                : 'Remove this member from the group?'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogClose
              disabled={!!removingMemberId}
              className="px-4 py-2 rounded-xl text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
            >
              Cancel
            </AlertDialogClose>
            <button
              type="button"
              onClick={() => void handleConfirmRemoveMember()}
              disabled={!removeTargetMember || !!removingMemberId}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {removingMemberId ? 'Removing...' : 'Remove'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
