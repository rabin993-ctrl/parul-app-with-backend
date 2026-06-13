/**
 * Media URL helpers — route public images through the Cloudflare CDN and request
 * thumbnails instead of originals. See docs/backend/01-architecture.md §5.
 *
 * Convention: when an image is uploaded, the upload helper stores three keys:
 *   <base>.<ext>            original
 *   <base>_md.<ext>         ~1080px (full view)
 *   <base>_sm.<ext>         ~200px  (feed/grids/avatars/previews)
 *
 * Feed/grids/avatars MUST use `thumbUrl(...)`; full-screen view uses `fullUrl(...)`.
 */
import { ENV } from './env';
import { supabase } from './supabase';

type Variant = 'sm' | 'md' | 'orig';

function withVariant(path: string, variant: Variant): string {
  if (variant === 'orig') return path;
  const dot = path.lastIndexOf('.');
  if (dot === -1) return `${path}_${variant}`;
  return `${path.slice(0, dot)}_${variant}${path.slice(dot)}`;
}

/** Public URL for a Storage object, via the CDN host when configured. */
export function publicUrl(bucket: string, path: string, variant: Variant = 'orig'): string {
  const key = withVariant(path, variant);
  if (ENV.CDN_URL) return `${ENV.CDN_URL.replace(/\/$/, '')}/${bucket}/${key}`;
  return supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
}

/** Small thumbnail (feed/grids/avatars). */
export const thumbUrl = (bucket: string, path: string) => publicUrl(bucket, path, 'sm');

/** Full-view variant. */
export const fullUrl = (bucket: string, path: string) => publicUrl(bucket, path, 'md');

/** Private content (e.g. adoption update photos): short-lived signed URL, never CDN-cached. */
export async function signedUrl(bucket: string, path: string, expiresInSec = 60 * 10) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}
