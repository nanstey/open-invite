import { supabase } from '../lib/supabase';
import type { User, Group } from '../lib/types';
import type { Database } from '../lib/database.types';
import { fetchUsers } from './userService';

type UserFriendRow = Database['public']['Tables']['user_friends']['Row'];
type UserFriendInsert = Database['public']['Tables']['user_friends']['Insert'];
type FriendRequestRow = Database['public']['Tables']['friend_requests']['Row'];
type GroupRow = Database['public']['Tables']['groups']['Row'];
type GroupInsert = Database['public']['Tables']['groups']['Insert'];
type UserGroupRow = Database['public']['Tables']['user_groups']['Row'];
type UserGroupInsert = Database['public']['Tables']['user_groups']['Insert'];

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
  const { error } = await supabase
    .from('user_friends')
    .delete()
    .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);

  return !error;
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
    isOpen: g.is_open,
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
      isOpen: ug.groups!.is_open,
      deletedAt: ug.groups!.deleted_at || undefined,
    }));
}

/**
 * Create a new group
 */
export async function createGroup(name: string, isOpen: boolean): Promise<Group | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const insertData: GroupInsert = {
    name,
    created_by: userId,
    is_open: isOpen,
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
    isOpen: groupRow.is_open,
    deletedAt: groupRow.deleted_at || undefined,
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
