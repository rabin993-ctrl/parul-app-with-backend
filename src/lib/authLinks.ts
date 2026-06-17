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

export function parseAuthConfirmParams(): AuthConfirmParams | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  const onConfirmPath = url.pathname.replace(/\/$/, '') === AUTH_CONFIRM_PATH;
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;

  if (!onConfirmPath || !tokenHash || !type) return null;

  return { tokenHash, type };
}

/** Remove token from the address bar after handling (avoids replay / ugly URLs). */
export function clearAuthConfirmUrl(): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.history.replaceState({}, '', '/');
  }
}
