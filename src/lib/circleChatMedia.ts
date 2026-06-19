import { uploadMediaAsset } from './uploads';
import { signedUrl } from './cdn';
import { supabase } from './supabase';

export const CIRCLE_MEDIA_BUCKET = 'circle-media';

export type CircleMediaKind = 'photo' | 'file';

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function storagePathFromMediaAssetUrl(url: string): string | null {
  const publicMatch = url.match(/\/object\/public\/circle-media\/(.+?)(?:\?|$)/);
  if (publicMatch) return decodeURIComponent(publicMatch[1]);
  const cdnMediaMatch = url.match(/\/media\/circle-media\/(.+?)(?:\?|$)/);
  if (cdnMediaMatch) return decodeURIComponent(cdnMediaMatch[1]);
  const cdnMatch = url.match(/circle-media\/(.+?)(?:\?|$)/);
  if (cdnMatch) return decodeURIComponent(cdnMatch[1]);
  return null;
}

export async function resolveCircleMediaSignedUrl(
  storedUrl: string,
  expiresInSec = 60 * 60,
): Promise<string> {
  const path = storagePathFromMediaAssetUrl(storedUrl);
  if (!path) return storedUrl;
  return signedUrl(CIRCLE_MEDIA_BUCKET, path, expiresInSec);
}

export async function uploadCircleChatMedia(params: {
  userId: string;
  localUri: string;
  ext: string;
  mime: string;
  bytes?: number;
  width?: number;
  height?: number;
  generateVariants?: boolean;
}): Promise<{ mediaId: string; originalUrl: string; thumbUrl?: string }> {
  const mediaId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await uploadMediaAsset({
    bucket: CIRCLE_MEDIA_BUCKET,
    userId: params.userId,
    mediaId,
    localUri: params.localUri,
    ext: params.ext,
    mime: params.mime,
    bytes: params.bytes,
    width: params.width,
    height: params.height,
    generateVariants: params.generateVariants ?? params.mime.startsWith('image/'),
  });
  return {
    mediaId: result.mediaId,
    originalUrl: result.originalUrl,
    thumbUrl: result.thumbUrlValue,
  };
}

export function extFromMime(mime: string, fallback = 'bin'): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime.startsWith('image/')) return 'jpg';
  if (mime === 'application/pdf') return 'pdf';
  return fallback;
}
