import { supabase } from './supabase';

export type SavePostAlertInput = {
  postId: string;
  kind: 'lost' | 'found';
  area?: string | null;
  lastSeen?: string | null;
  foundAt?: string | null;
  looksLike?: string | null;
  phone?: string | null;
  lat?: number | null;
  lng?: number | null;
  resolved?: boolean;
};

/** Persist alert details via security-definer RPC, with client upsert fallback. */
export async function savePostAlert(input: SavePostAlertInput): Promise<boolean> {
  const payload = {
    p_post_id: input.postId,
    p_kind: input.kind,
    p_area: input.area?.trim() || null,
    p_last_seen: input.lastSeen?.trim() || null,
    p_found_at: input.foundAt?.trim() || null,
    p_looks_like: input.looksLike?.trim() || null,
    p_phone: input.phone?.trim() || null,
    p_lat: input.lat ?? null,
    p_lng: input.lng ?? null,
    p_resolved: input.resolved ?? false,
  };

  const { error: rpcErr } = await supabase.rpc('save_post_alert', payload as never);
  if (!rpcErr) return true;

  if (
    rpcErr.code !== 'PGRST202'
    && !rpcErr.message.includes('save_post_alert')
    && !rpcErr.message.includes('Could not find the function')
  ) {
    console.warn('[savePostAlert] rpc failed:', rpcErr.message);
  }

  const row: Record<string, unknown> = {
    post_id: input.postId,
    kind: input.kind,
    area: payload.p_area,
    phone: payload.p_phone,
    lat: payload.p_lat,
    lng: payload.p_lng,
    resolved: payload.p_resolved,
  };
  if (input.kind === 'lost') {
    row.last_seen = payload.p_last_seen;
  } else {
    row.found_at = payload.p_found_at;
    row.looks_like = payload.p_looks_like;
  }

  const { error: upsertErr } = await supabase
    .from('post_alerts')
    .upsert(row as never, { onConflict: 'post_id' });
  if (upsertErr) {
    console.warn('[savePostAlert] upsert failed:', upsertErr.message);
    return false;
  }
  return true;
}
