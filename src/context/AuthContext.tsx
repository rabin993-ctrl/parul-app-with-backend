import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { EmailOtpType } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  clearAuthConfirmUrl,
  getAuthConfirmUrl,
  hasImplicitAuthCallbackInUrl,
  parseAuthConfirmParams,
} from '../lib/authLinks';

type AuthResult = { error: string | null };
type SignUpResult = AuthResult & { needsEmailConfirmation?: boolean };

export type AuthConfirmPhase = 'none' | 'verifying' | 'recovery' | 'error';

interface AuthContextValue {
  initializing: boolean;
  session: Session | null;
  user: User | null;
  authConfirmPhase: AuthConfirmPhase;
  authConfirmError: string | null;
  pendingConfirmationEmail: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name?: string, handle?: string) => Promise<SignUpResult>;
  resendConfirmationEmail: (email: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  clearAuthConfirm: () => void;
  clearPendingConfirmation: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  initializing: true,
  session: null,
  user: null,
  authConfirmPhase: 'none',
  authConfirmError: null,
  pendingConfirmationEmail: null,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  resendConfirmationEmail: async () => ({ error: null }),
  resetPassword: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  clearAuthConfirm: () => {},
  clearPendingConfirmation: () => {},
  signOut: async () => {},
});

async function verifyEmailLink(tokenHash: string, type: EmailOtpType) {
  const typesToTry: EmailOtpType[] =
    type === 'email' || type === 'signup'
      ? ['email', 'signup']
      : [type];

  let lastError: { message: string } | null = null;
  for (const otpType of typesToTry) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    if (!error) return { error: null };
    lastError = error;
  }
  return { error: lastError };
}

/** Read `type` from hash or query before the URL is cleared. */
function readCallbackTypeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  return url.searchParams.get('type')
    ?? new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash).get('type');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [authConfirmPhase, setAuthConfirmPhase] = useState<AuthConfirmPhase>('none');
  const [authConfirmError, setAuthConfirmError] = useState<string | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    (async () => {
      // Finish parsing hash/code redirects from Supabase {{ .ConfirmationURL }} before we branch.
      await supabase.auth.initialize();

      const confirmParams = parseAuthConfirmParams();
      if (confirmParams) {
        setAuthConfirmPhase('verifying');
        const { error } = await verifyEmailLink(confirmParams.tokenHash, confirmParams.type);
        clearAuthConfirmUrl();

        if (!mounted) return;

        if (error) {
          setAuthConfirmPhase('error');
          setAuthConfirmError(error.message);
        } else if (confirmParams.type === 'recovery' || confirmParams.type === 'invite') {
          setAuthConfirmPhase('recovery');
        } else {
          setAuthConfirmPhase('none');
          setPendingConfirmationEmail(null);
        }

        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        setInitializing(false);
        return;
      }

      const implicitCallback = hasImplicitAuthCallbackInUrl();
      const callbackType = implicitCallback ? readCallbackTypeFromUrl() : null;
      if (implicitCallback) {
        setAuthConfirmPhase('verifying');
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (implicitCallback) {
          clearAuthConfirmUrl();
          if (error || !data.session) {
            setAuthConfirmPhase('error');
            setAuthConfirmError(error?.message ?? 'This link may have expired or already been used.');
          } else if (callbackType === 'recovery' || callbackType === 'invite') {
            setAuthConfirmPhase('recovery');
          } else {
            setAuthConfirmPhase('none');
            setPendingConfirmationEmail(null);
          }
        }

        setSession(data.session);
      } catch {
        if (implicitCallback && mounted) {
          clearAuthConfirmUrl();
          setAuthConfirmPhase('error');
          setAuthConfirmError('Could not complete sign-in from this link.');
        }
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
    const normalized = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (error?.message.toLowerCase().includes('email not confirmed')) {
      setPendingConfirmationEmail(normalized);
    } else if (!error) {
      setPendingConfirmationEmail(null);
    }
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    name?: string,
    handle?: string,
  ): Promise<SignUpResult> => {
    const normalized = email.trim().toLowerCase();
    const meta: Record<string, string> = {};
    if (name) { meta.name = name; meta.display_name = name; }
    if (handle) meta.handle = handle;

    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: {
        emailRedirectTo: getAuthConfirmUrl(),
        ...(Object.keys(meta).length ? { data: meta } : {}),
      },
    });

    if (error) return { error: error.message };

    const needsEmailConfirmation = !!data.user && !data.session;
    if (needsEmailConfirmation) {
      setPendingConfirmationEmail(normalized);
    } else {
      setPendingConfirmationEmail(null);
    }

    return { error: null, needsEmailConfirmation };
  }, []);

  const resendConfirmationEmail = useCallback(async (email: string): Promise<AuthResult> => {
    const normalized = email.trim().toLowerCase();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalized,
      options: { emailRedirectTo: getAuthConfirmUrl() },
    });
    if (!error) setPendingConfirmationEmail(normalized);
    return { error: error?.message ?? null };
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: getAuthConfirmUrl() },
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

  const clearPendingConfirmation = useCallback(() => {
    setPendingConfirmationEmail(null);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setAuthConfirmPhase('none');
    setAuthConfirmError(null);
    setPendingConfirmationEmail(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        initializing,
        session,
        user: session?.user ?? null,
        authConfirmPhase,
        authConfirmError,
        pendingConfirmationEmail,
        signIn,
        signUp,
        resendConfirmationEmail,
        resetPassword,
        updatePassword,
        clearAuthConfirm,
        clearPendingConfirmation,
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
