import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import type { NotificationRouteData } from '../navigation/notificationRouting';

export type BannerPayload = {
  title: string;
  body: string;
  data?: NotificationRouteData;
};

export function useInAppNotificationBanner() {
  const [banner, setBanner] = useState<BannerPayload | null>(null);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(notification => {
      const { title, body, data } = notification.request.content;
      if (!title && !body) return;
      setBanner({
        title: title ?? 'parul',
        body: body ?? '',
        data: (data ?? undefined) as NotificationRouteData | undefined,
      });
    });
    return () => sub.remove();
  }, []);

  return { banner, clearBanner: () => setBanner(null) };
}
