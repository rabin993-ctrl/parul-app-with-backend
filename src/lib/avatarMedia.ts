import { Image } from 'expo-image';
import { supabase } from './supabase';
import { normalizePublicMediaUrl } from './cdn';

import type { User } from '../data/mockData';

export type AvatarMediaRow = {
  url: string;
  thumb_url: string | null;
};

export type JoinedAvatarMedia = AvatarMediaRow | AvatarMediaRow[] | null | undefined;

/** PostgREST may return a one-to-one join as an object or a single-element array. */
export function normalizeJoinedMedia(media: JoinedAvatarMedia): AvatarMediaRow | null {
  if (!media) return null;
  if (Array.isArray(media)) return media[0] ?? null;
  return media;
}

export type ResolvedAvatarUrls = Pick<User, 'avatarUrl' | 'avatarFallbackUrl'> & {
  avatarOriginalUrl?: string;
};

/** PostgREST nested select for user avatar media (single round-trip join). */
export const USER_AVATAR_MEDIA_SELECT =
  'avatar_media:media_assets!users_avatar_media_id_fkey(url, thumb_url)';

export type UserPrivacyJoin = {
  show_location: boolean;
  show_companions: boolean;
};

export const USER_WITH_AVATAR_SELECT =
  `id,name,handle,tint,bio,location,${USER_AVATAR_MEDIA_SELECT},user_privacy_settings(show_location,show_companions)`;

function privacyFromJoin(
  row: UserPrivacyJoin | UserPrivacyJoin[] | null | undefined,
): UserPrivacyJoin | null {
  if (!row) return null;
  if (Array.isArray(row)) return row[0] ?? null;
  return row;
}

export function deriveFullUrlFromOriginal(originalUrl: string): string | undefined {
  if (/\/original\.[^/]+$/.test(originalUrl)) {
    return originalUrl.replace(/\/original\.[^/]+$/, '/full.jpg');
  }
  return undefined;
}

export function avatarUrlsFromMedia(
  media: AvatarMediaRow | null | undefined,
): ResolvedAvatarUrls {
  if (!media?.url) return {};
  const original = normalizePublicMediaUrl(media.url);
  const fullDerived = deriveFullUrlFromOriginal(media.url);
  const full = fullDerived ? normalizePublicMediaUrl(fullDerived) : undefined;
  const thumb = media.thumb_url ? normalizePublicMediaUrl(media.thumb_url) : undefined;
  return {
    avatarUrl: thumb ?? full ?? original,
    avatarFallbackUrl: full ?? original,
    avatarOriginalUrl: original,
  };
}

/** Ordered thumb → full → original URLs for progressive fallback. */
export function avatarUrlChain(urls: ResolvedAvatarUrls): string[] {
  const chain: string[] = [];
  for (const url of [urls.avatarUrl, urls.avatarFallbackUrl, urls.avatarOriginalUrl]) {
    if (url && !chain.includes(url)) chain.push(url);
  }
  return chain;
}

export type UserWithAvatarJoin = {
  id: string;
  name: string;
  handle: string | null;
  tint: string | null;
  bio: string | null;
  location: string | null;
  avatar_media: JoinedAvatarMedia;
  user_privacy_settings?: UserPrivacyJoin | UserPrivacyJoin[] | null;
};

export function userMiniFromJoin(row: UserWithAvatarJoin) {
  const privacy = privacyFromJoin(row.user_privacy_settings);
  const showLocation = privacy?.show_location ?? true;
  const showCompanions = privacy?.show_companions ?? true;
  const location = showLocation ? (row.location?.trim() || undefined) : undefined;

  return {
    id: row.id,
    name: row.name,
    handle: row.handle ?? row.name,
    tint: row.tint ?? '#888888',
    bio: row.bio?.trim() || undefined,
    location,
    showLocation,
    showCompanions,
    ...avatarUrlsFromMedia(normalizeJoinedMedia(row.avatar_media)),
  };
}

export async function prefetchAvatarUrls(
  urls: (string | undefined | null)[],
): Promise<void> {
  const unique = [...new Set(urls.filter((u): u is string => !!u))];
  if (unique.length > 0) {
    await Image.prefetch(unique);
  }
}

export function prefetchResolvedAvatars(items: ResolvedAvatarUrls[]): void {
  const urls = items.flatMap(item => avatarUrlChain(item));
  void prefetchAvatarUrls(urls);
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
