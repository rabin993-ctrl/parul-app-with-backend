/**
 * Centralized, validated access to public runtime config.
 *
 * Only EXPO_PUBLIC_* vars are available in the client bundle (Expo inlines them).
 * NEVER read the Supabase service-role key here — it must never ship in the app.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    // Fail loud in dev; in prod the build should have inlined these.
    console.warn(`[env] Missing ${name}. Did you create .env from .env.example?`);
    return '';
  }
  return value;
}

export const ENV = {
  SUPABASE_URL: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: required('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  /** Optional: Cloudflare CDN host in front of Supabase Storage (e.g. https://cdn.parul.app). */
  CDN_URL: process.env.EXPO_PUBLIC_CDN_URL ?? '',
  /** Webhook that triggers VPS thumbnail generation after an avatar upload. */
  THUMB_WEBHOOK_URL: process.env.EXPO_PUBLIC_THUMB_WEBHOOK_URL ?? '',
  THUMB_WEBHOOK_SECRET: process.env.EXPO_PUBLIC_THUMB_WEBHOOK_SECRET ?? '',
  /** Optional error reporting. */
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
} as const;
