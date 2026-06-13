import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type UserMini = {
  id: string;
  name: string;
  handle: string;
  tint: string;
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
  const { data } = await supabase
    .from('users')
    .select('id,name,handle,tint')
    .eq('id', id)
    .single();
  if (data) {
    profileCache[id] = {
      id: data.id,
      name: data.name,
      handle: data.handle ?? data.name,
      tint: data.tint ?? '#888888',
    };
  }
  inflight.delete(id);
  notify(id);
}

/** Sync read from the module-level cache (for use in callbacks). */
export function getCachedProfile(id: string): UserMini | null {
  return profileCache[id] ?? null;
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
