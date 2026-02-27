import * as React from 'react';

import { useClickOutside } from '../../lib/hooks/useClickOutside';
import {
  deleteGroup,
  type GroupMember,
  type GroupMemberRequest,
  removeUserFromGroup,
} from '../../services/groupService';
import { useAuth } from '../auth/AuthProvider';
import { DeleteGroupDialog } from './components/DeleteGroupDialog';
import { GroupDetailPane } from './components/GroupDetailPane';
import { GroupMembersTab } from './components/GroupMembersTab';
import { GroupSettingsTab } from './components/GroupSettingsTab';
import { GroupsListPane } from './components/GroupsListPane';
import { RemoveMemberDialog } from './components/RemoveMemberDialog';
import { useGroupDialogs } from './hooks/useGroupDialogs';
import { useGroupMembers } from './hooks/useGroupMembers';
import { useGroupRequests } from './hooks/useGroupRequests';
import { useGroupsData } from './hooks/useGroupsData';
import {
  canAddMembersToGroup,
  canManageGroupSettings,
  canRemoveGroupMember,
} from './utils/groupPermissions';

type GroupSettingsDraft = {
  name: string;
  allowMembersCreateEvents: boolean;
  allowMembersAddMembers: boolean;
  newMembersRequireAdminApproval: boolean;
};

