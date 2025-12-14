import { supabase } from '../lib/supabase';
import type { User, Group } from '../lib/types';
import type { Database } from '../lib/database.types';
import { fetchUsers } from './userService';

type UserFriendRow = Database['public']['Tables']['user_friends']['Row'];
type UserFriendInsert = Database['public']['Tables']['user_friends']['Insert'];
type GroupRow = Database['public']['Tables']['groups']['Row'];
type GroupInsert = Database['public']['Tables']['groups']['Insert'];
type UserGroupRow = Database['public']['Tables']['user_groups']['Row'];
type UserGroupInsert = Database['public']['Tables']['user_groups']['Insert'];

/**
 * Fetch friends for the current user
 */
export async function fetchFriends(): Promise<User[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  const { data: friendships, error } = await supabase
    .from('user_friends')
    .select('friend_id')
    .eq('user_id', user.id);

  if (error || !friendships) {
    console.error('Error fetching friends:', error);
    return [];
  }

  const friendIds = (friendships as Pick<UserFriendRow, 'friend_id'>[]).map(f => f.friend_id);
  return fetchUsers(friendIds);
}

/**
 * Add a friend
 */
export async function addFriend(friendId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  // Add bidirectional friendship
  const inserts: UserFriendInsert[] = [
    { user_id: user.id, friend_id: friendId },
    { user_id: friendId, friend_id: user.id },
  ];
  const { error } = await (supabase
    .from('user_friends') as any)
    .insert(inserts);

  return !error;
}

/**
 * Remove a friend
 */
export async function removeFriend(friendId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  // Remove bidirectional friendship
  const { error } = await supabase
    .from('user_friends')
    .delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const insertData: GroupInsert = {
    name,
    created_by: user.id,
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
    user_id: user.id,
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

