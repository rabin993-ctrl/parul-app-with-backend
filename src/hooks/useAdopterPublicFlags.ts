import { useEffect, useMemo, useState } from 'react';
import {
  fetchAdopterPublicFlags,
  getCachedAdopterStatus,
  subscribeAdopterFlagCache,
} from '../lib/adopterPublicFlagCache';
import {
  EMPTY_ADOPTER_PUBLIC_STATUS,
  type AdoptionTrustFlag,
  type AdopterPublicStatus,
} from '../utils/adoptionUserFlag';

function useAdopterStatusSubscription() {
  const [, tick] = useState(0);
  useEffect(() => subscribeAdopterFlagCache(() => tick(n => n + 1)), []);
  return tick;
}

export function useAdopterPublicStatus(userId: string | undefined): AdopterPublicStatus {
  useAdopterStatusSubscription();

  useEffect(() => {
    if (!userId) return;
    if (getCachedAdopterStatus(userId) !== undefined) return;
    void fetchAdopterPublicFlags([userId]);
  }, [userId]);

  if (!userId) return EMPTY_ADOPTER_PUBLIC_STATUS;
  return getCachedAdopterStatus(userId) ?? EMPTY_ADOPTER_PUBLIC_STATUS;
}

export function useAdopterTrustFlag(userId: string | undefined): AdoptionTrustFlag | null {
  return useAdopterPublicStatus(userId).trustFlag;
}

export function useAdopterUpdateRequested(userId: string | undefined): boolean {
  return useAdopterPublicStatus(userId).updateRequested;
}

export function useAdopterPublicFlags(userIds: string[]): Map<string, AdopterPublicStatus> {
  const tick = useAdopterStatusSubscription();
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
    const missing = ids.filter(id => getCachedAdopterStatus(id) === undefined);
    if (missing.length === 0) return;
    void fetchAdopterPublicFlags(missing);
  }, [ids]);

  return useMemo(() => {
    const map = new Map<string, AdopterPublicStatus>();
    for (const id of ids) {
      const cached = getCachedAdopterStatus(id);
      if (cached !== undefined) map.set(id, cached);
    }
    return map;
  }, [ids, tick]);
}

/** @deprecated use useAdopterTrustFlag */
export function useAdopterPublicFlag(userId: string | undefined): AdoptionTrustFlag | null {
  return useAdopterTrustFlag(userId);
}
