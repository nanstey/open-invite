import { supabase } from '../lib/supabase';
import type { User, Group, GroupRole } from '../lib/types';
import type { Database } from '../lib/database.types';
import { fetchUsers } from './userService';

type UserFriendRow = Database['public']['Tables']['user_friends']['Row'];
type UserFriendInsert = Database['public']['Tables']['user_friends']['Insert'];
type FriendRequestRow = Database['public']['Tables']['friend_requests']['Row'];
type GroupRow = Database['public']['Tables']['groups']['Row'];
type GroupInsert = Database['public']['Tables']['groups']['Insert'];
type GroupUpdate = Database['public']['Tables']['groups']['Update'];
type UserGroupRow = Database['public']['Tables']['user_groups']['Row'];
type UserGroupInsert = Database['public']['Tables']['user_groups']['Insert'];
type GroupMemberRequestRow = Database['public']['Tables']['group_member_requests']['Row'];

export type PendingFriendRequest = {
  id: string;
  requester: User;
  requesterId: string;
  recipientId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
};

export type OutgoingFriendRequest = {
  id: string;
  recipient: User;
  requesterId: string;
  recipientId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
};

export type GroupMembership = {
  group: Group;
  role: GroupRole;
};

export type GroupMember = {
  user: User;
  role: GroupRole;
};

export type GroupMemberRequest = {
  id: string;
  groupId: string;
  requester: User;
  requesterId: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  createdAt: string;
};

const DEFAULT_GROUP_SETTINGS = {
  allowMembersCreateEvents: true,
  allowMembersAddMembers: true,
  newMembersRequireAdminApproval: false,
};

/**
 * Fetch friends for the current user, sorted alphabetically by name
 */
export async function fetchFriends(): Promise<User[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return [];
  }

  const { data: friendships, error } = await supabase
    .from('user_friends')
    .select('friend_id')
    .eq('user_id', userId);

  if (error || !friendships) {
    console.error('Error fetching friends:', error);
    return [];
  }

  const friendIds = (friendships as Pick<UserFriendRow, 'friend_id'>[]).map(f => f.friend_id);
  const friends = await fetchUsers(friendIds, userId);
  
  // Sort alphabetically by name
  return friends.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fetch pending friend requests for the current user
 */
export async function fetchPendingFriendRequests(): Promise<PendingFriendRequest[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return [];
  }

  const { data: requests, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('recipient_id', userId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  if (error || !requests) {
    console.error('Error fetching friend requests:', error);
    return [];
  }

  const rows = requests as FriendRequestRow[];
  const requesterIds = rows.map((r) => r.requester_id);
  const requesters = await fetchUsers(requesterIds, userId);
  const requesterMap = new Map(requesters.map((u) => [u.id, u]));

  return rows
    .map((row) => {
      const requester = requesterMap.get(row.requester_id);
      if (!requester) return null;
      return {
        id: row.id,
        requester,
        requesterId: row.requester_id,
        recipientId: row.recipient_id,
        status: row.status as PendingFriendRequest['status'],
        createdAt: row.created_at,
      };
    })
    .filter((r): r is PendingFriendRequest => !!r);
}

/**
 * Fetch outgoing friend requests sent by the current user
 */
export async function fetchOutgoingFriendRequests(): Promise<OutgoingFriendRequest[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return [];
  }

  const { data: requests, error } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('requester_id', userId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  if (error || !requests) {
    console.error('Error fetching outgoing friend requests:', error);
    return [];
  }

  const rows = requests as FriendRequestRow[];
  const recipientIds = rows.map((r) => r.recipient_id);
  const recipients = await fetchUsers(recipientIds, userId);
  const recipientMap = new Map(recipients.map((u) => [u.id, u]));

  return rows
    .map((row) => {
      const recipient = recipientMap.get(row.recipient_id);
      if (!recipient) return null;
      return {
        id: row.id,
        recipient,
        requesterId: row.requester_id,
        recipientId: row.recipient_id,
        status: row.status as OutgoingFriendRequest['status'],
        createdAt: row.created_at,
      };
    })
    .filter((r): r is OutgoingFriendRequest => !!r);
}

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(recipientId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return false;
  }

  const { error } = await supabase
    .from('friend_requests')
    .insert({ requester_id: userId, recipient_id: recipientId });

  if (error) {
    console.error('Error sending friend request:', error);
    return false;
  }

  return true;
}

