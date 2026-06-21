import { supabase } from './supabase';

export type UserPrivacyFlags = {
  showLocation: boolean;
  showCompanions: boolean;
  showOnline: boolean;
  isOnline: boolean;
};

export const DEFAULT_USER_PRIVACY_FLAGS: UserPrivacyFlags = {
  showLocation: true,
  showCompanions: true,
  showOnline: true,
  isOnline: false,
};

const cache = new Map<string, UserPrivacyFlags>();
const listeners = new Set<() => void>();
const inflight = new Map<string, Promise<void>>();

function notify() {
  listeners.forEach(listener => listener());
}

export function getCachedUserPrivacyFlags(userId: string): UserPrivacyFlags | undefined {
  return cache.get(userId);
}

export function subscribeUserPrivacyFlagCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

async function loadUserPrivacyFlags(userIds: string[]): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;

  for (const id of unique) cache.set(id, DEFAULT_USER_PRIVACY_FLAGS);

  const { data, error } = await supabase.rpc('get_public_user_privacy_flags', {
    p_user_ids: unique,
  });

  if (error) {
    for (const id of unique) cache.delete(id);
    notify();
    return;
  }

  const returned = new Set<string>();
  for (const row of data ?? []) {
    cache.set(row.user_id, {
      showLocation: Boolean(row.show_location),
      showCompanions: Boolean(row.show_companions),
      showOnline: Boolean(row.show_online),
      isOnline: Boolean(row.is_online),
    });
    returned.add(row.user_id);
  }
  for (const id of unique) {
    if (!returned.has(id)) cache.set(id, DEFAULT_USER_PRIVACY_FLAGS);
  }
  notify();
}

export async function fetchUserPrivacyFlags(userIds: string[]): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const missing = unique.filter(id => !cache.has(id) && !inflight.has(id));
  if (missing.length === 0) {
    await Promise.all(unique.map(id => inflight.get(id)).filter(Boolean) as Promise<void>[]);
    return;
  }

  const request = loadUserPrivacyFlags(missing);
  for (const id of missing) inflight.set(id, request);
  try {
    await request;
  } finally {
    for (const id of missing) inflight.delete(id);
  }
}

/** Force re-fetch (e.g. online status polling). */
export async function refreshUserPrivacyFlags(userIds: string[]): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;

  for (const id of unique) {
    cache.delete(id);
    inflight.delete(id);
  }

  const request = loadUserPrivacyFlags(unique);
  for (const id of unique) inflight.set(id, request);
  try {
    await request;
  } finally {
    for (const id of unique) inflight.delete(id);
  }
}

export function privacyFlagsMapFromCache(userIds: string[]): Map<string, UserPrivacyFlags> {
  const map = new Map<string, UserPrivacyFlags>();
  for (const id of userIds) {
    const cached = cache.get(id);
    if (cached) map.set(id, cached);
  }
  return map;
}
