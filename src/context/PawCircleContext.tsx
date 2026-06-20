import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { toSlugDraft } from '../lib/circleSlug';
import { supabase } from '../lib/supabase';
import { avatarUrlsFromMedia, normalizeJoinedMedia } from '../lib/avatarMedia';
import { uploadMediaAsset, triggerThumbGeneration } from '../lib/uploads';
import type { PickedAsset } from '../hooks/useMediaPicker';
import { useAuth } from './AuthContext';
import { registerDevReset } from '../dev/devResetRegistry';
import {
  FeedCircleEntry,
  PawCircle,
  resolvePawCircle,
  toFeedEntry,
} from '../data/pawCircles';
import {
  JOIN_REQUEST_BARE_SELECT,
  type PendingIncomingJoinRow,
} from '../hooks/useCircleJoinRequests';

type DbCircleRow = {
  id: string;
  slug: string | null;
  name: string;
  location: string | null;
  icon: string | null;
  tint: string | null;
  icon_bg: string | null;
  tagline: string | null;
  bio: string | null;
  tags: string[];
  privacy: 'open' | 'request';
  created_by: string | null;
  role?: 'admin' | 'member';
  member_count?: number;
  avatar_media?: { url: string; thumb_url: string | null } | { url: string; thumb_url: string | null }[] | null;
  avatar_url?: string | null;
  avatar_thumb_url?: string | null;
};

type CircleEntry = {
  circle: PawCircle;
  dbId: string;
  isAdmin: boolean;
  muted: boolean;
};

export type InvitableCircleStatus =
  | 'available'
  | 'already_member'
  | 'invite_sent'
  | 'request_pending';

export type InvitableCircleRow = {
  circle: PawCircle;
  dbId: string;
  isAdmin: boolean;
  status: InvitableCircleStatus;
};

type PawCircleContextValue = {
  ready: boolean;
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  feedCreated: FeedCircleEntry[];
  feedJoined: FeedCircleEntry[];
  defaultCircleId: string | null;
  joinCircle: (id: string) => Promise<void>;
  cancelCircleRequest: (id: string) => Promise<void>;
  leaveCircle: (id: string) => Promise<void>;
  createCircle: (
    name: string,
    location: string,
    privacy?: PawCircle['privacy'],
    slug?: string,
    avatar?: PickedAsset | null,
  ) => Promise<PawCircle>;
  updateCircle: (id: string, patch: { name?: string; bio?: string; location?: string; privacy?: PawCircle['privacy']; slug?: string }) => Promise<string>;
  updateCircleAvatar: (id: string, avatar: PickedAsset) => Promise<void>;
  deleteCircle: (id: string) => Promise<void>;
  isJoined: (id: string) => boolean;
  isPending: (id: string) => boolean;
  getCircle: (id: string) => PawCircle | null;
  getDbId: (id: string) => string | null;
  /** Resolve a circle route id (slug or uuid) to the DB uuid. */
  resolveCircleDbId: (externalId: string) => string | null;
  /** Admin circles with stable DB ids for join-request queries. */
  adminCircles: { id: string; dbId: string; name: string }[];
  /** Reload memberships and pending request counts. */
  refreshMembership: () => Promise<void>;
  /** Instantly drop a handled join request from cached badge/sheet state. */
  dismissPendingJoinRequest: (requestId: string, circleDbId: string) => void;
  exploreCircles: PawCircle[];
  exploreLoading: boolean;
  resetPawCircles: () => Promise<void>;
  /** Number of pending incoming join requests across all circles the user admins */
  pendingIncomingRequestCount: number;
  /** Pending request count per circle DB UUID — for per-circle badge display */
  pendingCountByCircle: Record<string, number>;
  /** Cached pending rows (same query as badge count) — instant hub sheet display */
  pendingIncomingJoinRows: PendingIncomingJoinRow[];
  getCircleMuted: (id: string) => boolean;
  toggleCircleMute: (id: string, muted: boolean) => Promise<void>;
  fetchInvitableCircles: (inviteeUserId: string) => Promise<InvitableCircleRow[]>;
  sendCircleInvite: (circleId: string, inviteeUserId: string) => Promise<void>;
};

