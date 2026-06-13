import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export type DbCircleMessage =
  | { id: string; type: 'text'; userId: string; text: string; time: string }
  | { id: string; type: 'system'; text: string; time: string }
  | { id: string; type: 'shared_post'; userId: string; postId: string; time: string };

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffH < 48) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function rowToMsg(row: any): DbCircleMessage | null {
  if (row.deleted_at) return null;
  const time = formatMsgTime(row.created_at as string);
  if (row.type === 'system') {
    return { id: row.id, type: 'system', text: row.text ?? '', time };
  }
  if (row.type === 'text') {
    return { id: row.id, type: 'text', userId: row.sender_user_id ?? '', text: row.text ?? '', time };
  }
  if (row.type === 'shared_post') {
    return { id: row.id, type: 'shared_post', userId: row.sender_user_id ?? '', postId: row.shared_post_id ?? '', time };
  }
  return null;
}

export function useCircleMessages(
  circleId: string | null | undefined,
  userId: string | null | undefined,
) {
  const [messages, setMessages] = useState<DbCircleMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const seenIds = useRef(new Set<string>());

  const load = useCallback(async () => {
    if (!circleId) return;
    setLoading(true);
    const { data } = await supabase
      .from('circle_messages')
      .select('id, type, sender_user_id, text, shared_post_id, created_at, deleted_at')
      .eq('circle_id', circleId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(200);
    if (data) {
      const msgs = (data as any[]).map(rowToMsg).filter((m): m is DbCircleMessage => m !== null);
      seenIds.current = new Set(msgs.map(m => m.id));
      setMessages(msgs);
    }
    setLoading(false);
  }, [circleId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!circleId) return;
    const channel = supabase
      .channel(`circle_messages:${circleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'circle_messages',
          filter: `circle_id=eq.${circleId}`,
        },
        (payload) => {
          const msg = rowToMsg(payload.new);
          if (!msg || seenIds.current.has(msg.id)) return;
          seenIds.current.add(msg.id);
          setMessages(prev => [...prev, msg]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [circleId]);

  const send = useCallback(async (text: string) => {
    if (!circleId || !userId || !text.trim()) return;
    await supabase.from('circle_messages').insert({
      circle_id: circleId,
      type: 'text',
      sender_user_id: userId,
      text: text.trim(),
    });
  }, [circleId, userId]);

  return { messages, loading, send, refresh: load };
}
