import { useMemo } from 'react';
import { useAdoption } from '../context/AdoptionContext';
import { useAuth } from '../context/AuthContext';
import { groupThreads } from '../utils/chatThreadMeta';

/** Unread count for DMs + adoption threads (shown on Paw Circle tab). */
export function useUnreadMessagesCount(): number {
  const { threads, records } = useAdoption();
  const { user } = useAuth();
  return useMemo(() => {
    const grouped = groupThreads(threads, records, user?.id ?? '');
    const inboxThreads = [...grouped.action, ...grouped.adoption, ...grouped.general];
    return inboxThreads.reduce((sum, t) => sum + (t.unread ?? 0), 0);
  }, [threads, records, user?.id]);
}

/** Threads that need user action (check-ins, etc.) — drives urgent inbox dot. */
export function useInboxActionCount(): number {
  const { threads, records } = useAdoption();
  const { user } = useAuth();
  return useMemo(() => {
    const grouped = groupThreads(threads, records, user?.id ?? '');
    return grouped.action.length;
  }, [threads, records, user?.id]);
}
