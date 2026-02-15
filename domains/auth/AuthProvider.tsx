import { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChange, getCurrentUser } from '../../lib/supabaseClient';
import type { User } from '../../lib/types';

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
  signInWithGoogle: (redirectPath?: string) => Promise<{ error: any } | null>;
  signOut: () => Promise<void>;
}

export type { AuthContextType };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout to ensure loading never gets stuck
    const timeoutId = setTimeout(() => {
      devWarn('AuthProvider: Loading timeout, forcing loading to false');
      setLoading(false);
    }, 5000);

    let subscription: { unsubscribe: () => void } | null = null;
    let loadingResolved = false;

    const resolveLoading = () => {
      if (!loadingResolved) {
        loadingResolved = true;
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

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
    devLog('Signing in...');
    const { signIn } = await import('../../lib/supabaseClient');
    const result = await signIn(email, password);
    if (result.error) {
      devError('Sign in error:', result.error);
      return { error: result.error };
    }
    devLog('Sign in successful, result:', result.data);
    return null;
  };

  const signUp = async (email: string, password: string, name: string, avatar: string) => {
    const { signUp } = await import('../../lib/supabaseClient');
    const result = await signUp(email, password, name, avatar);
    if (result.error) {
      return { error: result.error };
    }
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    return null;
  };

  const signInWithGoogle = async (redirectPath?: string) => {
    devLog('Signing in with Google...');
    const { signInWithGoogle } = await import('../../lib/supabaseClient');
    const result = await signInWithGoogle(redirectPath);
    if (result.error) {
      devError('Google sign in error:', result.error);
      return { error: result.error };
    }
    // OAuth redirect will happen, so we don't need to update user state here
    // The auth state change listener will handle it when the user returns
    return null;
  };

  const signOut = async () => {
    const { signOut } = await import('../../lib/supabaseClient');
    await signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
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

