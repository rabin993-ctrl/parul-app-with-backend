import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useUnreadNotificationsCount } from '../hooks/useUnreadNotificationsCount';
import { onNotificationCountAdjust } from '../lib/notificationCountSync';

type NotificationCountContextValue = {
  count: number;
};

const defaultValue: NotificationCountContextValue = {
  count: 0,
};

const NotificationCountContext = createContext<NotificationCountContextValue>(defaultValue);

export function NotificationCountProvider({ children }: { children: React.ReactNode }) {
  const dbCount = useUnreadNotificationsCount();
  const [optimisticDelta, setOptimisticDelta] = useState(0);

  useEffect(() => {
    return onNotificationCountAdjust(delta => {
      setOptimisticDelta(prev => prev + delta);
    });
  }, []);

  useEffect(() => {
    setOptimisticDelta(0);
  }, [dbCount]);

  const count = Math.max(0, dbCount + optimisticDelta);

  const value = useMemo(() => ({ count }), [count]);

  return (
    <NotificationCountContext.Provider value={value}>
      {children}
    </NotificationCountContext.Provider>
  );
}

export function useNotificationCount(): number {
  return useContext(NotificationCountContext).count;
}
