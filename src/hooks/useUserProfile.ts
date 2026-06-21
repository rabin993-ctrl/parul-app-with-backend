import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  USER_WITH_AVATAR_SELECT,
  userMiniFromJoin,
  type UserWithAvatarJoin,
} from '../lib/avatarMedia';
import {
  fetchUserPrivacyFlags,
  getCachedUserPrivacyFlags,
  refreshUserPrivacyFlags,
} from '../lib/userPrivacyFlagCache';

export type UserMini = {
  id: string;
  name: string;
  handle: string;
  tint: string;
  bio?: string;
  location?: string;
  showLocation?: boolean;
  showCompanions?: boolean;
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

function applyPrivacyToProfile(profile: UserMini): UserMini {
  const flags = getCachedUserPrivacyFlags(profile.id);
  if (!flags) return profile;
  return {
    ...profile,
    location: flags.showLocation ? profile.location : undefined,
    showLocation: flags.showLocation,
    showCompanions: flags.showCompanions,
  };
}

async function fetchProfile(id: string) {
  if (profileCache[id] || inflight.has(id)) return;
  inflight.add(id);
  const [{ data }] = await Promise.all([
    (supabase as any)
      .from('users')
      .select(USER_WITH_AVATAR_SELECT)
      .eq('id', id)
      .single(),
    fetchUserPrivacyFlags([id]),
  ]);
  if (data) {
    profileCache[id] = applyPrivacyToProfile(userMiniFromJoin(data as unknown as UserWithAvatarJoin));
  }
  inflight.delete(id);
  notify(id);
}

/** Populate the shared profile cache from list queries (e.g. circle members). */
export function seedUserProfiles(profiles: UserMini[]) {
  for (const profile of profiles) {
    profileCache[profile.id] = applyPrivacyToProfile(profile);
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

    const set = listeners.get(id) ?? new Set<() => void>();
    const rerender = () => setTick(t => t + 1);
    set.add(rerender);
    listeners.set(id, set);

    if (!profileCache[id]) {
      fetchProfile(id);
    } else {
      void refreshUserPrivacyFlags([id]).then(() => {
        if (profileCache[id]) {
          profileCache[id] = applyPrivacyToProfile(profileCache[id]);
          notify(id);
        }
      });
    }

    return () => {
      set.delete(rerender);
      if (set.size === 0) listeners.delete(id);
    };
  }, [id]);

  if (!id) return null;
  return profileCache[id] ?? null;
}
