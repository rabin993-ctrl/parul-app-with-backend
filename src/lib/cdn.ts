/**
 * Media URL helpers — route public images through the VPS CDN and request
 * thumbnails instead of originals. See docs/backend/01-architecture.md §5.
 *
 * Directory path convention (Wave 7):
 *   <bucket>/<userId>/<mediaId>/original.<ext>   — original file
 *   <bucket>/<userId>/<mediaId>/thumb.jpg         — ~200px thumbnail (JPEG)
 *   <bucket>/<userId>/<mediaId>/full.jpg          — ~1080px full view (JPEG)
 *
 * VPS nginx serves public objects at:
 *   https://cdn.parul.pet/media/<bucket>/<objectPath>
 *
 * Public buckets  (avatars, post-media):          served via CDN when configured.
 * Private buckets (adoption-media, rescue-media, circle-media): direct Supabase URL;
 *   caller is responsible for creating a signed URL for private objects.
 *
 * Feed/grids/avatars MUST use thumb URLs; full-screen view uses full URLs.
 */
import { ENV } from './env';
import { supabase } from './supabase';

/** Public buckets proxied through cdn.parul.pet/media/… on the VPS. */
const PUBLIC_BUCKETS = new Set(['avatars', 'post-media']);

/** Path segment on the VPS CDN (nginx proxies /media/<bucket>/… → Supabase Storage). */
const CDN_MEDIA_PREFIX = 'media';

type Variant = 'thumb' | 'full' | 'original';

function variantPath(originalPath: string, variant: Variant): string {
  if (variant === 'original') return originalPath;
  const slashIdx = originalPath.lastIndexOf('/');
  if (slashIdx !== -1) {
    const dir = originalPath.slice(0, slashIdx);
    return `${dir}/${variant}.jpg`;
  }
  return `${originalPath}_${variant}.jpg`;
}

/** Parse bucket + object path from a Supabase public URL or CDN URL. */
export function parsePublicStorageLocation(
  url: string,
): { bucket: string; path: string } | null {
  const storageMatch = url.match(/\/object\/public\/([^/]+)\/(.+?)(?:\?|$)/);
  if (storageMatch) {
    return {
      bucket: decodeURIComponent(storageMatch[1]),
      path: decodeURIComponent(storageMatch[2]),
    };
  }

  const cdnBase = ENV.CDN_URL?.replace(/\/$/, '');
  if (cdnBase && url.startsWith(`${cdnBase}/`)) {
    let rest = url.slice(cdnBase.length + 1);
    if (rest.startsWith(`${CDN_MEDIA_PREFIX}/`)) {
      rest = rest.slice(CDN_MEDIA_PREFIX.length + 1);
    }
    const slash = rest.indexOf('/');
    if (slash === -1) return null;
    return {
      bucket: decodeURIComponent(rest.slice(0, slash)),
      path: decodeURIComponent(rest.slice(slash + 1)),
    };
  }

  const legacyCdn = url.match(
    /https?:\/\/cdn\.parul\.pet\/(?:media\/)?([^/]+)\/(.+?)(?:\?|$)/,
  );
  if (legacyCdn) {
    return {
      bucket: decodeURIComponent(legacyCdn[1]),
      path: decodeURIComponent(legacyCdn[2]),
    };
  }

  return null;
}

function cdnPublicUrl(bucket: string, objectPath: string): string {
  const base = ENV.CDN_URL!.replace(/\/$/, '');
  return `${base}/${CDN_MEDIA_PREFIX}/${bucket}/${objectPath}`;
}

/**
 * Rewrite a stored Supabase or legacy CDN URL to the current CDN URL shape.
 * No-op when CDN is not configured or the bucket is private.
 */
export function normalizePublicMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  const loc = parsePublicStorageLocation(url);
  if (!loc || !PUBLIC_BUCKETS.has(loc.bucket) || !ENV.CDN_URL) return url;
  return cdnPublicUrl(loc.bucket, loc.path);
}

export function publicUrl(bucket: string, path: string, variant: Variant = 'original'): string {
  const key = variantPath(path, variant);
  if (PUBLIC_BUCKETS.has(bucket) && ENV.CDN_URL) {
    return cdnPublicUrl(bucket, key);
  }
  return supabase.storage.from(bucket).getPublicUrl(key).data.publicUrl;
}

export function mediaUrl(
  bucket: string,
  originalPath: string,
  variant: Variant = 'thumb',
): string {
  return publicUrl(bucket, originalPath, variant);
}

export const thumbUrl = (bucket: string, originalPath: string) =>
  publicUrl(bucket, originalPath, 'thumb');

export const fullUrl = (bucket: string, originalPath: string) =>
  publicUrl(bucket, originalPath, 'full');

/** Direct Supabase public URL — used when the CDN edge misses or 404s. */
export function supabasePublicUrlFromMediaUrl(url: string | null | undefined): string | undefined {
  if (!url || !ENV.SUPABASE_URL) return undefined;
  if (url.includes('/storage/v1/object/public/')) return url;

  const loc = parsePublicStorageLocation(url);
  if (!loc) return undefined;

  return `${ENV.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/${loc.bucket}/${loc.path}`;
}

export function resolvePostMediaDisplayUrl(asset: {
  url: string;
  thumb_url: string | null;
}): string {
  if (asset.thumb_url) return normalizePublicMediaUrl(asset.thumb_url);
  return normalizePublicMediaUrl(asset.url);
}

export function resolvePostMediaFallbackUrl(asset: {
  url: string;
  thumb_url: string | null;
}): string | undefined {
  const display = resolvePostMediaDisplayUrl(asset);
  const direct = supabasePublicUrlFromMediaUrl(display);
  if (direct && direct !== display) return direct;

  for (const candidate of [asset.url, asset.thumb_url]) {
    if (!candidate) continue;
    const fallback = supabasePublicUrlFromMediaUrl(candidate);
    if (fallback && fallback !== display) return fallback;
  }

  if (asset.thumb_url && asset.url !== asset.thumb_url) {
    return normalizePublicMediaUrl(asset.url);
  }
  return undefined;
}

/** Private content: short-lived signed URL, never CDN-cached. */
export async function signedUrl(bucket: string, path: string, expiresInSec = 60 * 10) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}
