import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { registerDevReset } from '../dev/devResetRegistry';
import {
  FeedCircleEntry,
  PawCircle,
  resolvePawCircle,
  toFeedEntry,
} from '../data/pawCircles';

const ONBOARDING_KEY = 'parul:circles:onboarded:v1';

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
};

type CircleEntry = {
  circle: PawCircle;
  dbId: string;
  isAdmin: boolean;
};

type PawCircleContextValue = {
  ready: boolean;
  onboardingComplete: boolean;
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  feedCreated: FeedCircleEntry[];
  feedJoined: FeedCircleEntry[];
  defaultCircleId: string | null;
  completeOnboarding: (opts: { joinLocal: boolean }) => Promise<void>;
  joinCircle: (id: string) => Promise<void>;
  leaveCircle: (id: string) => Promise<void>;
  createCircle: (name: string, location: string, privacy?: PawCircle['privacy'], slug?: string) => Promise<PawCircle>;
  updateCircle: (id: string, patch: { name?: string; bio?: string; location?: string; privacy?: PawCircle['privacy'] }) => Promise<void>;
  deleteCircle: (id: string) => Promise<void>;
  isJoined: (id: string) => boolean;
  isPending: (id: string) => boolean;
  getCircle: (id: string) => PawCircle | null;
  getDbId: (id: string) => string | null;
  exploreCircles: PawCircle[];
  resetPawCircles: () => Promise<void>;
};

const PawCircleContext = createContext<PawCircleContextValue | null>(null);

function dbRowToPawCircle(row: DbCircleRow): PawCircle {
  return {
    id: row.slug ?? row.id,
    name: row.name,
    location: row.location ?? '',
    memberCount: row.member_count ?? 0,
    icon: row.icon ?? 'paw',
    tint: row.tint ?? '#7C5CBF',
    iconBg: row.icon_bg ?? '#F0EBFA',
    tagline: row.tagline ?? undefined,
    bio: row.bio ?? undefined,
    tags: row.tags,
    privacy: row.privacy,
  };
}

