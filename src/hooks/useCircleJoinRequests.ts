import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  avatarUrlsFromMedia,
  normalizeJoinedMedia,
  prefetchResolvedAvatars,
  USER_AVATAR_MEDIA_SELECT,
} from '../lib/avatarMedia';
import { seedUserProfiles } from './useUserProfile';
import type { User } from '../data/mockData';

export type CircleJoinRequestProfile = {
  id: string;
  userId: string;
  name: string;
  handle: string;
  tint: string;
  note?: string;
  time: string;
  avatarUrl?: string;
  avatarFallbackUrl?: string;
  avatarOriginalUrl?: string;
};

type JoinRequestRow = {
  id: string;
  user_id: string;
  note: string | null;
  created_at: string;
  users: {
    id: string;
    name: string;
    handle: string | null;
    tint: string | null;
    avatar_media: unknown;
  } | null;
};

export function joinRequestToAvatarUser(
  request: CircleJoinRequestProfile,
): Pick<User, 'id' | 'name' | 'tint' | 'avatarUrl' | 'avatarFallbackUrl' | 'avatarOriginalUrl'> {
  return {
    id: request.userId,
    name: request.name,
    tint: request.tint,
    avatarUrl: request.avatarUrl,
    avatarFallbackUrl: request.avatarFallbackUrl,
    avatarOriginalUrl: request.avatarOriginalUrl,
  };
}

export function useCircleJoinRequests(circleId: string | null | undefined) {
  const [requests, setRequests] = useState<CircleJoinRequestProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!circleId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('circle_join_requests')
      .select(`id, user_id, note, created_at, users(id, name, handle, tint, ${USER_AVATAR_MEDIA_SELECT})`)
      .eq('circle_id', circleId)
      .eq('state', 'pending')
      .order('created_at', { ascending: true });

    if (data) {
      const rows = data as JoinRequestRow[];
      const requestList = rows.map(row => {
        const profile = row.users;
        const urls = avatarUrlsFromMedia(normalizeJoinedMedia(profile?.avatar_media as never));
        return {
          id: row.id,
          userId: row.user_id,
          name: profile?.name ?? row.user_id.slice(0, 8),
          handle: profile?.handle ?? row.user_id.slice(0, 8),
          tint: profile?.tint ?? '#888888',
          note: row.note ?? undefined,
          time: row.created_at,
          ...urls,
        };
      });

      setRequests(requestList);
      seedUserProfiles(
        requestList.map(r => ({
          id: r.userId,
          name: r.name,
          handle: r.handle,
          tint: r.tint,
          avatarUrl: r.avatarUrl,
          avatarFallbackUrl: r.avatarFallbackUrl,
          avatarOriginalUrl: r.avatarOriginalUrl,
        })),
      );
      prefetchResolvedAvatars(requestList);
    }
    setLoading(false);
  }, [circleId]);

  useEffect(() => {
    load();
  }, [load]);

  return { requests, loading, refresh: load };
}
