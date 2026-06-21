import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_USER_PRIVACY_FLAGS,
  fetchUserPrivacyFlags,
  getCachedUserPrivacyFlags,
  subscribeUserPrivacyFlagCache,
  type UserPrivacyFlags,
} from '../lib/userPrivacyFlagCache';

function usePrivacyFlagSubscription() {
  const [, tick] = useState(0);
  useEffect(() => subscribeUserPrivacyFlagCache(() => tick(n => n + 1)), []);
  return tick;
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
  return useUserPrivacyFlags(userId).isOnline;
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
