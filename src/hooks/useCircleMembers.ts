import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { avatarUrlsFromMedia, fetchAvatarMediaMap } from '../lib/avatarMedia';
import type { User } from '../data/mockData';

export type CircleMemberProfile = {
  userId: string;
  name: string;
  handle: string;
  tint: string;
  role: 'admin' | 'member';
  joinedAt: string;
  avatarUrl?: string;
  avatarFallbackUrl?: string;
};

export function circleMemberToAvatarUser(
  member: CircleMemberProfile,
): Pick<User, 'id' | 'name' | 'tint' | 'avatarUrl' | 'avatarFallbackUrl'> {
  return {
    id: member.userId,
    name: member.name,
    tint: member.tint,
    avatarUrl: member.avatarUrl,
    avatarFallbackUrl: member.avatarFallbackUrl,
  };
}

export function useCircleMembers(circleId: string | null | undefined) {
  const [members, setMembers] = useState<CircleMemberProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!circleId) return;
    setLoading(true);
    const { data } = await supabase
      .from('circle_members')
      .select('user_id, role, joined_at, users(id, name, handle, tint, avatar_media_id)')
      .eq('circle_id', circleId)
      .order('joined_at', { ascending: true });

    if (data) {
      const rows = data as any[];
      const mediaMap = await fetchAvatarMediaMap(rows.map(r => r.users?.avatar_media_id));

      setMembers(
        rows.map(row => {
          const profile = row.users;
          const urls = avatarUrlsFromMedia(
            profile?.avatar_media_id ? mediaMap.get(profile.avatar_media_id) ?? null : null,
          );
          return {
            userId: row.user_id,
            name: profile?.name ?? row.user_id.slice(0, 8),
            handle: profile?.handle ?? row.user_id.slice(0, 8),
            tint: profile?.tint ?? '#888888',
            role: row.role as 'admin' | 'member',
            joinedAt: row.joined_at as string,
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

  return { members, loading, refresh: load };
}
