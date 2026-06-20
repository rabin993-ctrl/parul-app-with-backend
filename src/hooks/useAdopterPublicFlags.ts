import { useEffect, useMemo, useState } from 'react';
import {
  fetchAdopterPublicFlags,
  getCachedAdopterFlag,
  subscribeAdopterFlagCache,
} from '../lib/adopterPublicFlagCache';
import type { AdoptionUserFlag } from '../utils/adoptionUserFlag';

export function useAdopterPublicFlag(userId: string | undefined): AdoptionUserFlag | null {
  const [, tick] = useState(0);

  useEffect(() => subscribeAdopterFlagCache(() => tick(n => n + 1)), []);

  useEffect(() => {
    if (!userId) return;
    if (getCachedAdopterFlag(userId) !== undefined) return;
    void fetchAdopterPublicFlags([userId]);
  }, [userId]);

  if (!userId) return null;
  const cached = getCachedAdopterFlag(userId);
  return cached === undefined ? null : cached;
}

export function useAdopterPublicFlags(userIds: string[]): Map<string, AdoptionUserFlag | null> {
  const [, tick] = useState(0);
  const stableKey = useMemo(
    () => [...new Set(userIds.filter(Boolean))].sort().join(','),
    [userIds],
  );
  const ids = useMemo(
    () => (stableKey ? stableKey.split(',') : []),
    [stableKey],
  );

  useEffect(() => subscribeAdopterFlagCache(() => tick(n => n + 1)), []);

  useEffect(() => {
    if (ids.length === 0) return;
    const missing = ids.filter(id => getCachedAdopterFlag(id) === undefined);
    if (missing.length === 0) return;
    void fetchAdopterPublicFlags(missing);
  }, [ids]);

  return useMemo(() => {
    const map = new Map<string, AdoptionUserFlag | null>();
    for (const id of ids) {
      const cached = getCachedAdopterFlag(id);
      if (cached !== undefined) map.set(id, cached);
    }
    return map;
  }, [ids, tick]);
}
