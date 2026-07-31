import { supabase } from '../lib/supabase';
import {
  type ProfileVisibility,
  SOCIAL_PLATFORMS,
  type SocialLinks,
  type User,
} from '../lib/types';

// In-memory cache for user profiles (per browser tab)
const userCache = new Map<string, Omit<User, 'isCurrentUser'>>();
const inFlightUser = new Map<string, Promise<User | null>>();

// Avatar upload limits
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

type ProfileRow = {
  id: string;
  name: string;
  avatar: string;
  username?: string | null;
  bio?: string | null;
  location?: string | null;
  pronouns?: string | null;
  social_links?: unknown;
  profile_visibility?: string | null;
};

/** Map a raw `user_profiles` row into the app's cacheable User shape. */
function mapProfileRow(profile: ProfileRow): Omit<User, 'isCurrentUser'> {
  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    username: profile.username ?? undefined,
    bio: profile.bio ?? undefined,
    location: profile.location ?? undefined,
    pronouns: profile.pronouns ?? undefined,
    socialLinks: sanitizeSocialLinks(profile.social_links),
    profileVisibility: (profile.profile_visibility as ProfileVisibility) ?? undefined,
  };
}

/** Keep only whitelisted, non-empty social link entries. */
export function sanitizeSocialLinks(input: unknown): SocialLinks | undefined {
  if (!input || typeof input !== 'object') {
    return undefined;
  }
  const source = input as Record<string, unknown>;
  const result: SocialLinks = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const value = source[platform];
    if (typeof value === 'string' && value.trim()) {
      result[platform] = value.trim();
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Validate a desired username. Returns an error message, or null if valid.
 */
export function validateUsername(username: string): string | null {
  const value = username.trim();
  if (value.length < 3 || value.length > 30) {
    return 'Username must be 3–30 characters';
  }
  if (!/^[a-z0-9_]+$/.test(value)) {
    return 'Use only lowercase letters, numbers, and underscores';
  }
  return null;
}

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

    const base = mapProfileRow(profile as ProfileRow);

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
        userCache.set(profile.id, mapProfileRow(profile as ProfileRow));
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

export interface ProfileUpdate {
  name?: string;
  avatar?: string;
  username?: string;
  bio?: string;
  location?: string;
  pronouns?: string;
  socialLinks?: SocialLinks;
  profileVisibility?: ProfileVisibility;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<User | null> {
  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
  if (updates.username !== undefined) updateData.username = updates.username.trim().toLowerCase();
  if (updates.bio !== undefined) updateData.bio = updates.bio;
  if (updates.location !== undefined) updateData.location = updates.location;
  if (updates.pronouns !== undefined) updateData.pronouns = updates.pronouns;
  if (updates.socialLinks !== undefined) {
    updateData.social_links = sanitizeSocialLinks(updates.socialLinks) ?? {};
  }
  if (updates.profileVisibility !== undefined) {
    updateData.profile_visibility = updates.profileVisibility;
  }

  const { error } = await supabase.from('user_profiles').update(updateData).eq('id', userId);

  if (error) {
    console.error('Error updating user profile:', error);
    return null;
  }

  // Invalidate cache for this user so a subsequent read reflects changes
  userCache.delete(userId);
  return fetchUser(userId);
}

/**
 * Check whether a username is available (case-insensitive).
 * Optionally exclude a user id (so a user keeping their own username reads as
 * available).
 */
export async function isUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<boolean> {
  const normalized = username.trim().toLowerCase();
  if (validateUsername(normalized)) {
    return false;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('username', normalized)
    .limit(1);

  if (error) {
    console.error('Error checking username availability:', error);
    return false;
  }

  if (!data || data.length === 0) {
    return true;
  }

  return excludeUserId !== undefined && data[0].id === excludeUserId;
}

/**
 * Upload an avatar image to the `avatars` bucket and return its public URL.
 * Returns null on validation failure or upload error.
 */
export async function uploadAvatar(file: File, userId: string): Promise<string | null> {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    console.error('Unsupported avatar type:', file.type);
    return null;
  }
  if (file.size > MAX_AVATAR_BYTES) {
    console.error('Avatar exceeds size limit:', file.size);
    return null;
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) {
    console.error('Error uploading avatar:', error);
    return null;
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
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
    ...mapProfileRow(profile as ProfileRow),
    isCurrentUser: false,
  }));
}
