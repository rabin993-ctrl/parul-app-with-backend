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
