import { supabase } from '../lib/supabase';
import type { User } from '../types';

/**
 * Fetch a user profile by ID
 */
export async function fetchUser(userId: string): Promise<User | null> {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('Error fetching user:', error);
    return null;
  }

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isCurrentUser = currentUser?.id === userId;

  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    isCurrentUser,
  };
}

/**
 * Fetch multiple users by IDs
 */
export async function fetchUsers(userIds: string[]): Promise<User[]> {
  if (userIds.length === 0) {
    return [];
  }

  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('*')
    .in('id', userIds);

  if (error || !profiles) {
    console.error('Error fetching users:', error);
    return [];
  }

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const currentUserId = currentUser?.id;

  return profiles.map(profile => ({
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    isCurrentUser: currentUserId === profile.id,
  }));
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, updates: { name?: string; avatar?: string }): Promise<User | null> {
  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.avatar !== undefined) updateData.avatar = updates.avatar;

  const { error } = await supabase
    .from('user_profiles')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('Error updating user profile:', error);
    return null;
  }

  return fetchUser(userId);
}

/**
 * Search users by name
 */
export async function searchUsers(query: string, limit: number = 20): Promise<User[]> {
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('*')
    .ilike('name', `%${query}%`)
    .limit(limit);

  if (error || !profiles) {
    console.error('Error searching users:', error);
    return [];
  }

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const currentUserId = currentUser?.id;

  return profiles.map(profile => ({
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    isCurrentUser: currentUserId === profile.id,
  }));
}

