/**
 * Media upload helper. Uploads a local file to a Supabase Storage bucket and records
 * a row in `media_assets`. Optionally generates thumbnail + full-res variants.
 *
 * Path convention (Wave 7 directory scheme):
 *   <bucket>/<userId>/<mediaId>/original.<ext>   — original file
 *   <bucket>/<userId>/<mediaId>/thumb.jpg         — ~200px thumbnail (JPEG)
 *   <bucket>/<userId>/<mediaId>/full.jpg          — ~1080px full view (JPEG)
 *
 * Variant generation requires `expo-image-manipulator`. If not installed (or if
 * `generateVariants` is false), only the original is uploaded; thumbUrl() / fullUrl()
 * derive the variant paths from the original path using the convention above and
 * will 404 until variants are uploaded.
 *
 * TODO: install expo-image-manipulator and enable resizing:
 *   npx expo install expo-image-manipulator
 *   Then uncomment the ImageManipulator block in `uploadMediaAsset`.
 *
 * Buckets: 'avatars' | 'post-media' | 'adoption-media' | 'rescue-media' | 'circle-media'
 */
import { supabase } from './supabase';
import { mediaUrl } from './cdn';

// ---------------------------------------------------------------------------
// Low-level: raw Storage upload (unchanged, used internally + by callers that
// manage their own DB row).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// High-level: upload + insert/update `media_assets` row with variant URLs.
// ---------------------------------------------------------------------------

export type MediaAssetInput = {
  /** Supabase Storage bucket name */
  bucket: string;
  /** Authenticated user id — used as the first path segment */
  userId: string;
  /** UUID for this media item (generate with crypto.randomUUID() at call site) */
  mediaId: string;
  /** Local URI (from expo-image-picker) or a Blob/Uint8Array for the original */
  localUri: string;
  /** File extension without dot, e.g. 'jpg', 'png', 'mp4' */
  ext: string;
  /** MIME type, e.g. 'image/jpeg'. Defaults to 'image/jpeg'. */
  mime?: string;
  /** Width of the original in px (optional, stored on the DB row) */
  width?: number;
  /** Height of the original in px (optional, stored on the DB row) */
  height?: number;
  /** Size of the original in bytes (optional) */
  bytes?: number;
  /**
   * When true (default for images), upload thumbnail + full-res variants
   * alongside the original. Requires expo-image-manipulator to be installed;
   * if not installed the variants are skipped and only the original is stored.
   */
  generateVariants?: boolean;
};

export type MediaAssetResult = {
  mediaId: string;
  bucket: string;
  originalPath: string;
  thumbPath: string;
  fullPath: string;
  /** CDN/public URL for the original */
  originalUrl: string;
  /** CDN/public URL for the ~200px thumbnail */
  thumbUrlValue: string;
  /** CDN/public URL for the ~1080px full view */
  fullUrlValue: string;
};

/**
 * Upload a media file to Storage (original + optionally thumbnail & full variants),
 * then upsert the corresponding `media_assets` DB row with `url` (original public URL)
 * and `thumb_url` (thumbnail public URL).
 *
 * Returns paths and CDN URLs for all three variants.
 */
export async function uploadMediaAsset({
  bucket,
  userId,
  mediaId,
  localUri,
  ext,
  mime = 'image/jpeg',
  width,
  height,
  bytes,
  generateVariants = true,
}: MediaAssetInput): Promise<MediaAssetResult> {
  const isImage = mime.startsWith('image/');
  const shouldGenerateVariants = generateVariants && isImage;

  // Build storage paths
  const basePath = `${userId}/${mediaId}`;
  const originalPath = `${basePath}/original.${ext}`;
  const thumbPath = `${basePath}/thumb.jpg`;
  const fullPath = `${basePath}/full.jpg`;

  // 1. Fetch the original file bytes from the local URI
  const originalBlob = await (await fetch(localUri)).blob();

  // 2. Upload original
  await uploadMedia({ bucket, path: originalPath, data: originalBlob, contentType: mime, upsert: true });

  // 3. Generate & upload variants (requires expo-image-manipulator)
  if (shouldGenerateVariants) {
    // TODO: Uncomment once `expo-image-manipulator` is installed:
    //   npx expo install expo-image-manipulator
    //
    // import * as ImageManipulator from 'expo-image-manipulator';
    //
    // // Thumbnail ~200px wide, 0.7 quality JPEG
    // const thumbResult = await ImageManipulator.manipulateAsync(
    //   localUri,
    //   [{ resize: { width: 200 } }],
    //   { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    // );
    // const thumbBlob = await (await fetch(thumbResult.uri)).blob();
    // await uploadMedia({ bucket, path: thumbPath, data: thumbBlob, contentType: 'image/jpeg', upsert: true });
    //
    // // Full view ~1080px wide, 0.85 quality JPEG
    // const fullResult = await ImageManipulator.manipulateAsync(
    //   localUri,
    //   [{ resize: { width: 1080 } }],
    //   { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    // );
    // const fullBlob = await (await fetch(fullResult.uri)).blob();
    // await uploadMedia({ bucket, path: fullPath, data: fullBlob, contentType: 'image/jpeg', upsert: true });
    //
    // NOTE: expo-image-manipulator not yet installed; variants skipped for now.
    // The paths are reserved and thumb_url is stored so cdn.ts can serve them
    // once variants are actually uploaded (e.g. by a server-side trigger).
  }

  // 4. Compute public/CDN URLs using the directory convention:
  //   mediaUrl(bucket, originalPath, 'original') -> .../original.<ext>
  //   mediaUrl(bucket, originalPath, 'thumb')    -> .../thumb.jpg
  //   mediaUrl(bucket, originalPath, 'full')     -> .../full.jpg
  const originalUrl = mediaUrl(bucket, originalPath, 'original');
  const thumbUrlValue = mediaUrl(bucket, originalPath, 'thumb');
  const fullUrlValue = mediaUrl(bucket, originalPath, 'full');

  // 5. Upsert the media_assets row:
  //   url       = original public/CDN URL (stored for back-compat and raw access)
  //   thumb_url = thumbnail CDN URL (~200px); derive full-view URL via convention
  //   Note: the table has no 'full_url' column — callers use mediaUrl(bucket, path, 'full')
  //   or derive it from thumb_url by replacing '/thumb.jpg' with '/full.jpg'.
  const { error: dbError } = await supabase.from('media_assets').upsert({
    id: mediaId,
    owner_id: userId,
    url: originalUrl,
    thumb_url: thumbUrlValue,
    mime,
    type: isImage ? 'image' : 'video',
    width: width ?? null,
    height: height ?? null,
    bytes: bytes ?? null,
  }, { onConflict: 'id' });
  if (dbError) throw dbError;

  return {
    mediaId,
    bucket,
    originalPath,
    thumbPath,
    fullPath,
    originalUrl,
    thumbUrlValue,
    fullUrlValue,
  };
}
