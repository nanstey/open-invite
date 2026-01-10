import { supabase } from './supabase';
import type { User } from './types';

const isDev = (import.meta as any).env?.DEV ?? false;
const devLog = (...args: any[]) => {
  if (isDev) console.log(...args);
};
const devWarn = (...args: any[]) => {
  if (isDev) console.warn(...args);
};
const devError = (...args: any[]) => {
  if (isDev) console.error(...args);
};

// Dedupe profile loads across rapid auth events (INITIAL_SESSION + SIGNED_IN, etc.)
const inFlightCurrentUser = new Map<string, Promise<User | null>>();

type AuthSessionUserLike = {
  id?: string;
  email?: string;
  user_metadata?: Record<string, any>;
};

const PROFILE_FETCH_TIMEOUT_MS = 2000;

function getDefaultProfileFields(authUser: AuthSessionUserLike): { name: string; avatar: string } {
  const oauthName = authUser.user_metadata?.full_name || authUser.user_metadata?.name;
  const oauthAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
  const defaultName = oauthName || authUser.email?.split('@')[0] || 'User';
  const defaultAvatar =
    oauthAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=random`;
  return { name: defaultName, avatar: defaultAvatar };
}

function buildDefaultUser(authUser: AuthSessionUserLike): User | null {
  if (!authUser.id) return null;
  const { name, avatar } = getDefaultProfileFields(authUser);
  return { id: authUser.id, name, avatar, isCurrentUser: true };
}

function isNoRowsProfileError(profileError: any): boolean {
  return profileError?.code === 'PGRST116' || profileError?.message?.includes('No rows');
}

async function fetchUserProfileWithTimeout(userId: string): Promise<{ profile: any; profileError: any }> {
  const profilePromise = supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Profile fetch timeout')), PROFILE_FETCH_TIMEOUT_MS);
  });

  const profileResult = (await Promise.race([profilePromise, timeoutPromise])) as any;
  const { data: profile, error: profileError } = profileResult ?? {};
  return { profile, profileError };
}

async function createDefaultUserProfile(userId: string, fields: { name: string; avatar: string }): Promise<any | null> {
  const { data: newProfile, error: insertError } = await supabase
    .from('user_profiles')
    // Our Supabase client isn't strongly typed with Database here, so insert typing defaults to never.
    // Cast to any to avoid TS false positives (runtime shape is correct).
    .insert({ id: userId, name: fields.name, avatar: fields.avatar } as any)
    .select()
    .single();

  if (insertError || !newProfile) {
    devError('getCurrentUser: Error creating default profile:', insertError);
    return null;
  }

  return newProfile;
}

function buildUserFromProfile(userId: string, profile: any): User {
  return {
    id: userId,
    name: profile.name,
    avatar: profile.avatar,
    isCurrentUser: true,
  };
}

async function getUserFromAuthSessionUser(authUser: AuthSessionUserLike): Promise<User | null> {
  if (!authUser?.id) return null;

  const cached = inFlightCurrentUser.get(authUser.id);
  if (cached) return cached;

  const p = (async () => {
    try {
      const { profile, profileError } = await fetchUserProfileWithTimeout(authUser.id);

      if (profileError) {
        devLog('getCurrentUser: Profile error:', profileError.code, profileError.message);

        if (isNoRowsProfileError(profileError)) {
          devLog('getCurrentUser: Profile does not exist, creating default profile...');
          const fields = getDefaultProfileFields(authUser);
          const createdProfile = await createDefaultUserProfile(authUser.id, fields);
          if (!createdProfile) {
            return buildDefaultUser(authUser);
          }
          devLog('getCurrentUser: Profile created successfully:', createdProfile);
          return buildUserFromProfile(authUser.id, createdProfile);
        }

        devError('getCurrentUser: Unexpected profile error:', profileError);
        return buildDefaultUser(authUser);
      }

      if (!profile) {
        devLog('getCurrentUser: Profile is null');
        return buildDefaultUser(authUser);
      }

      devLog('getCurrentUser: Profile found:', profile);
      return buildUserFromProfile(authUser.id, profile);
    } catch (timeoutError) {
      devError('getCurrentUser: Profile fetch timed out or failed:', timeoutError);
      return buildDefaultUser(authUser);
    }
  })().finally(() => {
    inFlightCurrentUser.delete(authUser.id);
  });

  inFlightCurrentUser.set(authUser.id, p);
  return p;
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    devLog('getCurrentUser: Starting...');
    // Prefer session (no network) vs auth.getUser() (network)
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) {
      devLog('getCurrentUser: No session user found:', error);
      return null;
    }

    devLog('getCurrentUser: Session user found:', session.user.id, session.user.email);
    return await getUserFromAuthSessionUser(session.user);
  } catch (error) {
    devError('getCurrentUser: Error:', error);
    return null;
  }
}

/**
 * Sign up a new user
 */
export async function signUp(email: string, password: string, name: string, avatar: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { error: authError };
  }

  // Create user profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({ id: authData.user.id, name, avatar } as any);

  if (profileError) {
    return { error: profileError };
  }

  return { user: authData.user };
}

/**
 * Sign in an existing user
 */
export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const redirectUrl = `${window.location.origin}/auth/callback`;
  devLog('Signing in with Google, redirect URL:', redirectUrl);
  
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  });
}

/**
 * Sign out the current user
 */
export async function signOut() {
  return await supabase.auth.signOut();
}

/**
 * Get the current session
 */
export async function getSession() {
  return await supabase.auth.getSession();
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  try {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      devLog('Auth state changed:', event, session?.user?.id, 'has session:', !!session);
      if (session?.user) {
        try {
          // Add a small delay to ensure the session is fully established
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Set a timeout for profile fetch to prevent hanging
          const userPromise = getUserFromAuthSessionUser(session.user);
          const timeoutPromise = new Promise<User | null>((resolve) => {
            setTimeout(() => {
              devWarn('getCurrentUser timeout, calling callback with null');
              resolve(null);
            }, 3000);
          });
          
          const user = await Promise.race([userPromise, timeoutPromise]);
          devLog('Got user from getCurrentUser:', user?.id, user?.name);
          callback(user);
        } catch (error) {
          devError('Error in onAuthStateChange callback:', error);
          // Still call callback with null if getCurrentUser fails
          callback(null);
        }
      } else {
        devLog('No session, calling callback with null');
        callback(null);
      }
    });
  } catch (error) {
    devError('Error in onAuthStateChange:', error);
    // Return a dummy subscription object if there's an error
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    };
  }
}

