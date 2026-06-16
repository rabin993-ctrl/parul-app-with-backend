import { adminClient } from '../_shared/admin.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

// Types that respect notify_post_activity preference
const POST_ACTIVITY_TYPES = new Set(['like', 'comment', 'mention', 'endorsement_received', 'lost', 'found']);
// Types that respect notify_adoption_updates preference
const ADOPTION_TYPES = new Set([
  'adoption', 'adoption_confirmed', 'update_request',
  'approved', 'rejected', 'adopted',
]);

type PushMessage = {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  data: Record<string, unknown>;
};

Deno.serve(async (req) => {
  const earlyReturn = handleOptions(req);
  if (earlyReturn) return earlyReturn;

  let notification_id: string;
  try {
    const payload = await req.json();
    notification_id = payload.notification_id;
    if (!notification_id) throw new Error('missing notification_id');
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = adminClient();

  const { data: notif, error: notifError } = await supabase
    .from('notifications')
    .select('id, recipient_id, type, title, body, entity_type, entity_id, data')
    .eq('id', notification_id)
    .single();

  if (notifError || !notif) {
    return new Response(JSON.stringify({ skipped: 'notification not found' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check the recipient's push preferences
  const { data: prefs } = await supabase
    .from('user_privacy_settings')
    .select('notify_post_activity, notify_adoption_updates')
    .eq('user_id', notif.recipient_id)
    .single();

  if (prefs) {
    if (POST_ACTIVITY_TYPES.has(notif.type) && !prefs.notify_post_activity) {
      return new Response(JSON.stringify({ skipped: 'notify_post_activity disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (ADOPTION_TYPES.has(notif.type) && !prefs.notify_adoption_updates) {
      return new Response(JSON.stringify({ skipped: 'notify_adoption_updates disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  // Fetch recipient's registered push tokens
  const { data: tokenRows } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', notif.recipient_id);

  const tokens = (tokenRows ?? [])
    .map((r: { token: string }) => r.token)
    .filter(t => t.startsWith('ExponentPushToken['));

  if (tokens.length === 0) {
    return new Response(JSON.stringify({ skipped: 'no expo tokens' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const messages: PushMessage[] = tokens.map(to => ({
    to,
    title: notif.title ?? 'parul',
    body: notif.body ?? '',
    sound: 'default' as const,
    data: {
      notification_id: notif.id,
      type: notif.type,
      entity_type: notif.entity_type ?? null,
      entity_id: notif.entity_id ?? null,
      ...(typeof notif.data === 'object' && notif.data !== null ? notif.data : {}),
    },
  }));

  // Send in batches of 100 (Expo limit)
  const results: unknown[] = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      results.push(await res.json());
    } catch {
      // Best-effort — never fail the overall response
    }
  }

  return new Response(
    JSON.stringify({ sent: messages.length, results }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