/**
 * Add a friend
 */
export async function addFriend(friendId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return false;
  }

  // Add bidirectional friendship
  const inserts: UserFriendInsert[] = [
    { user_id: userId, friend_id: friendId },
    { user_id: friendId, friend_id: userId },
  ];
  const { error } = await (supabase
    .from('user_friends') as any)
    .insert(inserts);

  return !error;
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(requestId: string, _requesterId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return false;
  }

  // Use the database function that handles both the bidirectional friendship
  // creation and status update atomically with SECURITY DEFINER
  const { error } = await supabase.rpc('accept_friend_request', {
    request_id: requestId,
  });

  if (error) {
    console.error('Error accepting friend request:', error);
    return false;
  }

  return true;
}

/**
 * Decline a friend request
 */
export async function declineFriendRequest(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ status: 'DECLINED' })
    .eq('id', requestId);

  if (error) {
    console.error('Error declining friend request:', error);
  }

  return !error;
}

/**
 * Cancel an outgoing friend request (delete it)
 */
export async function cancelFriendRequest(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('friend_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    console.error('Error canceling friend request:', error);
  }

  return !error;
}

/**
 * Remove a friend
 */
export async function removeFriend(friendId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return false;
  }

  // Remove bidirectional friendship
  const { error: friendError } = await supabase
    .from('user_friends')
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

  if (friendError) {
    console.error('Error removing friendship:', friendError);
    return false;
  }

  // Also clean up any friend request records between the two users
  // This allows either user to send a new friend request in the future
  const { error: requestError } = await supabase
    .from('friend_requests')
    .delete()
    .or(`and(requester_id.eq.${userId},recipient_id.eq.${friendId}),and(requester_id.eq.${friendId},recipient_id.eq.${userId})`);

  if (requestError) {
    console.error('Error cleaning up friend requests:', requestError);
    // Don't fail the operation if cleanup fails - friendship was already removed
  }

  return true;
}

/**
 * Fetch groups that the user can access (groups they created or are members of)
 */
export async function fetchGroups(userId: string): Promise<Group[]> {
  const { data: groups, error } = await supabase
    .from('groups')
    .select('*')
    .or(`created_by.eq.${userId},id.in.(select group_id from user_groups where user_id.eq.${userId})`)
    .is('deleted_at', null)
    .order('name', { ascending: true });

  if (error || !groups) {
    console.error('Error fetching groups:', error);
    return [];
  }

  return (groups as GroupRow[]).map(g => ({
    id: g.id,
    name: g.name,
    createdBy: g.created_by,
    allowMembersCreateEvents: g.allow_members_create_events ?? DEFAULT_GROUP_SETTINGS.allowMembersCreateEvents,
    allowMembersAddMembers: g.allow_members_add_members ?? DEFAULT_GROUP_SETTINGS.allowMembersAddMembers,
    newMembersRequireAdminApproval:
      g.new_members_require_admin_approval ?? DEFAULT_GROUP_SETTINGS.newMembersRequireAdminApproval,
    deletedAt: g.deleted_at || undefined,
  }));
}

/**
 * Fetch user groups for the current user (groups they are members of)
 */
export async function fetchUserGroups(userId: string): Promise<Group[]> {
  const { data: userGroups, error } = await supabase
    .from('user_groups')
    .select('group_id, groups(*)')
    .eq('user_id', userId);

  if (error || !userGroups) {
    console.error('Error fetching user groups:', error);
    return [];
  }

  type UserGroupWithGroup = Pick<UserGroupRow, 'group_id'> & {
    groups: GroupRow | null;
  };

  return (userGroups as UserGroupWithGroup[])
    .filter(ug => ug.groups && !ug.groups.deleted_at)
    .map(ug => ({
      id: ug.groups!.id,
      name: ug.groups!.name,
      createdBy: ug.groups!.created_by,
      allowMembersCreateEvents:
        ug.groups!.allow_members_create_events ?? DEFAULT_GROUP_SETTINGS.allowMembersCreateEvents,
      allowMembersAddMembers: ug.groups!.allow_members_add_members ?? DEFAULT_GROUP_SETTINGS.allowMembersAddMembers,
      newMembersRequireAdminApproval:
        ug.groups!.new_members_require_admin_approval ?? DEFAULT_GROUP_SETTINGS.newMembersRequireAdminApproval,
      deletedAt: ug.groups!.deleted_at || undefined,
    }));
}

