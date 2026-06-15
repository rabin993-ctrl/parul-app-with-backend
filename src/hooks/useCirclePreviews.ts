import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export type CirclePreviewData = {
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
};

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffH < 48) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Fetches real-time circle previews (last message + unread count) for the given
 * circles. `entries` is a list of { id: slug/external-id, dbId: uuid } pairs.
 * Returns a map keyed by the external id (slug).
 */
export function useCirclePreviews(
  entries: { id: string; dbId: string }[],
): Record<string, CirclePreviewData> {
  const { user } = useAuth();
  const [previews, setPreviews] = useState<Record<string, CirclePreviewData>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const dbIds = entries.map(e => e.dbId).filter(Boolean);

  const load = useCallback(async () => {
    if (!user || dbIds.length === 0) {
      setPreviews({});
      return;
    }

    const [{ data: msgs }, { data: members }] = await Promise.all([
      supabase
        .from('circle_messages')
        .select('circle_id, type, text, sender_user_id, created_at')
        .in('circle_id', dbIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(dbIds.length * 20),
      supabase
        .from('circle_members')
        .select('circle_id, last_read_at')
        .eq('user_id', user.id)
        .in('circle_id', dbIds),
    ]);

    const readAt = new Map<string, string | null>(
      (members ?? []).map((m: any) => [m.circle_id, m.last_read_at]),
    );

    const lastMsgByCircle = new Map<string, any>();
    const unreadByCircle = new Map<string, number>();

    for (const msg of (msgs ?? []) as any[]) {
      if (!lastMsgByCircle.has(msg.circle_id)) {
        lastMsgByCircle.set(msg.circle_id, msg);
      }
      // Skip own messages and system messages — never unread for the sender
      if (msg.sender_user_id === user.id || msg.type === 'system') continue;
      const read = readAt.get(msg.circle_id);
      // Only count as unread if last_read_at is set and message is newer.
      // When last_read_at is null (circle never opened), show 0 — the badge
      // starts counting after the user's first visit marks the circle read.
      if (read && new Date(msg.created_at) > new Date(read)) {
        unreadByCircle.set(msg.circle_id, (unreadByCircle.get(msg.circle_id) ?? 0) + 1);
      }
    }

    const result: Record<string, CirclePreviewData> = {};
    for (const { id, dbId } of entries) {
      if (!dbId) continue;
      const last = lastMsgByCircle.get(dbId);
      result[id] = {
        lastMessage: last
          ? last.type === 'text' ? (last.text ?? '') : 'Shared a post'
          : 'Say hello to your circle!',
        lastMessageTime: last ? formatMsgTime(last.created_at) : '',
        unread: unreadByCircle.get(dbId) ?? 0,
      };
    }
    setPreviews(result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, JSON.stringify(dbIds)]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: re-fetch previews when any message arrives in any of our circles
  useEffect(() => {
    if (dbIds.length === 0) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase
      .channel(`circle_previews:${dbIds.join(',')}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'circle_messages' },
        () => { load(); },
      )
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(dbIds), load]);

  return previews;
}

/** Marks a circle as read by updating last_read_at for the current user. */
export async function markCircleRead(circleDbId: string, userId: string): Promise<void> {
  await supabase
    .from('circle_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('circle_id', circleDbId)
    .eq('user_id', userId);
}
