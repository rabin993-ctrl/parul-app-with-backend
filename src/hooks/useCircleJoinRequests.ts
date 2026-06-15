import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { avatarUrlsFromMedia, fetchAvatarMediaMap } from '../lib/avatarMedia';
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
};

export function joinRequestToAvatarUser(
  request: CircleJoinRequestProfile,
): Pick<User, 'id' | 'name' | 'tint' | 'avatarUrl' | 'avatarFallbackUrl'> {
  return {
    id: request.userId,
    name: request.name,
    tint: request.tint,
    avatarUrl: request.avatarUrl,
    avatarFallbackUrl: request.avatarFallbackUrl,
  };
}

export function useCircleJoinRequests(circleId: string | null | undefined) {
  const [requests, setRequests] = useState<CircleJoinRequestProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!circleId) return;
    setLoading(true);
    const { data } = await supabase
      .from('circle_join_requests')
      .select('id, user_id, note, created_at, users(id, name, handle, tint, avatar_media_id)')
      .eq('circle_id', circleId)
      .eq('state', 'pending')
      .order('created_at', { ascending: true });

    if (data) {
      const rows = data as any[];
      const mediaMap = await fetchAvatarMediaMap(rows.map(r => r.users?.avatar_media_id));
      setRequests(
        rows.map(row => {
          const profile = row.users;
          const urls = avatarUrlsFromMedia(
            profile?.avatar_media_id ? mediaMap.get(profile.avatar_media_id) ?? null : null,
          );
          return {
            id: row.id,
            userId: row.user_id,
            name: profile?.name ?? row.user_id.slice(0, 8),
            handle: profile?.handle ?? row.user_id.slice(0, 8),
            tint: profile?.tint ?? '#888888',
            note: row.note ?? undefined,
            time: row.created_at as string,
            ...urls,
          };
        }),
      );
    }
    setLoading(false);
  }, [circleId]);

  useEffect(() => {
    load();
  }, [load]);

  return { requests, loading, refresh: load };
}
