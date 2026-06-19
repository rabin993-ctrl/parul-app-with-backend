import { supabase } from '../lib/supabase';
import type { AppNotification } from '../data/mockData';

/** Resolve the pending invite id for a circle_invite notification row. */
export async function resolvePendingInviteId(
  notif: AppNotification,
): Promise<{ inviteId: string | null; alreadyHandled: boolean }> {
  const directIds = [...new Set([notif.inviteId, notif.entityId].filter(Boolean) as string[])];

  if (directIds.length === 0) {
    return { inviteId: null, alreadyHandled: false };
  }

  const { data } = await (supabase as any)
    .from('circle_invites')
    .select('id, state')
    .in('id', directIds);

  for (const row of (data ?? []) as { id: string; state: string }[]) {
    if (row.state === 'pending') return { inviteId: row.id, alreadyHandled: false };
  }
  if ((data ?? []).length > 0) return { inviteId: null, alreadyHandled: true };

  return { inviteId: null, alreadyHandled: false };
}

export function isAlreadyHandledCircleInviteError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes('already handled') || lower.includes('not found') || lower.includes('no longer valid');
}

/** Drop circle_invite notifications whose invite is no longer pending. */
export async function filterActiveCircleInviteNotifs(
  notifs: AppNotification[],
): Promise<{ active: AppNotification[]; staleIds: string[] }> {
  const inviteNotifs = notifs.filter(n => n.type === 'circle_invite');
  if (inviteNotifs.length === 0) return { active: notifs, staleIds: [] };

  const inviteIds = [...new Set(
    inviteNotifs.flatMap(n => [n.inviteId, n.entityId].filter(Boolean) as string[]),
  )];

  if (inviteIds.length === 0) {
    return { active: notifs, staleIds: [] };
  }

  const { data } = await (supabase as any)
    .from('circle_invites')
    .select('id, state')
    .in('id', inviteIds);

  const pendingIds = new Set(
    ((data ?? []) as { id: string; state: string }[])
      .filter(r => r.state === 'pending')
      .map(r => r.id),
  );

  const staleIds: string[] = [];
  const active = notifs.filter(n => {
    if (n.type !== 'circle_invite') return true;

    const directId = n.inviteId ?? n.entityId;
    if (directId && pendingIds.has(directId)) return true;

    staleIds.push(n.id);
    return false;
  });

  return { active, staleIds };
}