/**
 * Create a new group
 */
export async function createGroup(
  name: string,
  settings: {
    allowMembersCreateEvents: boolean;
    allowMembersAddMembers: boolean;
    newMembersRequireAdminApproval: boolean;
  } = DEFAULT_GROUP_SETTINGS,
): Promise<Group | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const insertData: GroupInsert = {
    name,
    created_by: userId,
    allow_members_create_events: settings.allowMembersCreateEvents,
    allow_members_add_members: settings.allowMembersAddMembers,
    new_members_require_admin_approval: settings.newMembersRequireAdminApproval,
  };
  const { data: group, error } = await (supabase
    .from('groups') as any)
    .insert(insertData)
    .select()
    .single();

  if (error || !group) {
    console.error('Error creating group:', error);
    return null;
  }

  // Add creator as admin member
  const userGroupInsert: UserGroupInsert = {
    user_id: userId,
    group_id: (group as GroupRow).id,
    role: 'ADMIN',
  };
  await (supabase.from('user_groups') as any).insert(userGroupInsert);

  const groupRow = group as GroupRow;
  return {
    id: groupRow.id,
    name: groupRow.name,
    createdBy: groupRow.created_by,
    allowMembersCreateEvents:
      groupRow.allow_members_create_events ?? settings.allowMembersCreateEvents,
    allowMembersAddMembers: groupRow.allow_members_add_members ?? settings.allowMembersAddMembers,
    newMembersRequireAdminApproval:
      groupRow.new_members_require_admin_approval ?? settings.newMembersRequireAdminApproval,
    deletedAt: groupRow.deleted_at || undefined,
  };
}

export async function updateGroup(
  groupId: string,
  updates: Partial<{
    name: string;
    allowMembersCreateEvents: boolean;
    allowMembersAddMembers: boolean;
    newMembersRequireAdminApproval: boolean;
  }>,
): Promise<Group | null> {
  const payload: GroupUpdate = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.allowMembersCreateEvents !== undefined) {
    payload.allow_members_create_events = updates.allowMembersCreateEvents;
  }
  if (updates.allowMembersAddMembers !== undefined) {
    payload.allow_members_add_members = updates.allowMembersAddMembers;
  }
  if (updates.newMembersRequireAdminApproval !== undefined) {
    payload.new_members_require_admin_approval = updates.newMembersRequireAdminApproval;
  }

  const { data: updated, error } = await (supabase
    .from('groups') as any)
    .update(payload)
    .eq('id', groupId)
    .select()
    .single();

  if (error || !updated) {
    console.error('Error updating group:', error);
    return null;
  }

  const row = updated as GroupRow;
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    allowMembersCreateEvents:
      row.allow_members_create_events ?? DEFAULT_GROUP_SETTINGS.allowMembersCreateEvents,
    allowMembersAddMembers: row.allow_members_add_members ?? DEFAULT_GROUP_SETTINGS.allowMembersAddMembers,
    newMembersRequireAdminApproval:
      row.new_members_require_admin_approval ?? DEFAULT_GROUP_SETTINGS.newMembersRequireAdminApproval,
    deletedAt: row.deleted_at || undefined,
  };
}

/**
 * Add user to a group
 */
export async function addUserToGroup(userId: string, groupId: string): Promise<boolean> {
  const insertData: UserGroupInsert = {
    user_id: userId,
    group_id: groupId,
    role: 'MEMBER',
  };
  const { error } = await (supabase
    .from('user_groups') as any)
    .insert(insertData);

  return !error;
}

/**
 * Remove user from a group
 */
export async function removeUserFromGroup(userId: string, groupId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_groups')
    .delete()
    .eq('user_id', userId)
    .eq('group_id', groupId);

  return !error;
}

/**
 * Fetch group members
 */
export async function fetchGroupMembers(groupId: string): Promise<User[]> {
  const { data: userGroups, error } = await supabase
    .from('user_groups')
    .select('user_id')
    .eq('group_id', groupId);

  if (error || !userGroups) {
    console.error('Error fetching group members:', error);
    return [];
  }

  const userIds = (userGroups as Pick<UserGroupRow, 'user_id'>[]).map(ug => ug.user_id);
  return fetchUsers(userIds);
}

