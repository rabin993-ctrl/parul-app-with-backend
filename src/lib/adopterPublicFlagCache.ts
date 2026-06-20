import { supabase } from './supabase';
import { isAdoptionUserFlag, type AdoptionUserFlag } from '../utils/adoptionUserFlag';

const cache = new Map<string, AdoptionUserFlag | null>();
const listeners = new Set<() => void>();
const inflight = new Map<string, Promise<void>>();

function notify() {
  listeners.forEach(listener => listener());
}

export function getCachedAdopterFlag(userId: string): AdoptionUserFlag | null | undefined {
  if (!cache.has(userId)) return undefined;
  return cache.get(userId) ?? null;
}

export function subscribeAdopterFlagCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function fetchAdopterPublicFlags(userIds: string[]): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const missing = unique.filter(id => !cache.has(id) && !inflight.has(id));
  if (missing.length === 0) {
    await Promise.all(unique.map(id => inflight.get(id)).filter(Boolean) as Promise<void>[]);
    return;
  }

  const request = (async () => {
    for (const id of missing) cache.set(id, null);

    const { data, error } = await supabase.rpc('get_adopter_public_flags', {
      p_user_ids: missing,
    });

    if (error) {
      for (const id of missing) cache.delete(id);
      notify();
      return;
    }

    const returned = new Set<string>();
    for (const row of data ?? []) {
      const flag = isAdoptionUserFlag(row.flag) ? row.flag : null;
      cache.set(row.user_id, flag);
      returned.add(row.user_id);
    }
    for (const id of missing) {
      if (!returned.has(id)) cache.set(id, null);
    }
    notify();
  })();

  for (const id of missing) inflight.set(id, request);
  try {
    await request;
  } finally {
    for (const id of missing) inflight.delete(id);
  }
}

export function primeAdopterPublicFlag(userId: string, flag: AdoptionUserFlag | null) {
  cache.set(userId, flag);
  notify();
}
