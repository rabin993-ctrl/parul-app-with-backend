import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  USER_WITH_AVATAR_SELECT,
  userMiniFromJoin,
  type UserWithAvatarJoin,
} from '../lib/avatarMedia';

export type UserMini = {
  id: string;
  name: string;
  handle: string;
  tint: string;
  avatarUrl?: string;
  avatarFallbackUrl?: string;
  avatarOriginalUrl?: string;
};

// Module-level cache — shared across all hook instances
const profileCache: Record<string, UserMini> = {};
const inflight: Set<string> = new Set();
const listeners: Map<string, Set<() => void>> = new Map();

function notify(id: string) {
  listeners.get(id)?.forEach(fn => fn());
}

async function fetchProfile(id: string) {
  if (profileCache[id] || inflight.has(id)) return;
  inflight.add(id);
  const { data } = await (supabase as any)
    .from('users')
    .select(USER_WITH_AVATAR_SELECT)
    .eq('id', id)
    .single();
  if (data) {
    profileCache[id] = userMiniFromJoin(data as unknown as UserWithAvatarJoin);
  }
  inflight.delete(id);
  notify(id);
}

/** Populate the shared profile cache from list queries (e.g. circle members). */
export function seedUserProfiles(profiles: UserMini[]) {
  for (const profile of profiles) {
    profileCache[profile.id] = profile;
  }
}

/** Sync read from the module-level cache (for use in callbacks). */
export function getCachedProfile(id: string): UserMini | null {
  return profileCache[id] ?? null;
}

/** Invalidate cached profile (e.g. after avatar upload for current user). */
export function invalidateUserProfile(id: string) {
  delete profileCache[id];
  notify(id);
}

/** Hook that fetches and caches a user profile by ID. Returns null while loading. */
export function useUserProfile(id: string | null | undefined): UserMini | null {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!id) return;
    if (profileCache[id]) return;

    const set = listeners.get(id) ?? new Set<() => void>();
    const rerender = () => setTick(t => t + 1);
    set.add(rerender);
    listeners.set(id, set);

    fetchProfile(id);

    return () => {
      set.delete(rerender);
      if (set.size === 0) listeners.delete(id);
    };
  }, [id]);

  if (!id) return null;
  return profileCache[id] ?? null;
}
