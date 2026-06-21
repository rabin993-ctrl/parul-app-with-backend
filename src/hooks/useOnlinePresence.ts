import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const HEARTBEAT_MS = 60_000;

/** While foregrounded, ping touch_online_presence every ~60s (RPC no-ops when show_online is off). */
export function useOnlinePresence() {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const touch = () => {
      void supabase.rpc('touch_online_presence');
    };

    const start = () => {
      touch();
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(touch, HEARTBEAT_MS);
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

    return () => {
      stop();
      sub.remove();
    };
  }, [user?.id]);
}
