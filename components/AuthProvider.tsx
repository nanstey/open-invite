import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChange, getCurrentUser } from '../lib/supabaseClient';
import type { User } from '../types';

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

  useEffect(() => {
    // Check initial session
    getCurrentUser().then(user => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { signIn } = await import('../lib/supabaseClient');
    const result = await signIn(email, password);
    if (result.error) {
      return { error: result.error };
    }
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    return null;
  };

  const signUp = async (email: string, password: string, name: string, avatar: string) => {
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

