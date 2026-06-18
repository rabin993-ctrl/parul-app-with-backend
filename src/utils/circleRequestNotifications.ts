import { supabase } from '../lib/supabase';
import type { AppNotification } from '../data/mockData';

type JoinRequestRow = {
  id: string;
  circle_id: string;
  user_id: string;
  state: string;
};

/** Resolve the pending join-request id for a circle_request notification row. */
export async function resolvePendingJoinRequestId(
  notif: AppNotification,
): Promise<{ requestId: string | null; alreadyHandled: boolean }> {
  const directIds = [...new Set([notif.requestId, notif.entityId].filter(Boolean) as string[])];

  if (directIds.length > 0) {
    const { data } = await supabase
      .from('circle_join_requests')
      .select('id, state')
      .in('id', directIds);

    for (const row of (data ?? []) as { id: string; state: string }[]) {
      if (row.state === 'pending') return { requestId: row.id, alreadyHandled: false };
    }
    if ((data ?? []).length > 0) return { requestId: null, alreadyHandled: true };
  }

  const circleId = notif.circleId ?? notif.entityId;
  const requesterId = notif.userId;
  if (!circleId || !requesterId) {
    return { requestId: null, alreadyHandled: false };
  }

  const { data: match } = await supabase
    .from('circle_join_requests')
    .select('id, state')
    .eq('circle_id', circleId)
    .eq('user_id', requesterId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!match) return { requestId: null, alreadyHandled: false };
  if (match.state === 'pending') return { requestId: match.id, alreadyHandled: false };
  return { requestId: null, alreadyHandled: true };
}

export function isAlreadyHandledCircleRequestError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes('already handled') || lower.includes('not found');
}

/** Drop circle_request notifications whose join request is no longer pending. */
export async function filterActiveCircleRequestNotifs(
  notifs: AppNotification[],
): Promise<{ active: AppNotification[]; staleIds: string[] }> {
  const circleNotifs = notifs.filter(n => n.type === 'circle_request');
  if (circleNotifs.length === 0) return { active: notifs, staleIds: [] };

  const circleIds = [...new Set(
    circleNotifs.map(n => n.circleId ?? n.entityId).filter(Boolean) as string[],
  )];
  const requesterIds = [...new Set(circleNotifs.map(n => n.userId).filter(Boolean))];

  if (circleIds.length === 0 || requesterIds.length === 0) {
    return { active: notifs, staleIds: [] };
  }

  const { data } = await supabase
    .from('circle_join_requests')
    .select('id, circle_id, user_id, state')
    .in('circle_id', circleIds)
    .in('user_id', requesterIds);

  const rows = (data ?? []) as JoinRequestRow[];
  const pendingByRequestId = new Set(
    rows.filter(r => r.state === 'pending').map(r => r.id),
  );
  const pendingByPair = new Set(
    rows.filter(r => r.state === 'pending').map(r => `${r.circle_id}:${r.user_id}`),
  );

  const staleIds: string[] = [];
  const active = notifs.filter(n => {
    if (n.type !== 'circle_request') return true;

    const directId = n.requestId ?? n.entityId;
    if (directId && pendingByRequestId.has(directId)) return true;

    const pair = `${n.circleId ?? n.entityId}:${n.userId}`;
    if (pendingByPair.has(pair)) return true;

    staleIds.push(n.id);
    return false;
  });

  return { active, staleIds };
}
