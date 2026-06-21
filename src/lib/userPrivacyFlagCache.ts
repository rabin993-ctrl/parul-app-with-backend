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

function batchKey(userIds: string[]): string {
  return [...new Set(userIds.filter(Boolean))].sort().join(',');
}

function isRpcMissingError(message: string, code?: string): boolean {
  return code === '42883'
    || code === 'PGRST202'
    || /function.*does not exist/i.test(message)
    || /could not find.*function/i.test(message);
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

  const { data, error } = await supabase.rpc('get_public_user_privacy_flags', {
    p_user_ids: unique,
  });

  if (error) {
    if (__DEV__) {
      const hint = isRpcMissingError(error.message, error.code)
        ? ' — run npm run db:push to apply migration 0071'
        : '';
      console.warn(
        '[userPrivacyFlagCache] get_public_user_privacy_flags failed:',
        error.message,
        error.code,
        hint,
      );
    }
    for (const id of unique) {
      if (cache.has(id)) continue;
      // Don't cache fail-closed on RPC error — leave uncached so polling retries.
      // applyAuthorPrivacy treats missing flags as unmasked location (fail-open),
      // but online UI reads isOnline as false when uncached.
    }
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

async function runBatch(userIds: string[]): Promise<void> {
  const key = batchKey(userIds);
  if (!key) return;

  const existing = inflight.get(key);
  if (existing) {
    await existing;
    return;
  }

  const request = loadUserPrivacyFlags(userIds);
  inflight.set(key, request);
  try {
    await request;
  } finally {
    inflight.delete(key);
  }
}

export async function fetchUserPrivacyFlags(userIds: string[]): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const missing = unique.filter(id => !cache.has(id));
  if (missing.length === 0) return;
  await runBatch(missing);
}

/** Force re-fetch in place (e.g. online status polling) — keeps prior values until RPC returns. */
export async function refreshUserPrivacyFlags(userIds: string[]): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;
  await runBatch(unique);
}

export function privacyFlagsMapFromCache(userIds: string[]): Map<string, UserPrivacyFlags> {
  const map = new Map<string, UserPrivacyFlags>();
  for (const id of userIds) {
    const cached = cache.get(id);
    if (cached) map.set(id, cached);
  }
  return map;
}
