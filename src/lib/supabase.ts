/**
 * Single shared Supabase client for the app.
 *
 * - URL polyfill must be imported before createClient (RN has no global URL).
 * - Session is persisted in AsyncStorage so logins survive app restarts.
 * - Uses the public anon key only; RLS in the database is the authorization layer.
 *
 * Import this everywhere instead of constructing new clients:
 *   import { supabase } from '@/lib/supabase';   // or relative path
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './db-types';
import { ENV } from './env';

export const supabase = createClient<Database>(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
