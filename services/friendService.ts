import { supabase } from '../lib/supabase';
import type { User, EventGroup } from '../types';
import { fetchUsers } from './userService';

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

  const friendIds = friendships.map(f => f.friend_id);
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
  const { error } = await supabase
    .from('user_friends')
    .insert([
      { user_id: user.id, friend_id: friendId },
      { user_id: friendId, friend_id: user.id },
    ]);

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
 * Fetch user groups for the current user
 */
export async function fetchUserGroups(userId: string): Promise<EventGroup[]> {
  const { data: groups, error } = await supabase
    .from('user_groups')
    .select('group_type')
    .eq('user_id', userId);

  if (error || !groups) {
    console.error('Error fetching user groups:', error);
    return [];
  }

  return groups.map(g => g.group_type as EventGroup);
}

/**
 * Add user to a group
 */
export async function addUserToGroup(userId: string, groupType: EventGroup): Promise<boolean> {
  const { error } = await supabase
    .from('user_groups')
    .insert({
      user_id: userId,
      group_type: groupType,
    });

  return !error;
}

/**
 * Remove user from a group
 */
export async function removeUserFromGroup(userId: string, groupType: EventGroup): Promise<boolean> {
  const { error } = await supabase
    .from('user_groups')
    .delete()
    .eq('user_id', userId)
    .eq('group_type', groupType);

  return !error;
}

