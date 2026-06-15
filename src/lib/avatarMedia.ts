import { supabase } from './supabase';

import type { User } from '../data/mockData';

export type AvatarMediaRow = {
  url: string;
  thumb_url: string | null;
};

export function avatarUrlsFromMedia(
  media: AvatarMediaRow | null | undefined,
): Pick<User, 'avatarUrl' | 'avatarFallbackUrl'> {
  if (!media?.url) return {};
  return {
    avatarUrl: media.thumb_url ?? media.url,
    avatarFallbackUrl: media.url,
  };
}

export async function fetchAvatarMedia(
  mediaId: string | null | undefined,
): Promise<AvatarMediaRow | null> {
  if (!mediaId) return null;
  const { data } = await supabase
    .from('media_assets')
    .select('url, thumb_url')
    .eq('id', mediaId)
    .maybeSingle();
  return data as AvatarMediaRow | null;
}

/** Batch-load avatar media rows keyed by media asset id. */
export async function fetchAvatarMediaMap(
  mediaIds: Iterable<string | null | undefined>,
): Promise<Map<string, AvatarMediaRow>> {
  const mediaMap = new Map<string, AvatarMediaRow>();
  const unique = [...new Set([...mediaIds].filter(Boolean))] as string[];
  if (unique.length === 0) return mediaMap;

  const { data: mediaRows } = await supabase
    .from('media_assets')
    .select('id, url, thumb_url')
    .in('id', unique);

  for (const m of mediaRows ?? []) {
    mediaMap.set(m.id, { url: m.url, thumb_url: m.thumb_url });
  }
  return mediaMap;
}
