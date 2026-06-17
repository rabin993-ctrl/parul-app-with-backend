import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  clearAuthConfirmUrl,
  getAuthConfirmUrl,
  parseAuthConfirmParams,
} from '../lib/authLinks';

type AuthResult = { error: string | null };

export type AuthConfirmPhase = 'none' | 'verifying' | 'recovery' | 'error';

interface AuthContextValue {
  initializing: boolean;
  session: Session | null;
  user: User | null;
  authConfirmPhase: AuthConfirmPhase;
  authConfirmError: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name?: string, handle?: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  clearAuthConfirm: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  initializing: true,
  session: null,
  user: null,
  authConfirmPhase: 'none',
  authConfirmError: null,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  resetPassword: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  clearAuthConfirm: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authConfirmPhase, setAuthConfirmPhase] = useState<AuthConfirmPhase>('none');
  const [authConfirmError, setAuthConfirmError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    (async () => {
      const confirmParams = parseAuthConfirmParams();
      if (confirmParams) {
        setAuthConfirmPhase('verifying');
        const { error } = await supabase.auth.verifyOtp({
          token_hash: confirmParams.tokenHash,
          type: confirmParams.type,
        });
        clearAuthConfirmUrl();

        if (!mounted) return;

        if (error) {
          setAuthConfirmPhase('error');
          setAuthConfirmError(error.message);
        } else if (confirmParams.type === 'recovery') {
          setAuthConfirmPhase('recovery');
        } else {
          setAuthConfirmPhase('none');
        }

        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setInitializing(false);
        return;
      }

      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
      } catch {
        // session check failed — show auth screen
      } finally {
        if (mounted) setInitializing(false);
      }
    })();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string, handle?: string): Promise<AuthResult> => {
    const meta: Record<string, string> = {};
    if (name) { meta.name = name; meta.display_name = name; }
    if (handle) meta.handle = handle;
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: Object.keys(meta).length ? { data: meta } : undefined,
    });
    return { error: error?.message ?? null };
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    const redirectTo = Platform.OS === 'web' ? getAuthConfirmUrl() : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      redirectTo ? { redirectTo } : undefined,
    );
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) {
      setAuthConfirmPhase('none');
      setAuthConfirmError(null);
    }
    return { error: error?.message ?? null };
  }, []);

  const clearAuthConfirm = useCallback(() => {
    setAuthConfirmPhase('none');
    setAuthConfirmError(null);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthConfirmPhase('none');
    setAuthConfirmError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        initializing,
        session,
        user: session?.user ?? null,
        authConfirmPhase,
        authConfirmError,
        signIn,
        signUp,
        resetPassword,
        updatePassword,
        clearAuthConfirm,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
