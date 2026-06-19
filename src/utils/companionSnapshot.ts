import type { Companion, PostCompanionSnapshot } from '../data/mockData';
import { avatarUrlsFromMedia, normalizeJoinedMedia } from '../lib/avatarMedia';

export type { PostCompanionSnapshot };

type DbJoinedCompanion = {
  id: string;
  name: string;
  tint: string | null;
  avatar_media: { url: string; thumb_url: string | null } | null;
} | null;

export function snapshotFromCompanion(
  companion: Companion | null | undefined,
  fallback: { id: string; name: string },
): PostCompanionSnapshot {
  if (!companion) return { id: fallback.id, name: fallback.name };
  return {
    id: companion.id,
    name: companion.name ?? fallback.name,
    tint: companion.tint,
    avatarUrl: companion.avatarUrl,
    avatarFallbackUrl: companion.avatarFallbackUrl,
    avatarOriginalUrl: companion.avatarOriginalUrl,
  };
}

export function snapshotsFromDbPostCompanions(
  rows: { companion_id: string; companion: DbJoinedCompanion }[],
): PostCompanionSnapshot[] {
  return rows.flatMap(row => {
    const c = row.companion;
    if (!c) return [];
    return [{
      id: c.id,
      name: c.name,
      tint: c.tint ?? undefined,
      ...avatarUrlsFromMedia(normalizeJoinedMedia(c.avatar_media)),
    }];
  });
}

export function mergeCompanionDisplay(
  base: { id: string; name: string },
  live: Companion | null | undefined,
  snapshot?: PostCompanionSnapshot,
): PostCompanionSnapshot {
  return {
    id: base.id,
    name: live?.name ?? snapshot?.name ?? base.name,
    tint: live?.tint ?? snapshot?.tint,
    avatarUrl: live?.avatarUrl ?? snapshot?.avatarUrl,
    avatarFallbackUrl: live?.avatarFallbackUrl ?? snapshot?.avatarFallbackUrl,
    avatarOriginalUrl: live?.avatarOriginalUrl ?? snapshot?.avatarOriginalUrl,
  };
}

export function hasCompanionAvatar(
  item: Pick<PostCompanionSnapshot, 'avatarUrl' | 'avatarFallbackUrl' | 'avatarOriginalUrl'>,
): boolean {
  return !!(item.avatarUrl || item.avatarFallbackUrl || item.avatarOriginalUrl);
}
