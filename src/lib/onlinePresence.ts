import { supabase } from './supabase';

/** Ping server presence heartbeat (no-ops when show_online is off). */
export async function touchOnlinePresence(): Promise<void> {
  const { error } = await supabase.rpc('touch_online_presence');
  if (error && __DEV__) {
    console.warn('[onlinePresence] touch_online_presence failed:', error.message, error.code);
  }
}