export async function fetchGroupMembershipsForCurrentUser(): Promise<GroupMembership[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return [];
  }

  const { data: userGroups, error } = await supabase
    .from('user_groups')
    .select('role, groups(*)')
    .eq('user_id', userId);

  if (error || !userGroups) {
    console.error('Error fetching group memberships:', error);
    return [];
  }

  type UserGroupWithGroup = Pick<UserGroupRow, 'role'> & {
    groups: GroupRow | null;
  };

  return (userGroups as UserGroupWithGroup[])
    .filter((ug) => ug.groups && !ug.groups.deleted_at)
    .map((ug) => ({
      role: (ug.role ?? 'MEMBER') as GroupRole,
      group: {
        id: ug.groups!.id,
        name: ug.groups!.name,
        createdBy: ug.groups!.created_by,
        allowMembersCreateEvents:
          ug.groups!.allow_members_create_events ?? DEFAULT_GROUP_SETTINGS.allowMembersCreateEvents,
        allowMembersAddMembers:
          ug.groups!.allow_members_add_members ?? DEFAULT_GROUP_SETTINGS.allowMembersAddMembers,
        newMembersRequireAdminApproval:
          ug.groups!.new_members_require_admin_approval ?? DEFAULT_GROUP_SETTINGS.newMembersRequireAdminApproval,
        deletedAt: ug.groups!.deleted_at || undefined,
      },
    }));
}

export async function fetchGroupMembersWithRoles(groupId: string): Promise<GroupMember[]> {
  const { data: userGroups, error } = await supabase
    .from('user_groups')
    .select('user_id, role')
    .eq('group_id', groupId);

  if (error || !userGroups) {
    console.error('Error fetching group members:', error);
    return [];
  }

  const rows = userGroups as Pick<UserGroupRow, 'user_id' | 'role'>[];
  const userIds = rows.map((row) => row.user_id);
  const users = await fetchUsers(userIds);
  const userMap = new Map(users.map((u) => [u.id, u]));

  return rows
    .map((row) => {
      const user = userMap.get(row.user_id);
      if (!user) return null;
      return { user, role: (row.role ?? 'MEMBER') as GroupRole };
    })
    .filter((row): row is GroupMember => !!row);
}

export async function updateGroupMemberRole(groupId: string, userId: string, role: GroupRole): Promise<boolean> {
  const { error } = await supabase
    .from('user_groups')
    .update({ role })
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating group member role:', error);
  }

  return !error;
}

export async function createGroupMemberRequest(groupId: string, requesterId: string): Promise<boolean> {
  const { error } = await supabase
    .from('group_member_requests')
    .insert({ group_id: groupId, requester_id: requesterId, status: 'PENDING' });

  if (error) {
    console.error('Error creating group member request:', error);
  }

  return !error;
}

export async function fetchGroupMemberRequests(groupId: string): Promise<GroupMemberRequest[]> {
  const { data: requests, error } = await supabase
    .from('group_member_requests')
    .select('*')
    .eq('group_id', groupId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false });

  if (error || !requests) {
    console.error('Error fetching group member requests:', error);
    return [];
  }

  const rows = requests as GroupMemberRequestRow[];
  const requesterIds = rows.map((row) => row.requester_id);
  const requesters = await fetchUsers(requesterIds);
  const requesterMap = new Map(requesters.map((u) => [u.id, u]));

  return rows
    .map((row) => {
      const requester = requesterMap.get(row.requester_id);
      if (!requester) return null;
      return {
        id: row.id,
        groupId: row.group_id,
        requester,
        requesterId: row.requester_id,
        status: row.status as GroupMemberRequest['status'],
        createdAt: row.created_at,
      };
    })
    .filter((row): row is GroupMemberRequest => !!row);
}

export async function approveGroupMemberRequest(requestId: string, userId: string, groupId: string): Promise<boolean> {
  const { error: updateError } = await supabase
    .from('group_member_requests')
    .update({ status: 'APPROVED' })
    .eq('id', requestId);

  if (updateError) {
    console.error('Error approving group member request:', updateError);
    return false;
  }

  return addUserToGroup(userId, groupId);
}

export async function denyGroupMemberRequest(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('group_member_requests')
    .update({ status: 'DENIED' })
    .eq('id', requestId);

  if (error) {
    console.error('Error denying group member request:', error);
  }

  return !error;
}