export function PawCircleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [entries, setEntries] = useState<CircleEntry[]>([]);
  const [pendingDbIds, setPendingDbIds] = useState<Set<string>>(new Set());
  const [exploreCircles, setExploreCircles] = useState<PawCircle[]>([]);

  // Slug/id → DB UUID, populated dynamically by load functions and createCircle
  const dbIdMapRef = useRef<Record<string, string>>({});

  const getDbId = useCallback((externalId: string): string | null => {
    return dbIdMapRef.current[externalId] ?? null;
  }, []);

  const loadJoinedCircles = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setReady(true);
      return;
    }
    const { data, error } = await supabase
      .from('circle_members')
      .select('role, circles(id, slug, name, location, icon, tint, icon_bg, tagline, bio, tags, privacy, created_by)')
      .eq('user_id', user.id);

    if (error) {
      setReady(true);
      return;
    }

    const newEntries: CircleEntry[] = [];
    for (const row of (data ?? []) as unknown as { role: 'admin' | 'member'; circles: DbCircleRow | null }[]) {
      const c = row.circles;
      if (!c) continue;
      const externalId = c.slug ?? c.id;
      dbIdMapRef.current[externalId] = c.id;
      newEntries.push({
        circle: dbRowToPawCircle({ ...c, role: row.role }),
        dbId: c.id,
        isAdmin: row.role === 'admin',
      });
    }

    const { data: reqData } = await supabase
      .from('circle_join_requests')
      .select('circle_id')
      .eq('user_id', user.id)
      .eq('state', 'pending');
    setPendingDbIds(new Set((reqData ?? []).map(r => (r as { circle_id: string }).circle_id)));

    setEntries(newEntries);
    setReady(true);
  }, [user]);

  const loadExploreCircles = useCallback(async () => {
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
      if (fbErr || !fallback) return;
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
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(v => {
      if (v === 'true') setOnboardingComplete(true);
    });
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

  // Realtime: update pending set when user's join requests change state
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

  const completeOnboarding = useCallback(async ({ joinLocal }: { joinLocal: boolean }) => {
    if (joinLocal) {
      // Find the first discoverable open circle and join it automatically
      const firstOpen = exploreCircles.find(c => c.privacy === 'open');
      if (firstOpen) {
        const dbId = getDbId(firstOpen.id);
        if (dbId && !entries.some(e => e.dbId === dbId)) {
          await supabase.rpc('join_circle' as never, { p_circle_id: dbId } as never);
          setEntries(prev => [
            ...prev,
            { circle: firstOpen, dbId, isAdmin: false },
          ]);
        }
      }
    }
    setOnboardingComplete(true);
    AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  }, [entries, getDbId, exploreCircles]);

  const joinCircle = useCallback(async (id: string) => {
    if (entries.some(e => e.circle.id === id)) return;
    const dbId = getDbId(id);
    if (!dbId) return;

    // Resolve circle from joined entries or explore list
    const allKnown = [...entries.map(e => e.circle), ...exploreCircles];
    const circle = resolvePawCircle(id, allKnown);

    if (circle?.privacy === 'request') {
      setPendingDbIds(prev => new Set([...prev, dbId]));
      await supabase.rpc('send_circle_request' as never, { p_circle_id: dbId } as never);
    } else {
      if (circle) {
        setEntries(prev => [...prev, { circle, dbId, isAdmin: false }]);
      }
      await supabase.rpc('join_circle' as never, { p_circle_id: dbId } as never);
    }
  }, [entries, getDbId, exploreCircles]);

  const leaveCircle = useCallback(async (id: string) => {
    const entry = entries.find(e => e.circle.id === id);
    if (!entry) return;

    setEntries(prev => prev.filter(e => e.circle.id !== id));
    await supabase.rpc('leave_circle' as never, { p_circle_id: entry.dbId } as never);
  }, [entries]);

  const createCircle = useCallback(async (
    name: string,
    location: string,
    privacy: PawCircle['privacy'] = 'open',
    slug?: string,
  ): Promise<PawCircle> => {
    const rpcParams: Record<string, string> = { p_name: name, p_location: location, p_privacy: privacy };
    if (slug) rpcParams.p_slug = slug;
    const { data, error } = await supabase.rpc(
      'create_circle' as never,
      rpcParams as never,
    ) as { data: { id: string; slug: string } | null; error: unknown };

    if (error || !data) throw error ?? new Error('create_circle returned no data');

    const { id: dbId, slug: returnedSlug } = data;
    dbIdMapRef.current[returnedSlug] = dbId;

    const circle: PawCircle = {
      id: returnedSlug,
      name: name.trim(),
      location: location.trim(),
      memberCount: 1,
      icon: 'paw',
      tint: '#7C5CBF',
      iconBg: '#F0EBFA',
      privacy,
    };
    setEntries(prev => [...prev, { circle, dbId, isAdmin: true }]);
    // Refresh explore list so the new circle appears for other users
    loadExploreCircles();
    return circle;
  }, [loadExploreCircles]);

  const updateCircle = useCallback(async (
    id: string,
    patch: { name?: string; bio?: string; location?: string; privacy?: PawCircle['privacy'] },
  ) => {
    const entry = entries.find(e => e.circle.id === id);
    if (!entry || !entry.isAdmin) return;

    const update: Record<string, string> = {};
    if (patch.name     != null) update.name     = patch.name.trim();
    if (patch.bio      != null) update.bio       = patch.bio.trim();
    if (patch.location != null) update.location  = patch.location.trim();
    if (patch.privacy  != null) update.privacy   = patch.privacy;

    setEntries(prev => prev.map(e => {
      if (e.circle.id !== id) return e;
      return { ...e, circle: { ...e.circle, ...update } };
    }));

    await supabase.from('circles').update(update as never).eq('id', entry.dbId);
  }, [entries]);

  const deleteCircle = useCallback(async (id: string) => {
    const entry = entries.find(e => e.circle.id === id);
    if (!entry || !entry.isAdmin) return;
    await supabase.from('circles').delete().eq('id', entry.dbId);
    setEntries(prev => prev.filter(e => e.circle.id !== id));
    loadExploreCircles();
  }, [entries, loadExploreCircles]);

  const resetPawCircles = useCallback(async () => {
    if (user) {
      await supabase.from('circle_members').delete().eq('user_id', user.id);
    }
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setEntries([]);
    setOnboardingComplete(false);
  }, [user]);

  useEffect(() => registerDevReset(resetPawCircles), [resetPawCircles]);

  const value = useMemo((): PawCircleContextValue => {
    const created = entries.filter(e => e.isAdmin).map(e => e.circle);
    const joined  = entries.map(e => e.circle);
    const createdIds = new Set(created.map(c => c.id));
    const feedCreated = created.map(toFeedEntry);
    const feedJoined  = joined.filter(c => !createdIds.has(c.id)).map(toFeedEntry);
    const defaultCircleId = feedCreated[0]?.id ?? feedJoined[0]?.id ?? null;
    const joinedIds = new Set(joined.map(c => c.id));

    return {
      ready,
      onboardingComplete,
      createdCircles: created,
      joinedCircles: joined,
      feedCreated,
      feedJoined,
      defaultCircleId,
      completeOnboarding,
      joinCircle,
      leaveCircle,
      createCircle,
      updateCircle,
      deleteCircle,
      isJoined: (id: string) => joinedIds.has(id),
      isPending: (id: string) => {
        const dbId = dbIdMapRef.current[id];
        return dbId ? pendingDbIds.has(dbId) : false;
      },
      getCircle: (id: string) => {
        const fromDb = entries.find(e => e.circle.id === id);
        if (fromDb) return fromDb.circle;
        return exploreCircles.find(c => c.id === id) ?? null;
      },
      getDbId,
      exploreCircles,
      resetPawCircles,
    };
  }, [
    entries, pendingDbIds, ready, onboardingComplete, exploreCircles,
    completeOnboarding, joinCircle, leaveCircle,
    createCircle, updateCircle, deleteCircle, resetPawCircles, getDbId,
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
