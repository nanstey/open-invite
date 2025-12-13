import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChange, getCurrentUser } from '../lib/supabaseClient';
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

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any } | null>;
  signUp: (email: string, password: string, name: string, avatar: string) => Promise<{ error: any } | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const useSupabase = () => {
    return (import.meta as any).env?.VITE_USE_SUPABASE === 'true' && 
           (import.meta as any).env?.VITE_SUPABASE_URL && 
           (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  };

  useEffect(() => {
    const isSupabaseEnabled = useSupabase();
    
    // Safety timeout to ensure loading never gets stuck
    const timeoutId = setTimeout(() => {
      devWarn('AuthProvider: Loading timeout, forcing loading to false');
      setLoading(false);
    }, 5000);

    // Only initialize auth if Supabase is enabled
    if (!isSupabaseEnabled) {
      clearTimeout(timeoutId);
      setLoading(false);
      return;
    }

    let subscription: { unsubscribe: () => void } | null = null;
    let loadingResolved = false;

    const resolveLoading = () => {
      if (!loadingResolved) {
        loadingResolved = true;
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    // Check initial session
    getCurrentUser()
      .then(user => {
        setUser(user);
        resolveLoading();
      })
      .catch((error) => {
        devError('Error getting current user:', error);
        resolveLoading();
      });

    // Listen for auth state changes
    try {
      const result = onAuthStateChange((user) => {
        devLog('Auth state change callback called with user:', user?.id);
        setUser(user);
        // Always resolve loading when auth state changes
        if (!loadingResolved) {
          resolveLoading();
        }
      });
      subscription = result.data.subscription;
    } catch (error) {
      devError('Error setting up auth state listener:', error);
      resolveLoading();
    }

    return () => {
      clearTimeout(timeoutId);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!useSupabase()) {
      return { error: { message: 'Supabase is not enabled' } };
    }
    devLog('Signing in...');
    const { signIn, getSession } = await import('../lib/supabaseClient');
    const result = await signIn(email, password);
    if (result.error) {
      devError('Sign in error:', result.error);
      return { error: result.error };
    }
    devLog('Sign in successful, result:', result.data);
    
    // Wait a moment for session to be established
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Verify session exists
    const { data: sessionData } = await getSession();
    devLog('Session after sign in:', sessionData?.session?.user?.id);
    
    // The auth state change listener will update the user automatically
    // But we also try to fetch immediately for faster feedback
    try {
      const currentUser = await getCurrentUser();
      devLog('Got user after sign in:', currentUser);
      if (currentUser) {
        setUser(currentUser);
        setLoading(false);
      } else {
        devWarn('getCurrentUser returned null after sign in, will wait for auth state change');
        // Don't set loading to false here - let the auth state listener handle it
      }
    } catch (error) {
      devError('Error fetching user after sign in:', error);
      // Auth state listener will handle it
    }
    return null;
  };

  const signUp = async (email: string, password: string, name: string, avatar: string) => {
    if (!useSupabase()) {
      return { error: { message: 'Supabase is not enabled' } };
    }
    const { signUp } = await import('../lib/supabaseClient');
    const result = await signUp(email, password, name, avatar);
    if (result.error) {
      return { error: result.error };
    }
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    return null;
  };

  const signOut = async () => {
    if (!useSupabase()) {
      return;
    }
    const { signOut } = await import('../lib/supabaseClient');
    await signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

