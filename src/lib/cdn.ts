/**
 * Media URL helpers — route public images through the Cloudflare CDN and request
 * thumbnails instead of originals. See docs/backend/01-architecture.md §5.
 *
 * Directory path convention (Wave 7):
 *   <bucket>/<userId>/<mediaId>/original.<ext>   — original file
 *   <bucket>/<userId>/<mediaId>/thumb.jpg         — ~200px thumbnail (JPEG)
 *   <bucket>/<userId>/<mediaId>/full.jpg          — ~1080px full view (JPEG)
 *
 * `thumbUrl(bucket, originalPath)` and `fullUrl(bucket, originalPath)` accept the
 * *original* path (ending in `/original.<ext>`) and return the appropriate variant URL.
 *
 * Public buckets  (avatars, post-media):          served via CDN when configured.
 * Private buckets (adoption-media, rescue-media, circle-media): direct Supabase URL;
 *   caller is responsible for creating a signed URL for private objects.
 *
 * Feed/grids/avatars MUST use `thumbUrl(...)`; full-screen view uses `fullUrl(...)`.
 */
import { ENV } from './env';
import { supabase } from './supabase';

// Buckets that may be served publicly through the CDN.
const PUBLIC_BUCKETS = new Set(['avatars', 'post-media']);

type Variant = 'thumb' | 'full' | 'original';

/**
 * Derive the storage path for a given variant from the original path.
 *
 * The original path MUST end with `/original.<ext>` (as written by `uploadMediaAsset`).
 * Variant paths always end in `.jpg` (thumbnails and full views are re-encoded as JPEG).
 *
 * If the path does not follow the convention (e.g. legacy uploads) it is returned
 * unchanged for the 'original' variant, and a best-effort replacement is attempted
 * for thumb/full.
 */
function variantPath(originalPath: string, variant: Variant): string {
  if (variant === 'original') return originalPath;
  // Directory scheme: swap the filename
  const slashIdx = originalPath.lastIndexOf('/');
  if (slashIdx !== -1) {
    const dir = originalPath.slice(0, slashIdx);
    return `${dir}/${variant}.jpg`;
  }
  // Fallback: shouldn't happen in practice
  return `${originalPath}_${variant}.jpg`;
}

/**
 * Build a public URL for a Storage object.
 *
 * For public buckets, routes through the CDN when `EXPO_PUBLIC_CDN_URL` is set.
 * For private buckets, returns the direct Supabase Storage URL (which will require
 * a signed URL for actual access — see `signedUrl()`).
 */
export function publicUrl(bucket: string, path: string, variant: Variant = 'original'): string {
  const key = variantPath(path, variant);
  if (PUBLIC_BUCKETS.has(bucket) && ENV.CDN_URL) {
    return `${ENV.CDN_URL.replace(/\/$/, '')}/${bucket}/${key}`;
  }
  return supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
}

/**
 * Returns the appropriate CDN/Storage URL for a media asset based on context:
 *   'thumb'    — ~200px for feeds, grids, avatars, chat previews
 *   'full'     — ~1080px for detail/full-screen views
 *   'original' — raw file for downloads
 *
 * `originalPath` must be the path of the original file as stored in `media_assets.url`
 * (path segment only, not a full URL), following the convention
 * `<userId>/<mediaId>/original.<ext>`.
 *
 * For public buckets the URL is routed through the CDN when configured.
 * For private buckets a direct Supabase URL is returned; call `signedUrl()` to get
 * an authenticated URL for private objects.
 */
export function mediaUrl(
  bucket: string,
  originalPath: string,
  variant: Variant = 'thumb',
): string {
  return publicUrl(bucket, originalPath, variant);
}

/** Small thumbnail (~200px) for feeds, grids, avatars, chat previews. */
export const thumbUrl = (bucket: string, originalPath: string) =>
  publicUrl(bucket, originalPath, 'thumb');

/** Full-resolution variant (~1080px) for detail views. */
export const fullUrl = (bucket: string, originalPath: string) =>
  publicUrl(bucket, originalPath, 'full');

/** Convert a CDN media URL back to a direct Supabase Storage public URL (fallback when CDN misses). */
export function supabasePublicUrlFromMediaUrl(url: string | null | undefined): string | undefined {
  if (!url || !ENV.SUPABASE_URL) return undefined;
  if (url.includes('/storage/v1/object/public/')) return url;

  const cdnBase = ENV.CDN_URL?.replace(/\/$/, '');
  if (cdnBase && url.startsWith(`${cdnBase}/`)) {
    const rest = url.slice(cdnBase.length + 1);
    const slash = rest.indexOf('/');
    if (slash === -1) return undefined;
    const bucket = rest.slice(0, slash);
    const path = rest.slice(slash + 1);
    return `${ENV.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${path}`;
  }
  return undefined;
}

export function resolvePostMediaDisplayUrl(asset: {
  url: string;
  thumb_url: string | null;
}): string {
  return asset.thumb_url ?? asset.url;
}

export function resolvePostMediaFallbackUrl(asset: {
  url: string;
  thumb_url: string | null;
}): string | undefined {
  const candidates = [asset.url, asset.thumb_url].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const direct = supabasePublicUrlFromMediaUrl(candidate);
    if (direct && direct !== candidate) return direct;
  }
  if (asset.thumb_url && asset.url !== asset.thumb_url) return asset.url;
  return supabasePublicUrlFromMediaUrl(asset.url);
}

/** Private content (e.g. adoption update photos): short-lived signed URL, never CDN-cached. */
export async function signedUrl(bucket: string, path: string, expiresInSec = 60 * 10) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}
