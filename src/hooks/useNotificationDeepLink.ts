import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { NavigationContainerRef, ParamListBase } from '@react-navigation/native';

type DeepLinkData = {
  type?: string;
  entity_type?: string;
  entity_id?: string;
  notification_id?: string;
};

function routeNotification(
  nav: NavigationContainerRef<ParamListBase>,
  data: DeepLinkData,
) {
  switch (data.entity_type) {
    // circle_accept: entity_id is the circle DB UUID (not slug).
    // Navigate to the hub — the user's new circle appears in their list.
    case 'circle':
      nav.navigate('Circles');
      break;

    // circle_request: admin needs to Accept/Ignore via Notifications screen.
    case 'circle_join_request':
      nav.navigate('Profile', { screen: 'Notifications', initial: false });
      break;

    case 'adoption_record':
      if (data.entity_id) {
        nav.navigate('Profile', {
          screen: 'AdoptedDetail',
          params: { recordId: data.entity_id },
        });
      } else {
        nav.navigate('Profile');
      }
      break;

    case 'post':
      nav.navigate('Feed');
      break;

    default:
      nav.navigate('Profile', { screen: 'Notifications', initial: false });
      break;
  }
}

export function useNotificationDeepLink(
  navigationRef: React.RefObject<NavigationContainerRef<ParamListBase> | null>,
) {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Handle taps that cold-launch the app from a killed state.
      // addNotificationResponseReceivedListener does NOT fire in that case.
      // Both APIs are unavailable on web.
      Notifications.getLastNotificationResponseAsync().then(response => {
        if (!response) return;
        const data = (response.notification.request.content.data ?? {}) as DeepLinkData;
        const nav = navigationRef.current;
        if (!nav?.isReady()) return;
        routeNotification(nav, data);
      });
    }

    // Handle taps while the app is foregrounded or backgrounded (not killed).
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = (response.notification.request.content.data ?? {}) as DeepLinkData;
      const nav = navigationRef.current;
      if (!nav?.isReady()) return;
      routeNotification(nav, data);
    });

    return () => sub.remove();
  }, [navigationRef]);
}
