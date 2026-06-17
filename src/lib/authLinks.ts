import { Platform } from 'react-native';
import type { EmailOtpType } from '@supabase/supabase-js';

/** Canonical production URL — used for auth emails and redirects when not on localhost. */
export const PRODUCTION_SITE_URL = 'https://parul.pet';

const AUTH_CONFIRM_PATH = '/auth/confirm';

/** Site URL for auth redirects: parul.pet in production, current origin on localhost/preview. */
export function getSiteUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return origin;
    if (hostname.endsWith('.vercel.app')) return origin;
    if (hostname === 'parul.pet' || hostname === 'www.parul.pet') return PRODUCTION_SITE_URL;
    return origin;
  }
  return PRODUCTION_SITE_URL;
}

export function getAuthConfirmUrl(): string {
  return `${getSiteUrl().replace(/\/$/, '')}${AUTH_CONFIRM_PATH}`;
}

export type AuthConfirmParams = {
  tokenHash: string;
  type: EmailOtpType;
};

/** Map legacy/alternate type query values to verifyOtp types. */
function normalizeOtpType(raw: string | null): EmailOtpType | null {
  if (!raw) return null;
  if (raw === 'signup') return 'email';
  return raw as EmailOtpType;
}

export function parseAuthConfirmParams(): AuthConfirmParams | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  const onConfirmPath = url.pathname.replace(/\/$/, '') === AUTH_CONFIRM_PATH;
  const tokenHash = url.searchParams.get('token_hash');
  const type = normalizeOtpType(url.searchParams.get('type'));

  if (!onConfirmPath || !tokenHash || !type) return null;

  return { tokenHash, type };
}

/** Supabase {{ .ConfirmationURL }} redirects here with hash tokens or PKCE ?code= (no token_hash). */
export function hasImplicitAuthCallbackInUrl(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;

  const url = new URL(window.location.href);
  if (url.searchParams.get('code')) return true;

  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  if (!hash) return false;

  const params = new URLSearchParams(hash);
  return params.has('access_token') || params.has('error') || params.has('error_description');
}

/** Remove auth tokens from the address bar after handling (avoids replay / ugly URLs). */
export function clearAuthConfirmUrl(): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.history.replaceState({}, '', '/');
  }
}
