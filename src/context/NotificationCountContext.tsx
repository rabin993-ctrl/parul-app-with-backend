import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useUnreadNotificationsCount } from '../hooks/useUnreadNotificationsCount';
import { useAuth } from '../context/AuthContext';

type NotificationCountContextValue = {
  count: number;
  acknowledgeInbox: () => void;
};

const defaultValue: NotificationCountContextValue = {
  count: 0,
  acknowledgeInbox: () => {},
};

const NotificationCountContext = createContext<NotificationCountContextValue>(defaultValue);

let acknowledgeInboxRef: (() => void) | null = null;

/** Dismiss the header badge without marking notifications read. */
export function acknowledgeNotificationInbox() {
  acknowledgeInboxRef?.();
}

export function NotificationCountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const dbCount = useUnreadNotificationsCount();
  const [badgeDismissed, setBadgeDismissed] = useState(false);
  const [dismissedAtCount, setDismissedAtCount] = useState(0);

  useEffect(() => {
    setBadgeDismissed(false);
    setDismissedAtCount(0);
  }, [user?.id]);

  useEffect(() => {
    if (!badgeDismissed) return;
    if (dbCount < dismissedAtCount) {
      setDismissedAtCount(dbCount);
    }
    if (dbCount === 0) {
      setBadgeDismissed(false);
      setDismissedAtCount(0);
    }
  }, [badgeDismissed, dbCount, dismissedAtCount]);

  const acknowledgeInbox = useCallback(() => {
    setDismissedAtCount(dbCount);
    setBadgeDismissed(true);
  }, [dbCount]);

  useEffect(() => {
    acknowledgeInboxRef = acknowledgeInbox;
    return () => {
      acknowledgeInboxRef = null;
    };
  }, [acknowledgeInbox]);

  const count = badgeDismissed
    ? Math.max(0, dbCount - dismissedAtCount)
    : dbCount;

  const value = useMemo(
    () => ({ count, acknowledgeInbox }),
    [count, acknowledgeInbox],
  );

  return (
    <NotificationCountContext.Provider value={value}>
      {children}
    </NotificationCountContext.Provider>
  );
}

export function useNotificationCount(): number {
  return useContext(NotificationCountContext).count;
}

export function useAcknowledgeNotificationInbox(): () => void {
  return useContext(NotificationCountContext).acknowledgeInbox;
}
