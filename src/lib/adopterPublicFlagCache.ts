import { supabase } from './supabase';
import {
  EMPTY_ADOPTER_PUBLIC_STATUS,
  isAdoptionTrustFlag,
  type AdopterPublicStatus,
} from '../utils/adoptionUserFlag';

const cache = new Map<string, AdopterPublicStatus>();
const listeners = new Set<() => void>();
const inflight = new Map<string, Promise<void>>();

function notify() {
  listeners.forEach(listener => listener());
}

export function getCachedAdopterStatus(userId: string): AdopterPublicStatus | undefined {
  return cache.get(userId);
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
    for (const id of missing) cache.set(id, EMPTY_ADOPTER_PUBLIC_STATUS);

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
      const trustFlag = isAdoptionTrustFlag(row.trust_flag) ? row.trust_flag : null;
      cache.set(row.user_id, {
        trustFlag,
        updateRequested: Boolean(row.update_requested),
      });
      returned.add(row.user_id);
    }
    for (const id of missing) {
      if (!returned.has(id)) cache.set(id, EMPTY_ADOPTER_PUBLIC_STATUS);
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

export function primeAdopterPublicStatus(userId: string, status: AdopterPublicStatus) {
  cache.set(userId, status);
  notify();
}

/** @deprecated use getCachedAdopterStatus */
export function getCachedAdopterFlag(userId: string) {
  const status = cache.get(userId);
  if (!status) return undefined;
  return status.trustFlag;
}

/** @deprecated use primeAdopterPublicStatus */
export function primeAdopterPublicFlag(userId: string, flag: AdopterPublicStatus['trustFlag']) {
  const existing = cache.get(userId) ?? EMPTY_ADOPTER_PUBLIC_STATUS;
  primeAdopterPublicStatus(userId, { ...existing, trustFlag: flag });
}
