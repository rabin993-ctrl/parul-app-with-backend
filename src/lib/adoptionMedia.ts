import { signedUrl } from './cdn';
import { supabase } from './supabase';
import { uploadMediaAsset } from './uploads';
import type { PickedAsset } from '../hooks/useMediaPicker';

/** Extract the storage object path from a media_assets public URL. */
export function storagePathFromMediaUrl(url: string, bucket: string): string | null {
  const needle = `/${bucket}/`;
  const i = url.indexOf(needle);
  if (i === -1) return null;
  return url.slice(i + needle.length);
}

type ListingMediaRow = {
  listing_id: string;
  idx: number;
  asset: { url: string; thumb_url: string | null } | null;
};

/** Load signed display URLs for adoption listing photos (private bucket). */
export async function loadListingMediaUrls(
  listingIds: string[],
): Promise<Record<string, string[]>> {
  if (listingIds.length === 0) return {};
  const { data } = await supabase
    .from('adoption_listing_media')
    .select('listing_id, idx, asset:media_assets(url, thumb_url)')
    .in('listing_id', listingIds)
    .order('idx');

  const grouped: Record<string, { idx: number; url: string }[]> = {};
  for (const row of (data ?? []) as ListingMediaRow[]) {
    if (!row.asset?.url) continue;
    (grouped[row.listing_id] ??= []).push({ idx: row.idx, url: row.asset.url });
  }

  const result: Record<string, string[]> = {};
  await Promise.all(Object.entries(grouped).map(async ([listingId, items]) => {
    items.sort((a, b) => a.idx - b.idx);
    result[listingId] = await Promise.all(items.map(async item => {
      const path = storagePathFromMediaUrl(item.url, 'adoption-media');
      if (!path) return item.url;
      try {
        return await signedUrl('adoption-media', path, 60 * 60);
      } catch {
        return item.url;
      }
    }));
  }));
  return result;
}

export async function uploadListingPhotos(
  listingId: string,
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
      bucket: 'adoption-media',
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
    const { error } = await supabase.from('adoption_listing_media').insert({
      listing_id: listingId,
      idx,
      media_id: mediaId,
    });
    if (error) throw error;
    urls.push(await signedUrl('adoption-media', uploaded.originalPath, 60 * 60));
  }
  return urls;
}
