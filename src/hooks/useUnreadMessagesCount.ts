import { useMemo } from 'react';
import { useAdoption } from '../context/AdoptionContext';
import { useAdoptionFeed } from '../context/AdoptionFeedContext';
import { useAuth } from '../context/AuthContext';
import { usePawCircles } from '../context/PawCircleContext';
import { useCircleUnreadCount } from '../context/CirclePreviewContext';
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

/** Combined badge for the Paw Circle tab — join requests, unread chats, adoption requests, action items. */
export function usePawCircleTabBadgeCount(): number {
  const { pendingIncomingRequestCount } = usePawCircles();
  const unreadMessagesCount = useUnreadMessagesCount();
  const circleUnreadCount = useCircleUnreadCount();
  const inboxActionCount = useInboxActionCount();
  const { requests } = useAdoptionFeed();
  const { user } = useAuth();

  const adoptionPendingCount = useMemo(() => {
    if (!user?.id) return 0;
    return requests.filter(r =>
      r.status === 'submitted'
      && r.posterId === user.id
      && !r.threadId,
    ).length;
  }, [requests, user?.id]);

  return pendingIncomingRequestCount
    + unreadMessagesCount
    + circleUnreadCount
    + adoptionPendingCount
    + inboxActionCount;
}
