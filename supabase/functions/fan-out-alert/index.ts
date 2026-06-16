import { adminClient } from '../_shared/admin.ts';
import { buildAlertGeocodeQuery, geocodePlace } from '../_shared/geocode.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';

type AlertRow = {
  post_id: string;
  kind: string;
  area: string | null;
  lat: number | null;
  lng: number | null;
  alert_radius_km: number | null;
  resolved: boolean;
  posts: { location: string | null; deleted_at: string | null } | null;
};

Deno.serve(async (req) => {
  const earlyReturn = handleOptions(req);
  if (earlyReturn) return earlyReturn;

  let post_id: string;
  try {
    const payload = await req.json();
    post_id = payload.post_id;
    if (!post_id) throw new Error('missing post_id');
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = adminClient();

  const { data: alert, error: alertErr } = await supabase
    .from('post_alerts')
    .select('post_id, kind, area, lat, lng, alert_radius_km, resolved, posts(location, deleted_at)')
    .eq('post_id', post_id)
    .maybeSingle();

  if (alertErr || !alert) {
    return new Response(JSON.stringify({ error: 'alert not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const row = alert as unknown as AlertRow;
  if (row.resolved || row.posts?.deleted_at) {
    return new Response(JSON.stringify({ skipped: true, reason: 'resolved_or_deleted' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let lat = row.lat;
  let lng = row.lng;

  if (lat == null || lng == null) {
    const query = buildAlertGeocodeQuery(row.area, row.posts?.location ?? null);
    const geocoded = await geocodePlace(query);
    if (!geocoded) {
      return new Response(JSON.stringify({ skipped: true, reason: 'geocode_failed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    lat = geocoded.lat;
    lng = geocoded.lng;
    await supabase
      .from('post_alerts')
      .update({ lat, lng })
      .eq('post_id', post_id);
  }

  const { data: fanOut, error: fanOutErr } = await supabase.rpc('fan_out_post_alert', {
    p_post_id: post_id,
  });

  if (fanOutErr) {
    return new Response(JSON.stringify({ error: fanOutErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, coords: { lat, lng }, result: fanOut }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