export function GroupsView() {
  const { user } = useAuth();

  // Data hooks
  const { groups, roleByGroupId, friends, isLoading, refreshGroups } = useGroupsData();
  const { members, membersGroupId, loadingMembers, refreshMembers, clearMembers } =
    useGroupMembers();
  const {
    pendingRequests,
    loadingRequests,
    processingRequestId,
    refreshRequests,
    handleApproveRequest: handleApproveRequestHook,
    handleDenyRequest: handleDenyRequestHook,
  } = useGroupRequests();
  const dialogs = useGroupDialogs();

  // Local state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = React.useState<string[]>([]);
  const [memberPickerValue, setMemberPickerValue] = React.useState<{
    id: string;
    name: string;
    avatar: string;
  } | null>(null);
  const [activeTab, setActiveTab] = React.useState('members');
  const [groupSettingsDraft, setGroupSettingsDraft] = React.useState<GroupSettingsDraft | null>(
    null
  );
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [settingsMessage, setSettingsMessage] = React.useState<string | null>(null);
  const [membersMessage, setMembersMessage] = React.useState<string | null>(null);
  const [addingMembers, setAddingMembers] = React.useState(false);

  const memberMenuRef = React.useRef<HTMLDivElement>(null);
  const lastSelectionResetGroupIdRef = React.useRef<string | null>(null);

  useClickOutside(memberMenuRef, dialogs.closeMemberMenu, dialogs.openMemberMenuId !== null);

  const filteredGroups = React.useMemo(
    () => groups.filter(group => group.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [groups, searchTerm]
  );

  const selectedGroup = React.useMemo(
    () => groups.find(group => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId]
  );

  const isAdmin = canManageGroupSettings(selectedGroup, roleByGroupId, user?.id);
  const canAddMembers = canAddMembersToGroup(selectedGroup, roleByGroupId, user?.id);

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

  const canConfirmDelete =
    !!selectedGroup && dialogs.deleteConfirmationInput.trim() === selectedGroup.name;

  // Select initial group on desktop when groups load
  React.useEffect(() => {
    if (!isLoading && selectedGroupId === null && groups.length > 0) {
      const isDesktopViewport =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(min-width: 1024px)').matches;
      if (isDesktopViewport) {
        setSelectedGroupId(groups[0]?.id ?? null);
      }
    }
  }, [isLoading, groups, selectedGroupId]);

  // Reset member state when group selection changes
  React.useEffect(() => {
    if (!selectedGroupId) {
      clearMembers();
      return;
    }

    if (membersGroupId !== selectedGroupId) {
      void refreshMembers(selectedGroupId);
    }
  }, [selectedGroupId, membersGroupId, refreshMembers, clearMembers]);

  // Reset friend selection on group change
  React.useEffect(() => {
    if (lastSelectionResetGroupIdRef.current === selectedGroupId) return;
    lastSelectionResetGroupIdRef.current = selectedGroupId;
    setSelectedFriendIds([]);
    setMemberPickerValue(null);
  }, [selectedGroupId]);

  // Initialize settings draft when group changes
  React.useEffect(() => {
    setMembersMessage(null);
    dialogs.closeRemoveDialog();
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
  }, [selectedGroup, dialogs.closeRemoveDialog]);

  // Load pending requests when settings tab is active
  React.useEffect(() => {
    if (activeTab !== 'settings' || !selectedGroup) return;
    void refreshRequests(selectedGroup.id, isAdmin);
  }, [activeTab, selectedGroup, isAdmin, refreshRequests]);

  // Handlers
  const handleCreateGroup = async () => {
    const fallbackName = `New Group ${groups.length + 1}`;
    const created = await import('../../services/groupService').then(m =>
      m.createGroup(fallbackName)
    );
    if (!created) return;
    await refreshGroups();
    setSelectedGroupId(created.id);
    setActiveTab('members');
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setActiveTab('members');
  };

  const handleBackToList = () => {
    setSelectedGroupId(null);
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
    const requiresApproval = selectedGroup.newMembersRequireAdminApproval && !isAdmin;
    setAddingMembers(true);
    try {
      const { createGroupMemberRequest, addUserToGroup } = await import(
        '../../services/groupService'
      );
      const failedFriendIds: string[] = [];
      const addedFriendIds: string[] = [];

      for (const friendId of selectedFriendIds) {
        const added = requiresApproval
          ? await createGroupMemberRequest(selectedGroup.id)
          : await addUserToGroup(friendId, selectedGroup.id);
        if (added) {
          addedFriendIds.push(friendId);
        } else {
          failedFriendIds.push(friendId);
        }
      }

      if (!requiresApproval && addedFriendIds.length > 0) {
        await refreshMembers(selectedGroup.id);
      }

      setSelectedFriendIds(failedFriendIds);
    } finally {
      setAddingMembers(false);
    }
  };

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
    const { updateGroup } = await import('../../services/groupService');
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

    await refreshGroups();
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
      void refreshRequests(selectedGroup.id, true);
    }
  };

  const handleApprove = async (request: GroupMemberRequest) => {
    if (!selectedGroup) return;
    const approved = await handleApproveRequestHook(request);
    if (!approved) {
      setSettingsMessage('Failed to approve request.');
      return;
    }
    await refreshMembers(selectedGroup.id);
    await refreshRequests(selectedGroup.id, true);
    setSettingsMessage('Request approved.');
  };

  const handleDenyInternal = async (requestId: string) => {
    const denied = await handleDenyRequestHook(requestId);
    if (!denied) {
      setSettingsMessage('Failed to deny request.');
      return;
    }
    setSettingsMessage('Request denied.');
  };

  const handleOpenRemoveMemberDialog = (member: GroupMember) => {
    if (!canRemoveGroupMember(selectedGroup, member, roleByGroupId, user?.id)) return;
    dialogs.closeMemberMenu();
    setMembersMessage(null);
    dialogs.openRemoveDialog(member);
  };

  const handleConfirmRemoveMember = async () => {
    if (!selectedGroup || !dialogs.removeTargetMember) return;
    if (!canRemoveGroupMember(selectedGroup, dialogs.removeTargetMember, roleByGroupId, user?.id))
      return;

    setMembersMessage(null);
    dialogs.setRemovingMemberId(dialogs.removeTargetMember.id);
    const removed = await removeUserFromGroup(dialogs.removeTargetMember.id, selectedGroup.id);

    if (!removed) {
      setMembersMessage('Failed to remove member. Please try again.');
      dialogs.setRemovingMemberId(null);
      return;
    }

    await refreshMembers(selectedGroup.id);
    setMembersMessage(`${dialogs.removeTargetMember.name} removed from this group.`);
    dialogs.setRemovingMemberId(null);
    dialogs.closeRemoveDialog();
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup || dialogs.deletingGroup) return;
    if (dialogs.deleteConfirmationInput.trim() !== selectedGroup.name) return;

    const groupId = selectedGroup.id;
    dialogs.setDeletingGroup(true);
    dialogs.setDeleteError(null);

    const deleted = await deleteGroup(groupId);
    if (!deleted) {
      dialogs.setDeleteError('Failed to delete group. Please try again.');
      dialogs.setDeletingGroup(false);
      return;
    }

    await refreshGroups();
    clearMembers();
    setSelectedGroupId(null);
    setActiveTab('members');
    dialogs.closeDeleteDialog();
  };

  const showDetailOnMobile = !!selectedGroupId;

  return (
    <div className="w-full pt-2 pb-20 md:pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
        <div className={`${showDetailOnMobile ? 'hidden lg:block' : 'block'}`}>
          <GroupsListPane
            groups={groups}
            filteredGroups={filteredGroups}
            roleByGroupId={roleByGroupId}
            selectedGroupId={selectedGroupId}
            searchTerm={searchTerm}
            isLoading={isLoading}
            userId={user?.id}
            onSearchChange={setSearchTerm}
            onSelectGroup={handleSelectGroup}
            onCreateGroup={handleCreateGroup}
          />
        </div>

        <div className={`${showDetailOnMobile ? 'block' : 'hidden lg:block'}`}>
          <GroupDetailPane
            selectedGroup={selectedGroup}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onBack={handleBackToList}
          >
            {activeTab === 'members' && selectedGroup && (
              <GroupMembersTab
                selectedGroup={selectedGroup}
                members={members}
                friends={friends}
                canAddMembers={canAddMembers}
                isAdmin={isAdmin}
                userId={user?.id}
                loadingMembers={loadingMembers}
                addingMembers={addingMembers}
                selectedFriendIds={selectedFriendIds}
                memberPickerValue={memberPickerValue}
                membersMessage={membersMessage}
                removingMemberId={dialogs.removingMemberId}
                openMemberMenuId={dialogs.openMemberMenuId}
                onAddFriend={handleSelectFriend}
                onRemoveSelectedFriend={handleRemoveSelectedFriend}
                onHandleAddMembers={handleAddMembers}
                onOpenRemoveMemberDialog={handleOpenRemoveMemberDialog}
                onOpenMemberMenu={dialogs.openMemberMenu}
                onCloseMemberMenu={dialogs.closeMemberMenu}
                memberMenuRef={memberMenuRef}
              />
            )}
            {activeTab === 'settings' && selectedGroup && groupSettingsDraft && (
              <GroupSettingsTab
                selectedGroup={selectedGroup}
                groupSettingsDraft={groupSettingsDraft}
                isAdmin={isAdmin}
                savingSettings={savingSettings}
                settingsDirty={settingsDirty}
                settingsMessage={settingsMessage}
                pendingRequests={pendingRequests}
                loadingRequests={loadingRequests}
                processingRequestId={processingRequestId}
                onSettingsDraftChange={setGroupSettingsDraft}
                onSaveSettings={handleSaveSettings}
                onApproveRequest={handleApprove}
                onDenyRequest={handleDenyInternal}
                onDeleteDialogOpen={dialogs.openDeleteDialog}
              />
            )}
          </GroupDetailPane>
        </div>
      </div>

      <DeleteGroupDialog
        open={dialogs.isDeleteDialogOpen}
        onOpenChange={dialogs.closeDeleteDialog}
        selectedGroup={selectedGroup}
        deleteConfirmationInput={dialogs.deleteConfirmationInput}
        deletingGroup={dialogs.deletingGroup}
        deleteError={dialogs.deleteError}
        canConfirmDelete={canConfirmDelete}
        onInputChange={dialogs.setDeleteConfirmationInput}
        onConfirmDelete={handleDeleteGroup}
      />

      <RemoveMemberDialog
        open={dialogs.isRemoveDialogOpen}
        onOpenChange={dialogs.closeRemoveDialog}
        removeTargetMember={dialogs.removeTargetMember}
        selectedGroup={selectedGroup}
        removingMemberId={dialogs.removingMemberId}
        onConfirmRemove={handleConfirmRemoveMember}
      />
    </div>
  );
}
