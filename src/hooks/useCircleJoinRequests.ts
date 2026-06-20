import { useCallback, useEffect, useRef, useState } from 'react';
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

/** Same columns as PawCircleContext — no joins, works on every DB version. */
export const JOIN_REQUEST_BARE_SELECT =
  'id, circle_id, user_id, note, created_at';

const JOIN_REQUEST_SELECT = `
  id, circle_id, user_id, note, created_at, invited_by_user_id,
  users(id, name, handle, tint, ${USER_AVATAR_MEDIA_SELECT}),
  inviter:users!circle_join_requests_invited_by_user_id_fkey(id, name, handle, tint)
`;

const JOIN_REQUEST_SELECT_LEGACY = `
  id, circle_id, user_id, note, created_at,
  users(id, name, handle, tint, ${USER_AVATAR_MEDIA_SELECT})
`;

const JOIN_REQUEST_SELECT_WITH_INVITER = `
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

export type PendingIncomingJoinRow = {
  id: string;
  circle_id: string;
  user_id: string;
  note: string | null;
  created_at: string;
};

export type HubCircleJoinRequestGroup = {
  circleId: string;
  circleDbId: string;
  circleName: string;
  requests: CircleJoinRequestProfile[];
};

/** Direct fetch — mirrors the working count query in PawCircleContext. */
async function fetchPendingJoinRequestRows(
  build: (q: any) => any,
): Promise<JoinRequestRow[]> {
  const bare = await build((supabase as any).from('circle_join_requests'))
    .select(JOIN_REQUEST_BARE_SELECT);
  if (!bare.error && bare.data) {
    return enrichJoinRequestRows(bare.data as JoinRequestRow[]);
  }

  // Fallback only if bare select fails (shouldn't on a normal schema).
  const selects = [JOIN_REQUEST_SELECT_WITH_INVITER, JOIN_REQUEST_SELECT_LEGACY, JOIN_REQUEST_SELECT];
  for (const select of selects) {
    const result = await build((supabase as any).from('circle_join_requests')).select(select);
    if (!result.error && result.data) {
      const rows = result.data as unknown as JoinRequestRow[];
      const needsEnrich = select !== JOIN_REQUEST_SELECT && rows.some(r => !r.users);
      return needsEnrich ? enrichJoinRequestRows(rows) : rows;
    }
  }

  return [];
}

export function buildHubJoinRequestGroups(
  rows: JoinRequestRow[],
  circles: { id: string; dbId: string; name: string }[],
): HubCircleJoinRequestGroup[] {
  const byCircle = new Map<string, CircleJoinRequestProfile[]>();
  for (const row of rows) {
    if (!row.circle_id) continue;
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
  return nextGroups;
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

export function useCircleJoinRequests(
  circleDbId: string | null | undefined,
  seedRows: PendingIncomingJoinRow[] = [],
) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CircleJoinRequestProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const loadGenRef = useRef(0);
  const seedRowsRef = useRef(seedRows);
  seedRowsRef.current = seedRows;
  const seedKey = seedRows.map(r => r.id).sort().join(',');

  useEffect(() => {
    if (seedRowsRef.current.length === 0) return;
    const seedGen = loadGenRef.current;
    setRequests(mapJoinRequestRows(seedRowsRef.current));
    let cancelled = false;
    void enrichJoinRequestRows(seedRowsRef.current).then(enriched => {
      if (cancelled || seedGen !== loadGenRef.current) return;
      const list = mapJoinRequestRows(enriched);
      if (list.length > 0) {
        seedJoinRequestProfiles(list);
        setRequests(list);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [seedKey, circleDbId]);

  const load = useCallback(async () => {
    if (!circleDbId || !user) {
      setRequests([]);
      setLoading(false);
      return;
    }
    const gen = ++loadGenRef.current;
    setLoading(true);
    try {
      const data = await fetchPendingJoinRequestRows(q =>
        q.eq('circle_id', circleDbId)
          .eq('state', 'pending')
          .neq('user_id', user.id),
      );

      if (gen !== loadGenRef.current) return;

      const requestList = mapJoinRequestRows(data);
      setRequests(requestList);
      if (requestList.length > 0) seedJoinRequestProfiles(requestList);
    } catch {
      // Keep context-seeded rows if refresh fails.
    } finally {
      setLoading(false);
    }
  }, [circleDbId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const dismissRequest = useCallback((requestId: string) => {
    setRequests(prev => prev.filter(r => r.id !== requestId));
  }, []);

  return { requests, loading, refresh: load, dismissRequest };
}

/** Pending join requests across every circle the user admins. */
export function useHubCircleJoinRequests(
  circles: { id: string; dbId: string; name: string }[],
  enabled: boolean,
  seedRows: PendingIncomingJoinRow[] = [],
) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<HubCircleJoinRequestGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const circlesRef = useRef(circles);
  circlesRef.current = circles;
  const seedRowsRef = useRef(seedRows);
  seedRowsRef.current = seedRows;
  const loadGenRef = useRef(0);
  const circleKey = circles.map(c => c.dbId).filter(Boolean).sort().join(',');
  const seedKey = seedRows.map(r => r.id).sort().join(',');

  const load = useCallback(async () => {
    const currentCircles = circlesRef.current;
    const dbIds = currentCircles.map(c => c.dbId).filter(Boolean);
    if (dbIds.length === 0 || !user) {
      setGroups([]);
      setLoading(false);
      return;
    }

    const gen = ++loadGenRef.current;
    setLoading(true);
    try {
      const data = await fetchPendingJoinRequestRows(q =>
        q.in('circle_id', dbIds)
          .eq('state', 'pending')
          .neq('user_id', user.id),
      );

      if (gen !== loadGenRef.current) return;

      const nextGroups = buildHubJoinRequestGroups(data as JoinRequestRowWithCircle[], currentCircles);
      setGroups(nextGroups);
      if (nextGroups.length > 0) {
        seedJoinRequestProfiles(nextGroups.flatMap(g => g.requests));
      }
    } catch {
      // Keep context-seeded groups visible if the refresh fails.
    } finally {
      setLoading(false);
    }
  }, [circleKey, user?.id]);

  // Show context-cached rows instantly, then enrich profiles in the background.
  useEffect(() => {
    if (!enabled || seedRowsRef.current.length === 0) return;
    const seedGen = loadGenRef.current;
    setGroups(buildHubJoinRequestGroups(seedRowsRef.current, circlesRef.current));
    let cancelled = false;
    void enrichJoinRequestRows(seedRowsRef.current).then(enriched => {
      if (cancelled || seedGen !== loadGenRef.current) return;
      const seeded = buildHubJoinRequestGroups(enriched, circlesRef.current);
      if (seeded.length > 0) {
        seedJoinRequestProfiles(seeded.flatMap(g => g.requests));
        setGroups(seeded);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [enabled, seedKey, circleKey]);

  useEffect(() => {
    if (enabled) {
      void load();
    } else {
      setGroups([]);
      setLoading(false);
    }
  }, [enabled, load]);

  const totalCount = groups.reduce((sum, g) => sum + g.requests.length, 0);

  const dismissRequest = useCallback((requestId: string) => {
    setGroups(prev => prev
      .map(g => ({ ...g, requests: g.requests.filter(r => r.id !== requestId) }))
      .filter(g => g.requests.length > 0));
  }, []);

  return { groups, loading, refresh: load, totalCount, dismissRequest };
}
