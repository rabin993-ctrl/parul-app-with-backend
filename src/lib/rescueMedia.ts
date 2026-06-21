import { signedUrl } from './cdn';
import { supabase } from './supabase';
import { uploadMediaAsset } from './uploads';
import { storagePathFromMediaUrl } from './adoptionMedia';
import type { PickedAsset } from '../hooks/useMediaPicker';

type UpdateMediaRow = {
  update_id: string;
  idx: number;
  asset: { url: string; thumb_url: string | null } | null;
};

/** Load signed display URLs for rescue update photos (private bucket). */
export async function loadRescueUpdateMediaUrls(
  updateIds: string[],
): Promise<Record<string, string[]>> {
  if (updateIds.length === 0) return {};
  const { data } = await supabase
    .from('rescue_update_media')
    .select('update_id, idx, asset:media_assets(url, thumb_url)')
    .in('update_id', updateIds)
    .order('idx');

  const grouped: Record<string, { idx: number; url: string }[]> = {};
  for (const row of (data ?? []) as UpdateMediaRow[]) {
    if (!row.asset?.url) continue;
    (grouped[row.update_id] ??= []).push({ idx: row.idx, url: row.asset.url });
  }

  const result: Record<string, string[]> = {};
  await Promise.all(Object.entries(grouped).map(async ([updateId, items]) => {
    items.sort((a, b) => a.idx - b.idx);
    result[updateId] = await Promise.all(items.map(async item => {
      const path = storagePathFromMediaUrl(item.url, 'rescue-media');
      if (!path) return item.url;
      try {
        return await signedUrl('rescue-media', path, 60 * 60);
      } catch {
        return item.url;
      }
    }));
  }));
  return result;
}

export async function uploadRescueUpdatePhotos(
  updateId: string,
  userId: string,
  photos: PickedAsset[],
): Promise<string[]> {
  const urls: string[] = [];
  for (let idx = 0; idx < photos.length; idx++) {
    const photo = photos[idx];
    const mediaId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${idx}-${Math.random().toString(36).slice(2)}`;
    const uploaded = await uploadMediaAsset({
      bucket: 'rescue-media',
      userId,
      mediaId,
      localUri: photo.uri,
      ext: photo.ext,
      mime: photo.mime,
      width: photo.width,
      height: photo.height,
      bytes: photo.bytes,
      generateVariants: false,
    });
    const { error } = await supabase.from('rescue_update_media').insert({
      update_id: updateId,
      idx,
      media_id: mediaId,
    });
    if (error) throw error;
    urls.push(await signedUrl('rescue-media', uploaded.originalPath, 60 * 60));
  }
  return urls;
}
