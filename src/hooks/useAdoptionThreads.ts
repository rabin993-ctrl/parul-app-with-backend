import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { ChatThread, ChatMessage } from '../context/AdoptionContext';

type DbThreadRow = {
  id: string;
  type: string;
  adoption_listing_id: string | null;
  adoption_record_id: string | null;
  updated_at: string;
};

type DbParticipantRow = {
  thread_id: string;
  user_id: string;
};

type DbMessageRow = {
  id: string;
  thread_id: string;
  kind: string;
  sender_user_id: string | null;
  text: string | null;
  record_id: string | null;
  created_at: string;
};

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function useAdoptionThreads() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});

  const load = useCallback(async () => {
    if (!user) return;

    // All threads the user participates in
    const { data: participantRows } = await supabase
      .from('thread_participants')
      .select('thread_id, user_id')
      .eq('user_id', user.id);

    if (!participantRows?.length) return;
    const threadIds = participantRows.map((p: DbParticipantRow) => p.thread_id);

    // Fetch threads + all participants + messages in parallel
    const [{ data: threadRows }, { data: allParticipants }, { data: msgRows }] = await Promise.all([
      supabase
        .from('threads')
        .select('id, type, adoption_listing_id, adoption_record_id, updated_at')
        .in('id', threadIds)
        .order('updated_at', { ascending: false }),
      supabase
        .from('thread_participants')
        .select('thread_id, user_id')
        .in('thread_id', threadIds),
      supabase
        .from('messages')
        .select('id, thread_id, kind, sender_user_id, text, record_id, created_at')
        .in('thread_id', threadIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
    ]);

    // Map thread_id → other participant
    const otherParticipant = new Map<string, string>();
    for (const p of (allParticipants ?? []) as DbParticipantRow[]) {
      if (p.user_id !== user.id) otherParticipant.set(p.thread_id, p.user_id);
    }

    // Group messages by thread
    const msgsByThread = new Map<string, DbMessageRow[]>();
    for (const m of (msgRows ?? []) as DbMessageRow[]) {
      const arr = msgsByThread.get(m.thread_id) ?? [];
      arr.push(m);
      msgsByThread.set(m.thread_id, arr);
    }

    const chatThreads: ChatThread[] = [];
    const chatMessages: Record<string, ChatMessage[]> = {};

    for (const t of (threadRows ?? []) as DbThreadRow[]) {
      const msgs = msgsByThread.get(t.id) ?? [];
      const lastMsg = msgs[msgs.length - 1];
      const participantId = otherParticipant.get(t.id) ?? '';

      chatThreads.push({
        id: t.id,
        participantId,
        preview: lastMsg?.text ?? '',
        time: lastMsg ? formatMessageTime(lastMsg.created_at) : formatMessageTime(t.updated_at),
        unread: 0, // Wave 4: real-time unread tracking
        adoptionPostId: t.adoption_listing_id ?? undefined,
        adoptionRecordId: t.adoption_record_id ?? undefined,
      });

      chatMessages[t.id] = msgs.map((m: DbMessageRow): ChatMessage => ({
        id: m.id,
        threadId: m.thread_id,
        kind: m.kind as ChatMessage['kind'],
        senderId: m.sender_user_id ?? undefined,
        text: m.text ?? '',
        time: formatMessageTime(m.created_at),
        recordId: m.record_id ?? undefined,
      }));
    }

    setThreads(chatThreads);
    setMessages(chatMessages);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const sendMessage = useCallback((threadId: string, text: string, senderId?: string) => {
    if (!user) return;
    const effectiveSender = senderId === 'you' ? user.id : (senderId ?? user.id);
    const nowMs = Date.now();
    const optimisticId = `opt-msg-${nowMs}`;
    const msg: ChatMessage = {
      id: optimisticId,
      threadId,
      kind: 'text',
      senderId: effectiveSender,
      text,
      time: 'Now',
    };

    setMessages(prev => ({ ...prev, [threadId]: [...(prev[threadId] ?? []), msg] }));
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, preview: text, time: 'Now' } : t));

    supabase.from('messages').insert({
      thread_id: threadId,
      kind: 'text',
      sender_user_id: effectiveSender,
      text,
    }).select('id').single().then(({ data, error }) => {
      if (error) {
        setMessages(prev => ({
          ...prev,
          [threadId]: (prev[threadId] ?? []).filter(m => m.id !== optimisticId),
        }));
        return;
      }
      const realId = (data as { id: string }).id;
      setMessages(prev => ({
        ...prev,
        [threadId]: (prev[threadId] ?? []).map(m => m.id === optimisticId ? { ...m, id: realId } : m),
      }));
    });
  }, [user]);

  const ensureAdoptionRequestThread = useCallback((params: {
    listingId: string;
    peerId: string;
    threadId?: string;
  }): ChatThread => {
    // Look up in existing state first
    const existing = threads.find(t => (
      (params.threadId && t.id === params.threadId)
      || (t.participantId === params.peerId && t.adoptionPostId === params.listingId)
    ));
    if (existing) return existing;

    // Create optimistically (DB thread was already created by approve_adoption_request RPC)
    const threadId = params.threadId ?? `opt-thread-${Date.now()}`;
    const thread: ChatThread = {
      id: threadId,
      participantId: params.peerId,
      preview: 'New adoption request',
      time: 'Now',
      unread: 0,
      adoptionPostId: params.listingId,
    };
    setThreads(prev => [thread, ...prev]);
    setMessages(prev => ({ ...prev, [threadId]: [] }));
    return thread;
  }, [threads]);

  const appendSystemMessage = useCallback((
    threadId: string,
    text: string,
    kind: ChatMessage['kind'] = 'system',
    recordId?: string,
  ) => {
    if (!user) return;
    const nowMs = Date.now();
    const optimisticId = `opt-sys-${nowMs}`;
    const msg: ChatMessage = { id: optimisticId, threadId, kind, senderId: undefined, text, time: 'Now', recordId };
    setMessages(prev => ({ ...prev, [threadId]: [...(prev[threadId] ?? []), msg] }));
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, preview: text, time: 'Now' } : t));

    supabase.from('messages').insert({
      thread_id: threadId,
      kind,
      sender_user_id: null,
      text,
      record_id: recordId ?? null,
    }).then(() => {});
  }, [user]);

  const dismissThread = useCallback((threadId: string) => {
    setThreads(prev => prev.filter(t => t.id !== threadId));
    setMessages(prev => { const next = { ...prev }; delete next[threadId]; return next; });
  }, []);

  const patchThread = useCallback((threadId: string, patch: Partial<ChatThread>) => {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, ...patch } : t));
  }, []);

  return {
    threads, messages, setThreads, setMessages,
    sendMessage, ensureAdoptionRequestThread, appendSystemMessage,
    dismissThread, patchThread, reload: load,
  };
}
