import * as React from 'react';

import type { GroupMember } from '../../../services/groupService';

type DialogState = {
  isDeleteDialogOpen: boolean;
  isRemoveDialogOpen: boolean;
  deleteConfirmationInput: string;
  deletingGroup: boolean;
  deleteError: string | null;
  removeTargetMember: GroupMember | null;
  removingMemberId: string | null;
  openMemberMenuId: string | null;
};

type UseGroupDialogsReturn = DialogState & {
  // Delete dialog actions
  openDeleteDialog: () => void;
  closeDeleteDialog: () => void;
  setDeleteConfirmationInput: (value: string) => void;
  setDeletingGroup: (value: boolean) => void;
  setDeleteError: (value: string | null) => void;

  // Remove member dialog actions
  openRemoveDialog: (member: GroupMember) => void;
  closeRemoveDialog: () => void;
  setRemovingMemberId: (value: string | null) => void;

  // Member menu actions
  openMemberMenu: (memberId: string) => void;
  closeMemberMenu: () => void;
};

export function useGroupDialogs(): UseGroupDialogsReturn {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = React.useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInputState] = React.useState('');
  const [deletingGroup, setDeletingGroup] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [removeTargetMember, setRemoveTargetMember] = React.useState<GroupMember | null>(null);
  const [removingMemberId, setRemovingMemberId] = React.useState<string | null>(null);
  const [openMemberMenuId, setOpenMemberMenuId] = React.useState<string | null>(null);

  const openDeleteDialog = React.useCallback(() => {
    setIsDeleteDialogOpen(true);
    setDeleteConfirmationInputState('');
    setDeleteError(null);
  }, []);

  const closeDeleteDialog = React.useCallback(() => {
    setIsDeleteDialogOpen(false);
    setDeleteConfirmationInputState('');
    setDeleteError(null);
    setDeletingGroup(false);
  }, []);

  const openRemoveDialog = React.useCallback((member: GroupMember) => {
    setRemoveTargetMember(member);
    setIsRemoveDialogOpen(true);
  }, []);

  const closeRemoveDialog = React.useCallback(() => {
    setIsRemoveDialogOpen(false);
    setRemoveTargetMember(null);
    setRemovingMemberId(null);
  }, []);

  const openMemberMenu = React.useCallback((memberId: string) => {
    setOpenMemberMenuId(memberId);
  }, []);

  const closeMemberMenu = React.useCallback(() => {
    setOpenMemberMenuId(null);
  }, []);

  return {
    isDeleteDialogOpen,
    isRemoveDialogOpen,
    deleteConfirmationInput,
    deletingGroup,
    deleteError,
    removeTargetMember,
    removingMemberId,
    openMemberMenuId,
    openDeleteDialog,
    closeDeleteDialog,
    setDeleteConfirmationInput: setDeleteConfirmationInputState,
    setDeletingGroup,
    setDeleteError,
    openRemoveDialog,
    closeRemoveDialog,
    setRemovingMemberId,
    openMemberMenu,
    closeMemberMenu,
  };
}
