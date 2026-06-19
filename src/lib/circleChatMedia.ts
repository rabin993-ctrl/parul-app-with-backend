import { uploadMediaAsset } from './uploads';
import { signedUrl } from './cdn';
import { supabase } from './supabase';

export const CIRCLE_MEDIA_BUCKET = 'circle-media';

export type CircleMediaKind = 'photo' | 'file' | 'audio';

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
  durationMs?: number;
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
    durationMs: params.durationMs,
    generateVariants: params.generateVariants ?? params.mime.startsWith('image/'),
  });
  return {
    mediaId: result.mediaId,
    originalUrl: result.originalUrl,
    thumbUrl: result.thumbUrlValue,
  };
}

export async function insertCircleSharedPost(
  circleId: string,
  userId: string,
  postId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('circle_messages')
    .insert({
      circle_id: circleId,
      type: 'shared_post',
      sender_user_id: userId,
      shared_post_id: postId,
    })
    .select('id')
    .single();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

export function extFromMime(mime: string, fallback = 'bin'): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime.startsWith('image/')) return 'jpg';
  if (mime === 'audio/mp4' || mime === 'audio/m4a' || mime === 'audio/x-m4a') return 'm4a';
  if (mime === 'audio/mpeg') return 'mp3';
  if (mime === 'audio/wav') return 'wav';
  if (mime === 'application/pdf') return 'pdf';
  return fallback;
}

export function formatVoiceDuration(ms?: number | null): string {
  if (!ms || ms <= 0) return '0:00';
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}
