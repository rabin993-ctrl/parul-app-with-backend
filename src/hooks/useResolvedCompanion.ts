import { useEffect, useState } from 'react';
import type { Companion } from '../data/mockData';
import { useCompanions } from '../context/CompanionContext';

/** Resolve a companion from cache, fetching from Supabase when missing. */
export function useResolvedCompanion(companionId: string | null | undefined) {
  const { getCompanion, fetchCompanionById } = useCompanions();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const companion: Companion | null = companionId ? getCompanion(companionId) : null;

  useEffect(() => {
    if (!companionId) {
      setLoading(false);
      setFailed(false);
      return;
    }
    if (getCompanion(companionId)) {
      setLoading(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetchCompanionById(companionId).then(result => {
      if (cancelled) return;
      setLoading(false);
      setFailed(!result);
    });
    return () => { cancelled = true; };
  }, [companionId, fetchCompanionById, getCompanion]);

  return { companion, loading, failed };
}
