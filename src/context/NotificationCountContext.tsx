import React, { createContext, useContext } from 'react';
import { useUnreadNotificationsCount } from '../hooks/useUnreadNotificationsCount';

const NotificationCountContext = createContext(0);

export function NotificationCountProvider({ children }: { children: React.ReactNode }) {
  const count = useUnreadNotificationsCount();
  return (
    <NotificationCountContext.Provider value={count}>
      {children}
    </NotificationCountContext.Provider>
  );
}

export function useNotificationCount(): number {
  return useContext(NotificationCountContext);
}