const PawCircleContext = createContext<PawCircleContextValue | null>(null);

function newMediaId(): string {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function uploadCircleAvatar(
  userId: string,
  dbId: string,
  avatar: PickedAsset,
): Promise<{ avatarUrl: string; avatarFallbackUrl: string; avatarOriginalUrl: string }> {
  const mediaId = newMediaId();
  const uploaded = await uploadMediaAsset({
    bucket: 'avatars',
    userId,
    mediaId,
    localUri: avatar.uri,
    ext: avatar.ext,
    mime: avatar.mime,
    width: avatar.width,
    height: avatar.height,
    bytes: avatar.bytes,
    generateVariants: false,
  });
  const { error } = await supabase
    .from('circles')
    .update({ avatar_media_id: mediaId } as never)
    .eq('id', dbId);
  if (error) throw error;
  triggerThumbGeneration();
  return {
    avatarUrl: uploaded.originalUrl,
    avatarFallbackUrl: uploaded.originalUrl,
    avatarOriginalUrl: uploaded.originalUrl,
  };
}

/** Collapse duplicate memberships for the same circle (same DB uuid). */
function dedupeCircleEntries(items: CircleEntry[]): CircleEntry[] {
  const byDbId = new Map<string, CircleEntry>();
  for (const entry of items) {
    const existing = byDbId.get(entry.dbId);
    if (!existing || (entry.isAdmin && !existing.isAdmin)) {
      byDbId.set(entry.dbId, entry);
    }
  }
  return Array.from(byDbId.values());
}

function dbRowToPawCircle(row: DbCircleRow): PawCircle {
  const joinedMedia = normalizeJoinedMedia(row.avatar_media);
  const urls = joinedMedia
    ? avatarUrlsFromMedia(joinedMedia)
    : row.avatar_url
      ? avatarUrlsFromMedia({ url: row.avatar_url, thumb_url: row.avatar_thumb_url ?? null })
      : {};

  return {
    id: row.slug ?? row.id,
    name: row.name,
    location: row.location ?? '',
    memberCount: row.member_count ?? 0,
    icon: row.icon ?? 'paw',
    tint: row.tint ?? '#7C5CBF',
    iconBg: row.icon_bg ?? '#F0EBFA',
    avatarUrl: urls.avatarUrl,
    avatarFallbackUrl: urls.avatarFallbackUrl,
    avatarOriginalUrl: urls.avatarOriginalUrl,
    tagline: row.tagline ?? undefined,
    bio: row.bio ?? undefined,
    tags: row.tags,
    privacy: row.privacy,
  };
}

export function PawCircleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<CircleEntry[]>([]);
  const [pendingDbIds, setPendingDbIds] = useState<Set<string>>(new Set());
  const [pendingCountByCircle, setPendingCountByCircle] = useState<Record<string, number>>({});
  const [pendingIncomingJoinRows, setPendingIncomingJoinRows] = useState<PendingIncomingJoinRow[]>([]);
  const [exploreCircles, setExploreCircles] = useState<PawCircle[]>([]);
  const [exploreLoading, setExploreLoading] = useState(true);

  // Slug/id → DB UUID, populated dynamically by load functions and createCircle
  const dbIdMapRef = useRef<Record<string, string>>({});

  const getDbId = useCallback((externalId: string): string | null => {
    return dbIdMapRef.current[externalId] ?? null;
  }, []);

  const dismissPendingJoinRequest = useCallback((requestId: string, circleDbId: string) => {
    setPendingIncomingJoinRows(prev => prev.filter(r => r.id !== requestId));
    setPendingCountByCircle(prev => {
      const next = { ...prev };
      const count = next[circleDbId] ?? 0;
      if (count <= 1) {
        delete next[circleDbId];
      } else {
        next[circleDbId] = count - 1;
      }
      return next;
    });
  }, []);

  const resolveCircleDbId = useCallback((externalId: string): string | null => {
    const mapped = dbIdMapRef.current[externalId];
    if (mapped) return mapped;
    const entry = entries.find(e => e.circle.id === externalId);
    if (entry) return entry.dbId;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(externalId)) {
      return externalId;
    }
    return null;
  }, [entries]);

  const loadJoinedCircles = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setReady(true);
      return;
    }

    const baseCircleFields = 'id, slug, name, location, icon, tint, icon_bg, tagline, bio, tags, privacy, created_by';
    const selectWithAvatar = `role, muted, circles(${baseCircleFields}, avatar_media:media_assets!circles_avatar_media_id_fkey(url, thumb_url))`;
    const selectWithoutAvatar = `role, muted, circles(${baseCircleFields})`;

    let data: unknown[] | null = null;
    const withAvatar = await supabase
      .from('circle_members')
      .select(selectWithAvatar)
      .eq('user_id', user.id);

    if (withAvatar.error) {
      const fallback = await supabase
        .from('circle_members')
        .select(selectWithoutAvatar)
        .eq('user_id', user.id);
      if (fallback.error) {
        setReady(true);
        return;
      }
      data = fallback.data;
    } else {
      data = withAvatar.data;
    }

    const newEntries: CircleEntry[] = [];
    const seenDbIds = new Set<string>();
    for (const row of (data ?? []) as unknown as { role: 'admin' | 'member'; muted: boolean; circles: DbCircleRow | null }[]) {
      const c = row.circles;
      if (!c || seenDbIds.has(c.id)) continue;
      seenDbIds.add(c.id);
      const externalId = c.slug ?? c.id;
      dbIdMapRef.current[externalId] = c.id;
      newEntries.push({
        circle: dbRowToPawCircle({ ...c, role: row.role }),
        dbId: c.id,
        isAdmin: row.role === 'admin',
        muted: row.muted ?? false,
      });
    }

    // User's own outgoing pending requests
    const { data: reqData } = await supabase
      .from('circle_join_requests')
      .select('circle_id')
      .eq('user_id', user.id)
      .eq('state', 'pending');
    setPendingDbIds(new Set((reqData ?? []).map(r => (r as { circle_id: string }).circle_id)));

    // Incoming pending requests for circles the user admins
    const adminDbIds = newEntries.filter(e => e.isAdmin).map(e => e.dbId);
    if (adminDbIds.length > 0) {
      const { data: incomingData } = await supabase
        .from('circle_join_requests')
        .select(JOIN_REQUEST_BARE_SELECT)
        .in('circle_id', adminDbIds)
        .eq('state', 'pending')
        .neq('user_id', user.id);
      const rows = (incomingData ?? []) as PendingIncomingJoinRow[];
      setPendingIncomingJoinRows(rows);
      const byCircle: Record<string, number> = {};
      for (const row of rows) {
        byCircle[row.circle_id] = (byCircle[row.circle_id] ?? 0) + 1;
      }
      setPendingCountByCircle(byCircle);
    } else {
      setPendingIncomingJoinRows([]);
      setPendingCountByCircle({});
    }

    // Fetch accurate member counts via the SECURITY DEFINER RPC so RLS on
    // circle_members doesn't block the aggregate (same path as ExploreCirclesScreen).
    if (newEntries.length > 0) {
      const { data: countRows } = await supabase.rpc('list_discoverable_circles' as never);
      if (countRows) {
        const countByDbId: Record<string, number> = {};
        for (const row of (countRows as { id: string; member_count: number }[])) {
          countByDbId[row.id] = Number(row.member_count);
        }
        for (const entry of newEntries) {
          entry.circle.memberCount = countByDbId[entry.dbId] ?? entry.circle.memberCount;
        }
      }
    }

    setEntries(dedupeCircleEntries(newEntries));
    setReady(true);
  }, [user]);

  const loadExploreCircles = useCallback(async () => {
    setExploreLoading(true);
    let rows: DbCircleRow[];

    const { data: rpcData, error: rpcError } = await supabase.rpc('list_discoverable_circles' as never);
    if (!rpcError && rpcData) {
      rows = rpcData as unknown as DbCircleRow[];
    } else {
      // Fallback: direct query without member counts (migration 0018 may not yet
      // be applied to this Supabase project). circles_select_active RLS policy
      // makes all non-deleted circles publicly readable.
      const { data: fallback, error: fbErr } = await (supabase as any)
        .from('circles')
        .select('id, slug, name, location, icon, tint, icon_bg, tagline, bio, tags, privacy, created_by')
        .is('deleted_at', null)
        .order('name');
      if (fbErr || !fallback) {
        setExploreLoading(false);
        return;
      }
      const DEMO_IDS = new Set([
        '11111111-1111-1111-1111-000000000001',
        '11111111-1111-1111-1111-000000000002',
        '11111111-1111-1111-1111-000000000003',
        '11111111-1111-1111-1111-000000000004',
        '11111111-1111-1111-1111-000000000005',
        '11111111-1111-1111-1111-000000000006',
        '11111111-1111-1111-1111-000000000007',
      ]);
      rows = (fallback as DbCircleRow[])
        .filter(r => !DEMO_IDS.has(r.id))
        .map(r => ({ ...r, member_count: 0 }));
    }

    const circles: PawCircle[] = [];
    for (const row of rows) {
      const externalId = row.slug ?? row.id;
      dbIdMapRef.current[externalId] = row.id;
      circles.push(dbRowToPawCircle(row));
    }
    setExploreCircles(circles);
    setExploreLoading(false);
  }, []);

  useEffect(() => {
    loadJoinedCircles();
  }, [loadJoinedCircles]);

  useEffect(() => {
    loadExploreCircles();
  }, [loadExploreCircles]);

  // Realtime: re-fetch when the current user gains or loses a circle membership
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`circle_members:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'circle_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => { loadJoinedCircles(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadJoinedCircles]);

  // Realtime: update pending set when user's own join requests change state
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`circle_join_requests:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'circle_join_requests',
          filter: `user_id=eq.${user.id}`,
        },
        () => { loadJoinedCircles(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadJoinedCircles]);

  // Realtime: reload when any join request changes (catches incoming requests for admin circles)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`circle_join_requests:incoming:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'circle_join_requests' }, () => {
        loadJoinedCircles();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, loadJoinedCircles]);

  // Realtime: refresh explore list when any circle changes
  useEffect(() => {
    const channel = supabase
      .channel('circles:all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'circles' },
        () => { loadExploreCircles(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadExploreCircles]);

  const joinCircle = useCallback(async (id: string) => {
    const dbId = getDbId(id);
    if (!dbId || !user) return;
    if (entries.some(e => e.dbId === dbId || e.circle.id === id)) return;

    const { data: existingMember } = await supabase
      .from('circle_members')
      .select('role')
      .eq('circle_id', dbId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (existingMember) return;

    // Resolve circle from joined entries or explore list
    const allKnown = [...entries.map(e => e.circle), ...exploreCircles];
    const circle = resolvePawCircle(id, allKnown);

    if (circle?.privacy === 'request') {
      setPendingDbIds(prev => new Set([...prev, dbId]));
      await supabase.rpc('send_circle_request' as never, { p_circle_id: dbId } as never);
    } else {
      if (circle) {
        setEntries(prev => dedupeCircleEntries([
          ...prev,
          { circle, dbId, isAdmin: false, muted: false },
        ]));
      }
      await supabase.rpc('join_circle' as never, { p_circle_id: dbId } as never);
    }
  }, [entries, getDbId, exploreCircles, user]);

  const cancelCircleRequest = useCallback(async (id: string) => {
    const dbId = getDbId(id) ?? resolveCircleDbId(id);
    if (!dbId || !user) return;

    setPendingDbIds(prev => {
      const next = new Set(prev);
      next.delete(dbId);
      return next;
    });

    const { error } = await supabase.rpc('cancel_circle_request' as never, {
      p_circle_id: dbId,
    } as never);

    if (error) {
      setPendingDbIds(prev => new Set([...prev, dbId]));
      throw error;
    }
  }, [getDbId, resolveCircleDbId, user]);

  const leaveCircle = useCallback(async (id: string) => {
    const entry = entries.find(e => e.circle.id === id);
    if (!entry) return;

    await supabase.rpc('leave_circle' as never, { p_circle_id: entry.dbId } as never);
    setEntries(prev => prev.filter(e => e.dbId !== entry.dbId));
  }, [entries]);

  const createCircle = useCallback(async (
    name: string,
    location: string,
    privacy: PawCircle['privacy'] = 'open',
    slug?: string,
    avatar?: PickedAsset | null,
  ): Promise<PawCircle> => {
    if (!user) throw new Error('not_authenticated');

    const rpcParams: Record<string, string> = { p_name: name, p_location: location, p_privacy: privacy };
    if (slug) rpcParams.p_slug = slug;
    const { data, error } = await supabase.rpc(
      'create_circle' as never,
      rpcParams as never,
    ) as { data: { id: string; slug: string } | null; error: unknown };

    if (error || !data) throw error ?? new Error('create_circle returned no data');

    const { id: dbId, slug: returnedSlug } = data;
    dbIdMapRef.current[returnedSlug] = dbId;

    let avatarUrl: string | undefined;
    let avatarFallbackUrl: string | undefined;
    let avatarOriginalUrl: string | undefined;

    if (avatar) {
      const urls = await uploadCircleAvatar(user.id, dbId, avatar);
      avatarUrl = urls.avatarUrl;
      avatarFallbackUrl = urls.avatarFallbackUrl;
      avatarOriginalUrl = urls.avatarOriginalUrl;
    }

    const circle: PawCircle = {
      id: returnedSlug,
      name: name.trim(),
      location: location.trim(),
      memberCount: 1,
      icon: 'paw',
      tint: '#7C5CBF',
      iconBg: '#F0EBFA',
      avatarUrl,
      avatarFallbackUrl,
      avatarOriginalUrl,
      privacy,
    };
    setEntries(prev => dedupeCircleEntries([
      ...prev,
      { circle, dbId, isAdmin: true, muted: false },
    ]));
    loadExploreCircles();
    return circle;
  }, [user, loadExploreCircles]);

  const updateCircle = useCallback(async (
    id: string,
    patch: { name?: string; bio?: string; location?: string; privacy?: PawCircle['privacy']; slug?: string },
  ): Promise<string> => {
    const entry = entries.find(e => e.circle.id === id);
    if (!entry || !entry.isAdmin) return id;

    const update: Record<string, string> = {};
    let newId = id;

    if (patch.name     != null) update.name     = patch.name.trim();
    if (patch.bio      != null) update.bio       = patch.bio.trim();
    if (patch.location != null) update.location  = patch.location.trim();
    if (patch.privacy  != null) update.privacy   = patch.privacy;

    if (patch.slug != null) {
      const normalized = toSlugDraft(patch.slug);
      if (normalized && normalized !== id) {
        update.slug = normalized;
        newId = normalized;
      }
    }

    setEntries(prev => prev.map(e => {
      if (e.circle.id !== id) return e;
      const circlePatch: Partial<PawCircle> = {};
      if (patch.name     != null) circlePatch.name     = patch.name.trim();
      if (patch.bio      != null) circlePatch.bio      = patch.bio.trim();
      if (patch.location != null) circlePatch.location = patch.location.trim();
      if (patch.privacy  != null) circlePatch.privacy  = patch.privacy;
      if (newId !== id) {
        delete dbIdMapRef.current[id];
        dbIdMapRef.current[newId] = e.dbId;
        circlePatch.id = newId;
      }
      return { ...e, circle: { ...e.circle, ...circlePatch } };
    }));

    const { error } = await supabase.from('circles').update(update as never).eq('id', entry.dbId);
    if (error) throw error;

    if (newId !== id) loadExploreCircles();
    return newId;
  }, [entries, loadExploreCircles]);

  const updateCircleAvatar = useCallback(async (id: string, avatar: PickedAsset): Promise<void> => {
    if (!user) throw new Error('not_authenticated');
    const entry = entries.find(e => e.circle.id === id);
    if (!entry || !entry.isAdmin) return;

    const urls = await uploadCircleAvatar(user.id, entry.dbId, avatar);

    setEntries(prev => prev.map(e => {
      if (e.circle.id !== id) return e;
      return {
        ...e,
        circle: {
          ...e.circle,
          avatarUrl: urls.avatarUrl,
          avatarFallbackUrl: urls.avatarFallbackUrl,
          avatarOriginalUrl: urls.avatarOriginalUrl,
        },
      };
    }));
    loadExploreCircles();
  }, [user, entries, loadExploreCircles]);

  const deleteCircle = useCallback(async (id: string) => {
    const entry = entries.find(e => e.circle.id === id);
    if (!entry || !entry.isAdmin) return;
    await supabase.from('circles').update({ deleted_at: new Date().toISOString() }).eq('id', entry.dbId);
    setEntries(prev => prev.filter(e => e.dbId !== entry.dbId));
    loadExploreCircles();
  }, [entries, loadExploreCircles]);

  const toggleCircleMute = useCallback(async (id: string, muted: boolean) => {
    const entry = entries.find(e => e.circle.id === id);
    if (!entry || !user) return;
    setEntries(prev => prev.map(e => e.circle.id === id ? { ...e, muted } : e));
    await supabase.from('circle_members')
      .update({ muted })
      .eq('circle_id', entry.dbId)
      .eq('user_id', user.id);
  }, [entries, user]);

  const resetPawCircles = useCallback(async () => {
    if (user) {
      await supabase.from('circle_members').delete().eq('user_id', user.id);
    }
    setEntries([]);
  }, [user]);

  const fetchInvitableCircles = useCallback(async (inviteeUserId: string): Promise<InvitableCircleRow[]> => {
    if (!user) return [];
    const myEntries = dedupeCircleEntries(entries);
    if (myEntries.length === 0) return [];

    const dbIds = myEntries.map(e => e.dbId);

    const [memberRes, inviteRes, requestRes] = await Promise.all([
      supabase.from('circle_members').select('circle_id').eq('user_id', inviteeUserId).in('circle_id', dbIds),
      (supabase as any).from('circle_invites').select('circle_id')
        .eq('invitee_user_id', inviteeUserId)
        .eq('inviter_user_id', user.id)
        .eq('state', 'pending')
        .in('circle_id', dbIds),
      supabase.from('circle_join_requests').select('circle_id')
        .eq('user_id', inviteeUserId)
        .eq('state', 'pending')
        .in('circle_id', dbIds),
    ]);

    const memberSet = new Set((memberRes.data ?? []).map((r: { circle_id: string }) => r.circle_id));
    const inviteSet = new Set((inviteRes.data ?? []).map((r: { circle_id: string }) => r.circle_id));
    const requestSet = new Set((requestRes.data ?? []).map((r: { circle_id: string }) => r.circle_id));

    return myEntries.map(entry => {
      let status: InvitableCircleStatus = 'available';
      if (memberSet.has(entry.dbId)) status = 'already_member';
      else if (inviteSet.has(entry.dbId)) status = 'invite_sent';
      else if (requestSet.has(entry.dbId)) status = 'request_pending';

      return {
        circle: entry.circle,
        dbId: entry.dbId,
        isAdmin: entry.isAdmin,
        status,
      };
    }).sort((a, b) => {
      if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
      if (a.status === 'available' && b.status !== 'available') return -1;
      if (b.status === 'available' && a.status !== 'available') return 1;
      return a.circle.name.localeCompare(b.circle.name);
    });
  }, [entries, user]);

  const sendCircleInvite = useCallback(async (circleId: string, inviteeUserId: string) => {
    const dbId = getDbId(circleId);
    if (!dbId || !user) throw new Error('not_authenticated');

    const { error } = await supabase.rpc('send_circle_invite' as never, {
      p_circle_id: dbId,
      p_invitee_user_id: inviteeUserId,
    } as never);
    if (error) throw error;
  }, [getDbId, user]);

  useEffect(() => registerDevReset(resetPawCircles), [resetPawCircles]);

  const value = useMemo((): PawCircleContextValue => {
    const uniqueEntries = dedupeCircleEntries(entries);
    const created = uniqueEntries.filter(e => e.isAdmin).map(e => e.circle);
    const joined  = uniqueEntries.map(e => e.circle);
    const createdIds = new Set(created.map(c => c.id));
    const feedCreated = created.map(toFeedEntry);
    const feedJoined  = joined.filter(c => !createdIds.has(c.id)).map(toFeedEntry);
    const defaultCircleId = feedCreated[0]?.id ?? feedJoined[0]?.id ?? null;
    const joinedIds = new Set(joined.map(c => c.id));

    const pendingIncomingRequestCount = Object.values(pendingCountByCircle).reduce((a, b) => a + b, 0);

    return {
      ready,
      createdCircles: created,
      joinedCircles: joined,
      feedCreated,
      feedJoined,
      defaultCircleId,
      joinCircle,
      cancelCircleRequest,
      leaveCircle,
      createCircle,
      updateCircle,
      updateCircleAvatar,
      deleteCircle,
      isJoined: (id: string) => joinedIds.has(id),
      isPending: (id: string) => {
        const dbId = dbIdMapRef.current[id];
        return dbId ? pendingDbIds.has(dbId) : false;
      },
      getCircle: (id: string) => {
        const fromDb = uniqueEntries.find(e => e.circle.id === id);
        if (fromDb) return fromDb.circle;
        return exploreCircles.find(c => c.id === id) ?? null;
      },
      getDbId,
      resolveCircleDbId,
      adminCircles: uniqueEntries
        .filter(e => e.isAdmin)
        .map(e => ({ id: e.circle.id, dbId: e.dbId, name: e.circle.name })),
      refreshMembership: loadJoinedCircles,
      dismissPendingJoinRequest,
      exploreCircles,
      exploreLoading,
      resetPawCircles,
      pendingIncomingRequestCount,
      pendingCountByCircle,
      pendingIncomingJoinRows,
      getCircleMuted: (id: string) => uniqueEntries.find(e => e.circle.id === id)?.muted ?? false,
      toggleCircleMute,
      fetchInvitableCircles,
      sendCircleInvite,
    };
  }, [
    entries, pendingDbIds, pendingCountByCircle, pendingIncomingJoinRows, ready, exploreCircles, exploreLoading,
    joinCircle, leaveCircle, cancelCircleRequest,
    createCircle, updateCircle, updateCircleAvatar, deleteCircle, resetPawCircles,
    getDbId, resolveCircleDbId, loadJoinedCircles, dismissPendingJoinRequest, toggleCircleMute,
    fetchInvitableCircles, sendCircleInvite,
  ]);

  return (
    <PawCircleContext.Provider value={value}>
      {children}
    </PawCircleContext.Provider>
  );
}

export function usePawCircles() {
  const ctx = useContext(PawCircleContext);
  if (!ctx) throw new Error('usePawCircles must be used within PawCircleProvider');
  return ctx;
}
