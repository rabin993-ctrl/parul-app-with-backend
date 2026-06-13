import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushTokenRegistration() {
  const { user } = useAuth();

  useEffect(() => {
    // Physical device required; Expo Go on Android (SDK 53+) cannot receive
    // remote push — needs a dev/standalone build. Fails gracefully either way.
    if (!user || !Device.isDevice) return;

    const register = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') return;

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#F2972E',
          });
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        const token = tokenData.data;
        const platform = Platform.OS as 'ios' | 'android';

        await supabase.from('push_tokens').upsert(
          { user_id: user.id, platform, token },
          { onConflict: 'user_id,token', ignoreDuplicates: true },
        );
      } catch {
        // Token registration is best-effort; never surface to the user
      }
    };

    register();
  }, [user?.id]);
}
