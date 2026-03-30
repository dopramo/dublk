'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { showToastGlobal } from '@/components/ui/Toast';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  showAuthModal: boolean;
  authModalCallback: (() => void) | null;
  openAuthModal: (callback?: () => void) => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isAdmin: false,
  showAuthModal: false,
  authModalCallback: null,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalCallback, setAuthModalCallback] = useState<(() => void) | null>(null);
  const previousUserRef = useRef<User | null>(null);
  const initialLoadRef = useRef(true);

  const supabase = createClient();

  const checkAdmin = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      setIsAdmin(data?.is_admin || false);
    } catch {
      setIsAdmin(false);
    }
  }, [supabase]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      previousUserRef.current = session?.user ?? null;
      if (session?.user) {
        await checkAdmin(session.user.id);
      }
      setIsLoading(false);
      initialLoadRef.current = false;
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const prevUser = previousUserRef.current;
        const newUser = session?.user ?? null;

        setSession(session);
        setUser(newUser);

        if (newUser) {
          await checkAdmin(newUser.id);
        } else {
          setIsAdmin(false);
        }

        setIsLoading(false);

        // Show toast notifications for auth events (only after initial load)
        // Uses the global toast function to avoid provider ordering issues
        if (!initialLoadRef.current) {
          if (!prevUser && newUser) {
            // User just signed in
            const name = newUser.user_metadata?.full_name || newUser.email?.split('@')[0] || '';
            showToastGlobal(`Welcome${name ? `, ${name}` : ''}! You're signed in.`, 'success');
          } else if (prevUser && !newUser) {
            // User just signed out
            showToastGlobal('You have been signed out successfully.', 'info');
          }
        }

        previousUserRef.current = newUser;
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, checkAdmin]);

  // When user logs in and there's a pending callback, execute it
  useEffect(() => {
    if (user && authModalCallback) {
      setShowAuthModal(false);
      authModalCallback();
      setAuthModalCallback(null);
    }
  }, [user, authModalCallback]);

  const openAuthModal = useCallback((callback?: () => void) => {
    if (callback) {
      setAuthModalCallback(() => callback);
    }
    setShowAuthModal(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
    setAuthModalCallback(null);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAdmin,
        showAuthModal,
        authModalCallback,
        openAuthModal,
        closeAuthModal,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
