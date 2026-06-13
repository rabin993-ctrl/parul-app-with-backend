/**
 * Media upload helper. Uploads a local file to a Supabase Storage bucket and returns
 * the stored path (reference it on the matching *_media row).
 *
 * NOTE (thumbnails): Wave 7 wires thumbnail generation. Two viable approaches:
 *   1) client-side with expo-image-manipulator before upload (produces _sm/_md variants), or
 *   2) a Storage-trigger Edge Function that generates variants server-side.
 * Until then this uploads the original only; thumbUrl()/fullUrl() fall back to it.
 *
 * Buckets: 'avatars' | 'post-media' | 'adoption-media' | 'rescue-media' | 'circle-media'
 */
import { supabase } from './supabase';

export type UploadInput = {
  bucket: string;
  /** path within the bucket, MUST start with the owner's user id, e.g. `${userId}/posts/${uuid}.jpg` */
  path: string;
  /** file blob/bytes (from expo-image-picker / fetch(uri).blob()) */
  data: Blob | ArrayBuffer | Uint8Array;
  contentType?: string;
  upsert?: boolean;
};

export async function uploadMedia({ bucket, path, data, contentType, upsert }: UploadInput) {
  const { data: res, error } = await supabase.storage
    .from(bucket)
    .upload(path, data, { contentType, upsert: upsert ?? false });
  if (error) throw error;
  return { path: res.path, bucket };
}

export async function removeMedia(bucket: string, paths: string[]) {
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
}
