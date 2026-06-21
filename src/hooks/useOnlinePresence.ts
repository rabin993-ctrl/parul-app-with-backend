import { useEffect, useRef } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { touchOnlinePresence } from '../lib/onlinePresence';

const HEARTBEAT_MS = 60_000;

/** While foregrounded, ping touch_online_presence every ~60s (RPC no-ops when show_online is off). */
export function useOnlinePresence() {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const start = () => {
      void touchOnlinePresence();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => { void touchOnlinePresence(); }, HEARTBEAT_MS);
    };

    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') start();
      else stop();
    };

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', onAppState);

    let onVisibilityChange: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      onVisibilityChange = () => {
        if (document.visibilityState === 'visible') start();
        else stop();
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      if (document.visibilityState === 'visible') start();
    }

    return () => {
      stop();
      sub.remove();
      if (onVisibilityChange) {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }, [user?.id]);
}
