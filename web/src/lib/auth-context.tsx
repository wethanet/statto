import { type Session, type User } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { isSupabaseConfigured, supabase } from '@web/lib/supabase';

type AuthContextValue = {
  isConfigured: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          console.warn('Failed to restore Supabase session', error);
        }

        setSession(data.session);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        console.warn('Failed to restore Supabase session', error);
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signInWithPassword(email: string, password: string) {
    if (!supabase) {
      return 'Supabase is not configured yet.';
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    return error?.message ?? null;
  }

  async function signUpWithPassword(email: string, password: string) {
    if (!supabase) {
      return 'Supabase is not configured yet.';
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      return error.message;
    }

    if (!data.session) {
      return 'Account created. Check your email to confirm it. If this email has a club invite, you will be added automatically after confirmation.';
    }

    return null;
  }

  async function signOut() {
    if (!supabase) {
      return null;
    }

    const { error } = await supabase.auth.signOut();
    return error?.message ?? null;
  }

  const value = useMemo<AuthContextValue>(() => {
    return {
      isConfigured: isSupabaseConfigured,
      isLoading,
      session,
      user: session?.user ?? null,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    };
  }, [isLoading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
