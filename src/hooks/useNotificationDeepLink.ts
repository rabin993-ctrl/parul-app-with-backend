import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import { routeNotificationTarget, type NotificationRouteData } from '../navigation/notificationRouting';

function routePushNotification(
  nav: NavigationContainerRef<ParamListBase>,
  data: NotificationRouteData,
) {
  void routeNotificationTarget(nav, data, { fallbackToInbox: true });
}

export function useNotificationDeepLink(
  navigationRef: React.RefObject<NavigationContainerRef<ParamListBase> | null>,
) {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      Notifications.getLastNotificationResponseAsync().then(response => {
        if (!response) return;
        const data = (response.notification.request.content.data ?? {}) as NotificationRouteData;
        const nav = navigationRef.current;
        if (!nav?.isReady()) return;
        routePushNotification(nav, data);
      });
    }

    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = (response.notification.request.content.data ?? {}) as NotificationRouteData;
      const nav = navigationRef.current;
      if (!nav?.isReady()) return;
      routePushNotification(nav, data);
    });

    return () => sub.remove();
  }, [navigationRef]);
}
