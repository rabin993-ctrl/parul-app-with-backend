// Service-role Supabase client for privileged Edge Function work (fan-out, sweeps).
// NEVER import this from the app. Secrets are injected by the Supabase runtime.
import { createClient } from 'jsr:@supabase/supabase-js@2';

export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
