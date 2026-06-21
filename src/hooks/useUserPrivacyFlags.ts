import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_USER_PRIVACY_FLAGS,
  fetchUserPrivacyFlags,
  getCachedUserPrivacyFlags,
  refreshUserPrivacyFlags,
  subscribeUserPrivacyFlagCache,
  type UserPrivacyFlags,
} from '../lib/userPrivacyFlagCache';

export const ONLINE_STATUS_POLL_MS = 60_000;

function usePrivacyFlagSubscription() {
  const [, tick] = useState(0);
  useEffect(() => subscribeUserPrivacyFlagCache(() => tick(n => n + 1)), []);
  return tick;
}

/** One interval per userId across all hook instances. */
const onlinePollRefCounts = new Map<string, number>();
const onlinePollTimers = new Map<string, ReturnType<typeof setInterval>>();

function retainOnlinePolling(userId: string): () => void {
  const count = (onlinePollRefCounts.get(userId) ?? 0) + 1;
  onlinePollRefCounts.set(userId, count);

  if (count === 1) {
    void refreshUserPrivacyFlags([userId]);
    onlinePollTimers.set(
      userId,
      setInterval(() => { void refreshUserPrivacyFlags([userId]); }, ONLINE_STATUS_POLL_MS),
    );
  }

  return () => {
    const next = (onlinePollRefCounts.get(userId) ?? 1) - 1;
    if (next <= 0) {
      onlinePollRefCounts.delete(userId);
      const timer = onlinePollTimers.get(userId);
      if (timer) clearInterval(timer);
      onlinePollTimers.delete(userId);
    } else {
      onlinePollRefCounts.set(userId, next);
    }
  };
}

export function useUserPrivacyFlags(userId: string | undefined): UserPrivacyFlags {
  usePrivacyFlagSubscription();

  useEffect(() => {
    if (!userId) return;
    if (getCachedUserPrivacyFlags(userId) !== undefined) return;
    void fetchUserPrivacyFlags([userId]);
  }, [userId]);

  if (!userId) return DEFAULT_USER_PRIVACY_FLAGS;
  return getCachedUserPrivacyFlags(userId) ?? DEFAULT_USER_PRIVACY_FLAGS;
}

export function useUserOnlineStatus(userId: string | undefined): boolean {
  usePrivacyFlagSubscription();

  useEffect(() => {
    if (!userId) return;
    return retainOnlinePolling(userId);
  }, [userId]);

  if (!userId) return false;
  return getCachedUserPrivacyFlags(userId)?.isOnline ?? false;
}

export function useBatchUserPrivacyFlags(userIds: string[]): Map<string, UserPrivacyFlags> {
  const tick = usePrivacyFlagSubscription();
  const stableKey = useMemo(
    () => [...new Set(userIds.filter(Boolean))].sort().join(','),
    [userIds],
  );
  const ids = useMemo(
    () => (stableKey ? stableKey.split(',') : []),
    [stableKey],
  );

  useEffect(() => {
    if (ids.length === 0) return;
    const missing = ids.filter(id => getCachedUserPrivacyFlags(id) === undefined);
    if (missing.length === 0) return;
    void fetchUserPrivacyFlags(missing);
  }, [ids]);

  return useMemo(() => {
    const map = new Map<string, UserPrivacyFlags>();
    for (const id of ids) {
      const cached = getCachedUserPrivacyFlags(id);
      if (cached !== undefined) map.set(id, cached);
    }
    return map;
  }, [ids, tick]);
}
