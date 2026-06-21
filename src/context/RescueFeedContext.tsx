import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { registerDevReset } from '../dev/devResetRegistry';
import { loadRescueUpdateMediaUrls, uploadRescueUpdatePhotos } from '../lib/rescueMedia';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { PickedAsset } from '../hooks/useMediaPicker';
import {
  formatRescueUpdateTime,
  type RescueCase,
  type RescueStatus,
  type RescueUpdate,
} from '../data/profileData';

// ─────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────

export type CreateCaseInput = {
  name: string;
  species: 'dog' | 'cat' | 'other';
  headline: string;
  location: string;
  story: string;
  status: RescueStatus;
  tint?: string;
  icon?: string;
  photoCount?: number;
};

export type RescueUpdatePayload = {
  text: string;
  photoCount: number;
  photos?: PickedAsset[];
  newStatus?: RescueStatus;
};

type RescueFeedContextValue = {
  cases: RescueCase[];
  followedIds: Set<string>;
  isFollowing: (id: string) => boolean;
  toggleFollow: (id: string) => void;
  addCase: (input: CreateCaseInput) => RescueCase;
  addUpdate: (caseId: string, payload: RescueUpdatePayload) => void;
};

// ─────────────────────────────────────────────────────────
// Internal DB row shapes (subset of columns we select)
// ─────────────────────────────────────────────────────────

type DbCaseRow = {
  id: string;
  poster_user_id: string;
  case_code: string | null;
  name: string;
  species: string;
  icon: string | null;
  tint: string | null;
  status: string;
  location: string | null;
  headline: string | null;
  story: string | null;
  tags: string[];
  post_id: string | null;
  created_at: string;
};

