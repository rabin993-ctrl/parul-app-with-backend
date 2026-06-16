import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getDeviceCoordinates, persistUserCoordinates } from '../lib/geolocation';

const SYNC_INTERVAL_MS = 15 * 60 * 1000;

/** Keep the signed-in user's coordinates fresh for geo alert matching. */
export function useUserLocationSync() {
  const { user } = useAuth();
  const lastSyncRef = useRef(0);

  useEffect(() => {
    if (!user) return;

    const sync = async () => {
      const now = Date.now();
      if (now - lastSyncRef.current < SYNC_INTERVAL_MS) return;
      const coords = await getDeviceCoordinates({ requestPermission: false });
      if (!coords) return;
      lastSyncRef.current = now;
      await persistUserCoordinates(coords);
    };

    sync();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') sync();
    });
    return () => sub.remove();
  }, [user?.id]);
}
