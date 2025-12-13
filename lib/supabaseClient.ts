import { supabase } from './supabase';
import type { User } from '../types';

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

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    devLog('getCurrentUser: Starting...');
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      devLog('getCurrentUser: No auth user found:', error);
      return null;
    }

    devLog('getCurrentUser: Auth user found:', user.id, user.email);

    // Fetch user profile with timeout
    const profilePromise = supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Profile fetch timeout')), 2000);
    });

    let profileResult;
    try {
      profileResult = await Promise.race([profilePromise, timeoutPromise]);
    } catch (timeoutError) {
      devError('getCurrentUser: Profile fetch timed out or failed:', timeoutError);
      // If fetch fails, try to create profile
      const defaultName = user.email?.split('@')[0] || 'User';
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=random`;
      return {
        id: user.id,
        name: defaultName,
        avatar: defaultAvatar,
        isCurrentUser: true,
      };
    }

    const { data: profile, error: profileError } = profileResult as any;

    if (profileError) {
      devLog('getCurrentUser: Profile error:', profileError.code, profileError.message);
      // If profile doesn't exist, create a default one
      if (profileError.code === 'PGRST116' || profileError.message?.includes('No rows')) {
        devLog('getCurrentUser: Profile does not exist, creating default profile...');
        // Profile doesn't exist - create a default one
        const defaultName = user.email?.split('@')[0] || 'User';
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=random`;
        
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            name: defaultName,
            avatar: defaultAvatar,
          })
          .select()
          .single();

        if (insertError) {
          devError('getCurrentUser: Error creating default profile:', insertError);
          // Even if profile creation fails, return a basic user object
          return {
            id: user.id,
            name: defaultName,
            avatar: defaultAvatar,
            isCurrentUser: true,
          };
        }

        devLog('getCurrentUser: Profile created successfully:', newProfile);
        // Return the newly created profile
        return {
          id: user.id,
          name: newProfile.name,
          avatar: newProfile.avatar,
          isCurrentUser: true,
        };
      }
      devError('getCurrentUser: Unexpected profile error:', profileError);
      // Return a basic user object even on error
      const defaultName = user.email?.split('@')[0] || 'User';
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=random`;
      return {
        id: user.id,
        name: defaultName,
        avatar: defaultAvatar,
        isCurrentUser: true,
      };
    }

    if (!profile) {
      devLog('getCurrentUser: Profile is null');
      const defaultName = user.email?.split('@')[0] || 'User';
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=random`;
      return {
        id: user.id,
        name: defaultName,
        avatar: defaultAvatar,
        isCurrentUser: true,
      };
    }

    devLog('getCurrentUser: Profile found:', profile);
    return {
      id: user.id,
      name: profile.name,
      avatar: profile.avatar,
      isCurrentUser: true,
    };
  } catch (error) {
    devError('getCurrentUser: Error:', error);
    // Try to get at least the auth user info
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const defaultName = user.email?.split('@')[0] || 'User';
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=random`;
        return {
          id: user.id,
          name: defaultName,
          avatar: defaultAvatar,
          isCurrentUser: true,
        };
      }
    } catch (e) {
      devError('getCurrentUser: Could not get auth user:', e);
    }
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
    .insert({
      id: authData.user.id,
      name,
      avatar,
    });

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
          
          // Set a timeout for getCurrentUser to prevent hanging
          const userPromise = getCurrentUser();
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

