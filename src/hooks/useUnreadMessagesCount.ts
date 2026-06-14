import { useMemo } from 'react';
import { useAdoption } from '../context/AdoptionContext';
import { useAuth } from '../context/AuthContext';
import { groupThreads } from '../utils/chatThreadMeta';

export function useUnreadMessagesCount(): number {
  const { threads, records } = useAdoption();
  const { user } = useAuth();
  return useMemo(() => {
    const grouped = groupThreads(threads, records, user?.id ?? '');
    return grouped.general.reduce((sum, t) => sum + (t.unread ?? 0), 0);
  }, [threads, records, user?.id]);
}
