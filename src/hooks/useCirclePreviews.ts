import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { circleMessagePreview } from '../utils/chatPreviewText';
import {
  emitCircleMarkedRead,
  emitCircleReadInvalidate,
  getActiveCircleChatDbId,
  onCircleMarkedRead,
  onCircleReadInvalidate,
} from '../lib/circlePreviewSync';

export type CirclePreviewData = {
  lastMessage: string;
  lastMessageTime: string;
  /** ISO timestamp of the latest message — used for inbox sort order. */
  lastMessageAt?: string;
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
  const channelKeyRef = useRef(`circle_previews_${Math.random().toString(36).slice(2, 9)}`);

  const dbIds = entries.map(e => e.dbId).filter(Boolean);

  const load = useCallback(async () => {
    if (!user || dbIds.length === 0) {
      setPreviews({});
      return;
    }

    const [{ data: msgs }, { data: members }] = await Promise.all([
      supabase
        .from('circle_messages')
        .select(`
          circle_id, type, text, sender_user_id, created_at,
          circle_message_media (type)
        `)
        .in('circle_id', dbIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(dbIds.length * 20),
      supabase
        .from('circle_members')
        .select('circle_id, last_read_at, joined_at')
        .eq('user_id', user.id)
        .in('circle_id', dbIds),
    ]);

    // Use last_read_at when available; fall back to joined_at so messages received
    // after joining (but before the user first opens the chat) still show as unread.
    const readAt = new Map<string, string>(
      (members ?? []).map((m: any) => [m.circle_id, m.last_read_at ?? m.joined_at]),
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
      if (read && new Date(msg.created_at) > new Date(read)) {
        unreadByCircle.set(msg.circle_id, (unreadByCircle.get(msg.circle_id) ?? 0) + 1);
      }
    }

    const senderIds = [...new Set(
      [...lastMsgByCircle.values()]
        .map((m: any) => m.sender_user_id as string | null)
        .filter(Boolean),
    )] as string[];
    const nameById = new Map<string, string>();
    if (senderIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', senderIds);
      for (const u of users ?? []) {
        nameById.set(u.id, u.name);
      }
    }

    const result: Record<string, CirclePreviewData> = {};
    for (const { id, dbId } of entries) {
      if (!dbId) continue;
      const last = lastMsgByCircle.get(dbId);
      const mediaRow = last?.circle_message_media;
      const mediaKind = (Array.isArray(mediaRow) ? mediaRow[0] : mediaRow)?.type ?? null;
      result[id] = {
        lastMessage: last
          ? circleMessagePreview({
              currentUserId: user.id,
              type: last.type,
              text: last.text,
              mediaKind,
              senderUserId: last.sender_user_id,
              senderName: nameById.get(last.sender_user_id),
            })
          : 'Say hello to your circle!',
        lastMessageTime: last ? formatMsgTime(last.created_at) : '',
        lastMessageAt: last?.created_at,
        unread: getActiveCircleChatDbId() === dbId
          ? 0
          : (unreadByCircle.get(dbId) ?? 0),
      };
    }
    setPreviews(result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, JSON.stringify(dbIds)]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return onCircleMarkedRead(circleDbId => {
      setPreviews(prev => {
        const entry = entries.find(e => e.dbId === circleDbId);
        if (!entry || !(prev[entry.id]?.unread ?? 0)) return prev;
        return {
          ...prev,
          [entry.id]: { ...prev[entry.id], unread: 0 },
        };
      });
    });
  }, [entries]);

  useEffect(() => {
    return onCircleReadInvalidate(() => { void load(); });
  }, [load]);

  // Realtime: re-fetch previews when messages arrive or read state changes.
  useEffect(() => {
    if (!user || dbIds.length === 0) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const ch = supabase
      .channel(`${channelKeyRef.current}:${dbIds.join(',')}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'circle_messages' },
        () => { load(); },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'circle_members', filter: `user_id=eq.${user.id}` },
        () => { load(); },
      )
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); channelRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(dbIds), load, user?.id]);

  return previews;
}

/** Marks a circle as read by updating last_read_at for the current user. */
export async function markCircleRead(circleDbId: string, _userId?: string): Promise<boolean> {
  emitCircleMarkedRead(circleDbId);
  const { error } = await supabase.rpc(
    'mark_circle_read' as never,
    { p_circle_id: circleDbId } as never,
  );
  if (error) {
    console.error('[markCircleRead] failed:', error.message);
    emitCircleReadInvalidate();
    return false;
  }
  return true;
}
