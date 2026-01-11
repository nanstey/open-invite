import { supabase } from '../lib/supabase';
import type { User } from '../lib/types';

// In-memory cache for user profiles (per browser tab)
const userCache = new Map<string, Omit<User, 'isCurrentUser'>>();
const inFlightUser = new Map<string, Promise<User | null>>();

/**
 * Fetch a user profile by ID
 */
export async function fetchUser(userId: string, currentUserId?: string): Promise<User | null> {
  const cached = userCache.get(userId);
  if (cached) {
    return { ...cached, isCurrentUser: currentUserId === userId };
  }

  const existing = inFlightUser.get(userId);
  if (existing) {
    return existing;
  }

  const p = (async () => {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('Error fetching user:', error);
      return null;
    }

    const base = {
      id: profile.id,
      name: profile.name,
      avatar: profile.avatar,
    };

    userCache.set(userId, base);
    return { ...base, isCurrentUser: currentUserId === userId };
  })().finally(() => {
    inFlightUser.delete(userId);
  });

  inFlightUser.set(userId, p);
  return p;
}

/**
 * Fetch multiple users by IDs
 */
export async function fetchUsers(userIds: string[], currentUserId?: string): Promise<User[]> {
  if (userIds.length === 0) {
    return [];
  }

  const uniqueIds = [...new Set(userIds)];
  const missingIds = uniqueIds.filter(id => !userCache.has(id));

  if (missingIds.length > 0) {
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .in('id', missingIds);

    if (error || !profiles) {
      console.error('Error fetching users:', error);
    } else {
      profiles.forEach(profile => {
        userCache.set(profile.id, { id: profile.id, name: profile.name, avatar: profile.avatar });
      });
    }
  }

  // Preserve input order; omit ids that don't exist
  const result: User[] = [];
  userIds.forEach(id => {
    const cached = userCache.get(id);
    if (cached) {
      result.push({ ...cached, isCurrentUser: currentUserId === id });
    }
  });
  return result;
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

  // Invalidate cache for this user so a subsequent read reflects changes
  userCache.delete(userId);
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

  return profiles.map(profile => ({
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    isCurrentUser: false,
  }));
}