type DbUpdateRow = {
  id: string;
  case_id: string;
  text: string | null;
  photo_count: number;
  created_at: string;
};

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const SPECIES_META = {
  dog:   { tint: '#14A697', icon: 'dog' },
  cat:   { tint: '#7A5AE0', icon: 'cat' },
  other: { tint: '#C98E2A', icon: 'paw' },
} as const;

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function newCaseId(): string {
  return (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(iso: string): string {
  return formatRescueUpdateTime(new Date(iso));
}

function mapUpdateRow(u: DbUpdateRow): RescueUpdate {
  const photoCount = u.photo_count ?? 0;
  return {
    id: u.id,
    time: formatDate(u.created_at),
    text: u.text ?? '',
    photoCount,
    hasPhoto: photoCount > 0,
  };
}

function attachMediaToCases(
  cases: RescueCase[],
  mediaMap: Record<string, string[]>,
): RescueCase[] {
  return cases.map(c => ({
    ...c,
    updates: (c.updates ?? []).map(u => ({
      ...u,
      mediaUrls: mediaMap[u.id] ?? u.mediaUrls,
      photoCount: mediaMap[u.id]?.length ?? u.photoCount ?? 0,
    })),
  }));
}

function mapCase(
  row: DbCaseRow,
  allUpdates: DbUpdateRow[],
  followerCounts: Map<string, number>,
): RescueCase {
  const speciesKey = (row.species as keyof typeof SPECIES_META) in SPECIES_META
    ? (row.species as keyof typeof SPECIES_META)
    : 'other';
  return {
    id: row.id,
    userId: row.poster_user_id,
    name: row.name,
    species: row.species,
    icon: row.icon ?? SPECIES_META[speciesKey].icon,
    tint: row.tint ?? SPECIES_META[speciesKey].tint,
    status: row.status as RescueStatus,
    date: formatDate(row.created_at),
    location: row.location ?? '',
    story: row.story ?? '',
    postId: row.post_id ?? undefined,
    caseId: row.case_code ?? undefined,
    headline: row.headline ?? undefined,
    tags: row.tags ?? [],
    followers: followerCounts.get(row.id) ?? 0,
    updates: allUpdates
      .filter(u => u.case_id === row.id)
      .map(mapUpdateRow),
  };
}

// ─────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────

const RescueFeedContext = createContext<RescueFeedContextValue | null>(null);

export function RescueFeedProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [cases, setCases] = useState<RescueCase[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  // Keep a ref so async callbacks always see latest userId
  const userIdRef = useRef(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // ── Load data ───────────────────────────────────────────

  const loadData = useCallback(async () => {
    // Fetch cases, updates and (if authed) current user's followed IDs in parallel
    const casesQuery = supabase
      .from('rescue_cases')
      .select('id, poster_user_id, case_code, name, species, icon, tint, status, location, headline, story, tags, post_id, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const updatesQuery = supabase
      .from('rescue_updates')
      .select('id, case_id, text, photo_count, created_at')
      .order('created_at', { ascending: false });

    // All follower rows – used for counts (RLS allows all reads)
    const allFollowersQuery = supabase
      .from('rescue_case_followers')
      .select('case_id');

    // Current user's followed IDs
    const myFollowedQuery = userIdRef.current
      ? supabase
          .from('rescue_case_followers')
          .select('case_id')
          .eq('user_id', userIdRef.current)
      : Promise.resolve({ data: [] as { case_id: string }[], error: null });

    const [casesRes, updatesRes, allFollowersRes, myFollowedRes] = await Promise.all([
      casesQuery,
      updatesQuery,
      allFollowersQuery,
      myFollowedQuery,
    ]);

    const caseRows: DbCaseRow[] = casesRes.data ?? [];
    const updateRows: DbUpdateRow[] = updatesRes.data ?? [];

    const updateIds = updateRows.map(u => u.id);
    const mediaMap = await loadRescueUpdateMediaUrls(updateIds);

    // Build follower count map
    const followerCounts = new Map<string, number>();
    for (const row of allFollowersRes.data ?? []) {
      followerCounts.set(row.case_id, (followerCounts.get(row.case_id) ?? 0) + 1);
    }

    // Build followed set for current user
    const myFollowed = new Set<string>((myFollowedRes.data ?? []).map(r => r.case_id));

    setCases(prev => {
      const fetched = attachMediaToCases(
        caseRows.map(r => mapCase(r, updateRows, followerCounts)),
        mediaMap,
      );
      const fetchedIds = new Set(fetched.map(c => c.id));
      const pending = prev.filter(c => !fetchedIds.has(c.id));
      return [...pending, ...fetched];
    });
    setFollowedIds(myFollowed);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, userId]); // re-load when auth state changes

  // ── Dev reset ───────────────────────────────────────────

  const resetDevState = useCallback(async () => {
    await loadData();
  }, [loadData]);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

  // ── isFollowing ─────────────────────────────────────────

  const isFollowing = useCallback((id: string) => followedIds.has(id), [followedIds]);

  // ── toggleFollow (optimistic) ───────────────────────────

  const toggleFollow = useCallback((id: string) => {
    const uid = userIdRef.current;
    if (!uid) return;

    const wasFollowing = followedIds.has(id);

    // Optimistic state update
    setFollowedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Optimistic follower count bump/decrement
    setCases(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, followers: (c.followers ?? 0) + (wasFollowing ? -1 : 1) }
          : c,
      ),
    );

    // Persist to DB
    (async () => {
      let err: unknown;
      if (wasFollowing) {
        ({ error: err } = await supabase
          .from('rescue_case_followers')
          .delete()
          .eq('case_id', id)
          .eq('user_id', uid));
      } else {
        ({ error: err } = await supabase
          .from('rescue_case_followers')
          .insert({ case_id: id, user_id: uid }));
      }
      if (err) {
        // Revert on error
        setFollowedIds(prev => {
          const next = new Set(prev);
          if (wasFollowing) next.add(id);
          else next.delete(id);
          return next;
        });
        setCases(prev =>
          prev.map(c =>
            c.id === id
              ? { ...c, followers: (c.followers ?? 0) + (wasFollowing ? 1 : -1) }
              : c,
          ),
        );
      }
    })();
  }, [followedIds]);

  // ── addUpdate (optimistic) ──────────────────────────────

  const addUpdate = useCallback((caseId: string, payload: RescueUpdatePayload) => {
    const optimisticId = `u${Date.now()}`;
    const optimisticMediaUrls = payload.photos?.map(p => p.uri);
    const update: RescueUpdate = {
      id: optimisticId,
      time: formatRescueUpdateTime(),
      text: payload.text,
      photoCount: payload.photoCount,
      hasPhoto: payload.photoCount > 0,
      mediaUrls: optimisticMediaUrls,
    };

    setCases(prev =>
      prev.map(c => {
        if (c.id !== caseId) return c;
        return {
          ...c,
          updates: [update, ...(c.updates ?? [])],
          ...(payload.newStatus ? { status: payload.newStatus } : {}),
        };
      }),
    );

    (async () => {
      const { data, error } = await supabase
        .from('rescue_updates')
        .insert({
          case_id: caseId,
          text: payload.text,
          photo_count: payload.photoCount,
          has_video: false,
        })
        .select('id')
        .single();

      if (payload.newStatus) {
        await supabase
          .from('rescue_cases')
          .update({ status: payload.newStatus })
          .eq('id', caseId);
      }

      if (error) {
        setCases(prev =>
          prev.map(c =>
            c.id === caseId
              ? { ...c, updates: (c.updates ?? []).filter(u => u.id !== optimisticId) }
              : c,
          ),
        );
        return;
      }

      const realId = data?.id;
      if (!realId) return;

      let mediaUrls = optimisticMediaUrls;
      const uid = userIdRef.current;
      if (payload.photos?.length && uid) {
        try {
          mediaUrls = await uploadRescueUpdatePhotos(realId, uid, payload.photos);
        } catch {
          // Keep optimistic local URIs if upload fails
        }
      }

      setCases(prev =>
        prev.map(c =>
          c.id === caseId
            ? {
                ...c,
                updates: (c.updates ?? []).map(u =>
                  u.id === optimisticId
                    ? { ...u, id: realId, mediaUrls }
                    : u,
                ),
              }
            : c,
        ),
      );
    })();
  }, []);

  // ── addCase (optimistic, returns synchronously) ─────────

  const addCase = useCallback((input: CreateCaseInput): RescueCase => {
    const uid = userIdRef.current ?? 'unknown';
    const meta = SPECIES_META[input.species] ?? SPECIES_META.other;
    const now = new Date();
    const caseId = newCaseId();
    const caseCode = `RC${String(Date.now()).slice(-6)}`;

    const item: RescueCase = {
      id: caseId,
      userId: uid,
      name: input.name.trim(),
      species: input.species,
      icon: input.icon ?? meta.icon,
      tint: input.tint ?? meta.tint,
      status: input.status,
      date: formatRescueUpdateTime(now),
      location: input.location.trim(),
      headline: input.headline.trim(),
      story: input.story.trim(),
      caseId: caseCode,
      followers: 0,
      tags: [input.species === 'dog' ? 'Dog' : input.species === 'cat' ? 'Cat' : 'Other'],
      updates: [],
    };

    setCases(prev => [item, ...prev]);

    (async () => {
      if (!userIdRef.current) return;

      const { error } = await supabase
        .from('rescue_cases')
        .insert({
          id: caseId,
          poster_user_id: userIdRef.current,
          case_code: caseCode,
          name: input.name.trim(),
          species: input.species,
          icon: input.icon ?? meta.icon,
          tint: input.tint ?? meta.tint,
          status: input.status,
          location: input.location.trim(),
          headline: input.headline.trim(),
          story: input.story.trim(),
          tags: [input.species === 'dog' ? 'Dog' : input.species === 'cat' ? 'Cat' : 'Other'],
        });

      if (error) {
        setCases(prev => prev.filter(c => c.id !== caseId));
      }
    })();

    return item;
  }, []);

  // ── Context value ───────────────────────────────────────

  const value = useMemo(
    () => ({ cases, followedIds, isFollowing, toggleFollow, addCase, addUpdate }),
    [cases, followedIds, isFollowing, toggleFollow, addCase, addUpdate],
  );

  return (
    <RescueFeedContext.Provider value={value}>
      {children}
    </RescueFeedContext.Provider>
  );
}

export function useRescueFeed() {
  const ctx = useContext(RescueFeedContext);
  if (!ctx) throw new Error('useRescueFeed must be used within RescueFeedProvider');
  return ctx;
}

export function useRescueFeedOptional() {
  return useContext(RescueFeedContext);
}
