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
  invitedByUserId?: string;
  invitedByName?: string;
};

type JoinRequestRow = {
  id: string;
  circle_id?: string;
  user_id: string;
  note: string | null;
  created_at: string;
  invited_by_user_id?: string | null;
  users?: {
    id: string;
    name: string;
    handle: string | null;
    tint: string | null;
    avatar_media: unknown;
  } | null;
  inviter?: {
    id: string;
    name: string;
    handle: string | null;
    tint: string | null;
  } | null;
};

type JoinRequestRowWithCircle = JoinRequestRow & { circle_id: string };

export function joinRequestToAvatarUser(
  request: CircleJoinRequestProfile,
) {
  return {
    id: request.userId,
    name: request.name,
    tint: request.tint,
    avatarUrl: request.avatarUrl,
    avatarFallbackUrl: request.avatarFallbackUrl,
    avatarOriginalUrl: request.avatarOriginalUrl,
  };
}

const JOIN_REQUEST_SELECT = `
  id, circle_id, user_id, note, created_at, invited_by_user_id,
  users(id, name, handle, tint, ${USER_AVATAR_MEDIA_SELECT}),
  inviter:users!circle_join_requests_invited_by_user_id_fkey(id, name, handle, tint)
`;

const JOIN_REQUEST_SELECT_LEGACY = `
  id, circle_id, user_id, note, created_at,
  users(id, name, handle, tint, ${USER_AVATAR_MEDIA_SELECT})
`;

const JOIN_REQUEST_SELECT_MINIMAL = `
  id, circle_id, user_id, note, created_at, invited_by_user_id
`;

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
      invitedByUserId: row.invited_by_user_id ?? undefined,
      invitedByName: row.inviter?.name ?? undefined,
      ...urls,
    };
  });
}

async function enrichJoinRequestRows(rows: JoinRequestRow[]): Promise<JoinRequestRow[]> {
  if (rows.length === 0) return rows;
  if (rows.every(r => r.users)) return rows;

  const userIds = [...new Set(rows.map(r => r.user_id))];
  const inviterIds = [...new Set(rows.map(r => r.invited_by_user_id).filter(Boolean) as string[])];
  const lookupIds = [...new Set([...userIds, ...inviterIds])];

  const { data: users } = await (supabase as any)
    .from('users')
    .select(`id, name, handle, tint, ${USER_AVATAR_MEDIA_SELECT}`)
    .in('id', lookupIds);

  const byId = new Map((users ?? []).map((u: { id: string }) => [u.id, u]));

  return rows.map(row => ({
    ...row,
    users: row.users ?? (byId.get(row.user_id) as JoinRequestRow['users']) ?? null,
    inviter: row.inviter ?? (row.invited_by_user_id
      ? (byId.get(row.invited_by_user_id) as JoinRequestRow['inviter']) ?? null
      : null),
  }));
}

async function queryJoinRequests(
  build: (q: any) => any,
) {
  const selects = [JOIN_REQUEST_SELECT, JOIN_REQUEST_SELECT_LEGACY, JOIN_REQUEST_SELECT_MINIMAL];
  let lastError: unknown = null;

  for (const select of selects) {
    const result = await build((supabase as any).from('circle_join_requests')).select(select);
    if (!result.error && result.data) {
      const rows = result.data as unknown as JoinRequestRow[];
      const enriched = select === JOIN_REQUEST_SELECT_MINIMAL
        ? await enrichJoinRequestRows(rows)
        : rows;
      return { data: enriched, error: null };
    }
    lastError = result.error;
  }

  return { data: null as JoinRequestRow[] | null, error: lastError };
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

export function useCircleJoinRequests(circleDbId: string | null | undefined) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CircleJoinRequestProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!circleDbId || !user) {
      setRequests([]);
      return;
    }
    setLoading(true);
    const { data } = await queryJoinRequests(q =>
      q.eq('circle_id', circleDbId)
        .eq('state', 'pending')
        .neq('user_id', user.id)
        .order('created_at', { ascending: true }),
    );

    if (data) {
      const requestList = mapJoinRequestRows(data);
      setRequests(requestList);
      seedJoinRequestProfiles(requestList);
    } else {
      setRequests([]);
    }
    setLoading(false);
  }, [circleDbId, user?.id]);

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
    const { data } = await queryJoinRequests(q =>
      q.in('circle_id', dbIds)
        .eq('state', 'pending')
        .neq('user_id', user.id)
        .order('created_at', { ascending: true }),
    );

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
      const circleByDbId = new Map(circles.map(c => [c.dbId, c]));
      const nextGroups: HubCircleJoinRequestGroup[] = [];
      for (const [dbId, reqs] of byCircle.entries()) {
        const circle = circleByDbId.get(dbId);
        if (!circle || reqs.length === 0) continue;
        nextGroups.push({
          circleId: circle.id,
          circleDbId: dbId,
          circleName: circle.name,
          requests: reqs.map(req => ({
            ...req,
            circleDbId: dbId,
            circleName: circle.name,
          })),
        });
      }
      nextGroups.sort((a, b) => a.circleName.localeCompare(b.circleName));
      seedJoinRequestProfiles(nextGroups.flatMap(g => g.requests));
      setGroups(nextGroups);
    } else {
      setGroups([]);
    }
    setLoading(false);
  }, [circles, circleKey, user?.id]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const totalCount = groups.reduce((sum, g) => sum + g.requests.length, 0);

  return { groups, loading, refresh: load, totalCount };
}
