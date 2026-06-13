import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';

export type BannerPayload = {
  title: string;
  body: string;
};

export function useInAppNotificationBanner() {
  const [banner, setBanner] = useState<BannerPayload | null>(null);

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(notification => {
      const { title, body } = notification.request.content;
      if (!title && !body) return;
      setBanner({ title: title ?? 'parul', body: body ?? '' });
    });
    return () => sub.remove();
  }, []);

  return { banner, clearBanner: () => setBanner(null) };
}
