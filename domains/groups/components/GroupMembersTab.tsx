import type { RefObject } from 'react';
import { useClickOutside } from '../../../lib/hooks/useClickOutside';
import type { Group } from '../../../lib/types';
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
} from '../../../lib/ui/9ui/combobox';
import { UserAvatar } from '../../../lib/ui/components/UserAvatar';
import type { GroupMember } from '../../../services/groupService';
import { GroupMemberActionsMenu } from './GroupMemberActionsMenu';

type GroupMembersTabProps = {
  selectedGroup: Group;
  members: GroupMember[];
  friends: { id: string; name: string; avatar: string }[];
  canAddMembers: boolean;
  isAdmin: boolean;
  userId: string | undefined;
  loadingMembers: boolean;
  addingMembers: boolean;
  selectedFriendIds: string[];
  memberPickerValue: { id: string; name: string; avatar: string } | null;
  membersMessage: string | null;
  removingMemberId: string | null;
  openMemberMenuId: string | null;
  onAddFriend: (friend: { id: string; name: string; avatar: string } | null) => void;
  onRemoveSelectedFriend: (friendId: string) => void;
  onHandleAddMembers: () => void;
  onOpenRemoveMemberDialog: (member: GroupMember) => void;
  onOpenMemberMenu: (memberId: string) => void;
  onCloseMemberMenu: () => void;
  memberMenuRef: RefObject<HTMLDivElement>;
};

export function GroupMembersTab({
  selectedGroup,
  members,
  friends,
  canAddMembers,
  loadingMembers,
  addingMembers,
  selectedFriendIds,
  memberPickerValue,
  membersMessage,
  removingMemberId,
  openMemberMenuId,
  onAddFriend,
  onRemoveSelectedFriend,
  onHandleAddMembers,
  onOpenRemoveMemberDialog,
  onOpenMemberMenu,
  onCloseMemberMenu,
  memberMenuRef,
}: GroupMembersTabProps) {
  const memberIds = new Set(members.map(member => member.id));
  const addableFriends = friends.filter(friend => !memberIds.has(friend.id));
  const friendsById = new Map(friends.map(friend => [friend.id, friend] as const));
  const selectedFriends = selectedFriendIds
    .map(friendId => friendsById.get(friendId))
    .filter((friend): friend is { id: string; name: string; avatar: string } => !!friend);
  const selectedIds = new Set(selectedFriendIds);
  const selectableFriends = addableFriends.filter(friend => !selectedIds.has(friend.id));

  useClickOutside(memberMenuRef, onCloseMemberMenu, openMemberMenuId !== null);

  return (
    <div className="space-y-4">
      {canAddMembers ? (
        <div className="flex gap-2">
          <Combobox<{ id: string; name: string; avatar: string }>
            items={selectableFriends}
            value={memberPickerValue}
            onValueChange={onAddFriend}
            itemToString={friend => friend?.name ?? ''}
            className="flex-1"
          >
            <ComboboxInput
              disabled={addableFriends.length === 0 || addingMembers}
              showClear={false}
              placeholder={
                addableFriends.length === 0 ? 'No friends to add' : 'Add friends to this group...'
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
                            onRemoveSelectedFriend(friend.id);
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
            onClick={onHandleAddMembers}
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

      {loadingMembers ? (
        <div className="text-sm text-slate-400">Loading members...</div>
      ) : (
        <div className="space-y-3">
          {members.map(member => {
            const isCreatorRow = member.id === selectedGroup.createdBy;
            const isSelfRow = member.id === selectedGroup.createdBy;
            const memberRole = isCreatorRow ? 'OWNER' : member.role === 'ADMIN' ? 'ADMIN' : null;
            const canRemoveMember = !isCreatorRow && !isSelfRow;
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
                    <span className="text-xs text-slate-300 tracking-wide">{memberRole}</span>
                  ) : null}
                  {canRemoveMember ? (
                    <GroupMemberActionsMenu
                      member={member}
                      isOpen={openMemberMenuId === member.id}
                      isRemoving={isRemovingThisMember}
                      onOpen={() => onOpenMemberMenu(member.id)}
                      onClose={onCloseMemberMenu}
                      onRemove={() => onOpenRemoveMemberDialog(member)}
                      menuRef={memberMenuRef}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
