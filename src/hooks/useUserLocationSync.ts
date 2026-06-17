import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useCurrentUserProfile } from '../context/CurrentUserProfileContext';
import { geocodeProfileLocation } from '../lib/alertFanOut';
import { getDeviceCoordinates, persistUserCoordinates } from '../lib/geolocation';

const SYNC_INTERVAL_MS = 15 * 60 * 1000;

/** Keep the signed-in user's coordinates fresh for geo alert matching. */
export function useUserLocationSync() {
  const { user } = useAuth();
  const { me } = useCurrentUserProfile();
  const lastSyncRef = useRef(0);
  const askedPermissionRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const sync = async () => {
      const now = Date.now();
      const isFirstRun = lastSyncRef.current === 0;
      if (!isFirstRun && now - lastSyncRef.current < SYNC_INTERVAL_MS) return;

      let coords = await getDeviceCoordinates({
        requestPermission: isFirstRun && !askedPermissionRef.current,
      });
      askedPermissionRef.current = true;

      if (!coords) {
        const profileLoc = me.location ?? me.loc;
        if (profileLoc) coords = await geocodeProfileLocation(profileLoc);
      }

      if (!coords) return;
      lastSyncRef.current = now;
      await persistUserCoordinates(coords);
    };

    sync();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') sync();
    });
    return () => sub.remove();
  }, [user?.id, me.location, me.loc]);
}
