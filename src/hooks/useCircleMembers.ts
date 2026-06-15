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

export type CircleMemberProfile = {
  userId: string;
  name: string;
  handle: string;
  tint: string;
  role: 'admin' | 'member';
  joinedAt: string;
  avatarUrl?: string;
  avatarFallbackUrl?: string;
  avatarOriginalUrl?: string;
};

type CircleMemberRow = {
  user_id: string;
  role: string;
  joined_at: string;
  users: {
    id: string;
    name: string;
    handle: string | null;
    tint: string | null;
    avatar_media: unknown;
  } | null;
};

export function circleMemberToAvatarUser(
  member: CircleMemberProfile,
): Pick<User, 'id' | 'name' | 'tint' | 'avatarUrl' | 'avatarFallbackUrl' | 'avatarOriginalUrl'> {
  return {
    id: member.userId,
    name: member.name,
    tint: member.tint,
    avatarUrl: member.avatarUrl,
    avatarFallbackUrl: member.avatarFallbackUrl,
    avatarOriginalUrl: member.avatarOriginalUrl,
  };
}

export function useCircleMembers(circleId: string | null | undefined) {
  const [members, setMembers] = useState<CircleMemberProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!circleId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from('circle_members')
      .select(`user_id, role, joined_at, users(id, name, handle, tint, ${USER_AVATAR_MEDIA_SELECT})`)
      .eq('circle_id', circleId)
      .order('joined_at', { ascending: true });

    if (data) {
      const rows = data as CircleMemberRow[];
      const membersList = rows.map(row => {
        const profile = row.users;
        const urls = avatarUrlsFromMedia(normalizeJoinedMedia(profile?.avatar_media as never));
        return {
          userId: row.user_id,
          name: profile?.name ?? row.user_id.slice(0, 8),
          handle: profile?.handle ?? row.user_id.slice(0, 8),
          tint: profile?.tint ?? '#888888',
          role: row.role as 'admin' | 'member',
          joinedAt: row.joined_at,
          ...urls,
        };
      });

      setMembers(membersList);
      seedUserProfiles(
        membersList.map(m => ({
          id: m.userId,
          name: m.name,
          handle: m.handle,
          tint: m.tint,
          avatarUrl: m.avatarUrl,
          avatarFallbackUrl: m.avatarFallbackUrl,
          avatarOriginalUrl: m.avatarOriginalUrl,
        })),
      );
      prefetchResolvedAvatars(membersList);
    }
    setLoading(false);
  }, [circleId]);

  useEffect(() => {
    load();
  }, [load]);

  return { members, loading, refresh: load };
}
