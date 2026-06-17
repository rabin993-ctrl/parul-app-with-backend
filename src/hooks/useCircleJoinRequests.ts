import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
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
  circleDbId?: string;
  circleName?: string;
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

type JoinRequestRowWithCircle = JoinRequestRow & { circle_id: string };

function mapJoinRequestRows(rows: JoinRequestRow[]): CircleJoinRequestProfile[] {
  return rows.map(row => {
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
}

function seedJoinRequestProfiles(requestList: CircleJoinRequestProfile[]) {
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

export function useCircleJoinRequests(circleId: string | null | undefined) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CircleJoinRequestProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!circleId || !user) return;
    setLoading(true);
    let query = (supabase as any)
      .from('circle_join_requests')
      .select(`id, user_id, note, created_at, users(id, name, handle, tint, ${USER_AVATAR_MEDIA_SELECT})`)
      .eq('circle_id', circleId)
      .eq('state', 'pending')
      .neq('user_id', user.id)
      .order('created_at', { ascending: true });

    const { data } = await query;

    if (data) {
      const requestList = mapJoinRequestRows(data as JoinRequestRow[]);
      setRequests(requestList);
      seedJoinRequestProfiles(requestList);
    }
    setLoading(false);
  }, [circleId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return { requests, loading, refresh: load };
}

export type HubCircleJoinRequestGroup = {
  circleId: string;
  circleDbId: string;
  circleName: string;
  requests: CircleJoinRequestProfile[];
};

/** Pending join requests across every circle the user admins. */
export function useHubCircleJoinRequests(
  circles: { id: string; dbId: string; name: string }[],
  enabled: boolean,
) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<HubCircleJoinRequestGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const circleKey = circles.map(c => c.dbId).filter(Boolean).join(',');

  const load = useCallback(async () => {
    const dbIds = circles.map(c => c.dbId).filter(Boolean);
    if (dbIds.length === 0 || !user) {
      setGroups([]);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from('circle_join_requests')
      .select(`id, circle_id, user_id, note, created_at, users(id, name, handle, tint, ${USER_AVATAR_MEDIA_SELECT})`)
      .in('circle_id', dbIds)
      .eq('state', 'pending')
      .neq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (data) {
      const rows = data as JoinRequestRowWithCircle[];
      const byCircle = new Map<string, CircleJoinRequestProfile[]>();
      for (const row of rows) {
        const mapped = mapJoinRequestRows([row])[0];
        if (!mapped) continue;
        const list = byCircle.get(row.circle_id) ?? [];
        list.push(mapped);
        byCircle.set(row.circle_id, list);
      }
      const nextGroups = circles
        .filter(c => c.dbId && (byCircle.get(c.dbId)?.length ?? 0) > 0)
        .map(c => ({
          circleId: c.id,
          circleDbId: c.dbId,
          circleName: c.name,
          requests: (byCircle.get(c.dbId) ?? []).map(req => ({
            ...req,
            circleDbId: c.dbId,
            circleName: c.name,
          })),
        }));
      seedJoinRequestProfiles(nextGroups.flatMap(g => g.requests));
      setGroups(nextGroups);
    }
    setLoading(false);
  }, [circles, circleKey, user?.id]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const totalCount = groups.reduce((sum, g) => sum + g.requests.length, 0);

  return { groups, loading, refresh: load, totalCount };
}
