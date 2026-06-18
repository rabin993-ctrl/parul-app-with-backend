import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { avatarUrlsFromMedia, normalizeJoinedMedia, prefetchResolvedAvatars } from '../lib/avatarMedia';
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

type DbUserMini = {
  id: string;
  name: string;
  handle: string | null;
  tint: string | null;
  avatar_media: unknown;
};

type DbMyParticipantRow = {
  thread_id: string;
  muted: boolean;
  last_read_message_id: string | null;
};

type DbMessageRow = {
  id: string;
  thread_id: string;
  kind: string;
  sender_user_id: string | null;
  text: string | null;
  record_id: string | null;
  post_id: string | null;
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

function computeUnread(
  msgs: DbMessageRow[],
  lastReadId: string | null,
  myUserId: string,
): number {
  if (!msgs.length) return 0;
  if (!lastReadId) {
    return msgs.filter(m => m.sender_user_id !== myUserId).length;
  }
  const idx = msgs.findIndex(m => m.id === lastReadId);
  const afterRead = idx >= 0 ? msgs.slice(idx + 1) : msgs;
  return afterRead.filter(m => m.sender_user_id !== myUserId).length;
}

export function useAdoptionThreads() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  // Track thread IDs for the realtime handler
  const threadIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    threadIdsRef.current = new Set(threads.map(t => t.id));
  }, [threads]);

  const load = useCallback(async (): Promise<ChatThread[]> => {
    if (!user) return [];

    // All threads the user participates in
    const { data: participantRows } = await supabase
      .from('thread_participants')
      .select('thread_id, user_id')
      .eq('user_id', user.id);

    if (!participantRows?.length) {
      setThreads([]);
      setMessages({});
      return [];
    }
    const threadIds = participantRows.map((p: DbParticipantRow) => p.thread_id);

    // Fetch threads + all participants + messages + my participant rows in parallel
    const [
      { data: threadRows },
      { data: allParticipants },
      { data: msgRows },
      { data: myParticipantRows },
    ] = await Promise.all([
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
        .select('id, thread_id, kind, sender_user_id, text, record_id, post_id, created_at')
        .in('thread_id', threadIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('thread_participants')
        .select('thread_id, muted, last_read_message_id')
        .eq('user_id', user.id)
        .in('thread_id', threadIds),
    ]);

    // Collect peer user IDs (participants that are not the current user)
    const peerIds = [...new Set(
      (allParticipants ?? [])
        .filter((p: DbParticipantRow) => p.user_id !== user.id)
        .map((p: DbParticipantRow) => p.user_id),
    )];
    let peerRows: DbUserMini[] = [];
    if (peerIds.length > 0) {
      const { data: peerProfileRows } = await (supabase as any)
        .from('users')
        .select('id,name,handle,tint,avatar_media:media_assets!users_avatar_media_id_fkey(url, thumb_url)')
        .in('id', peerIds);
      peerRows = (peerProfileRows ?? []) as DbUserMini[];
    }
    const peerProfiles = new Map<string, DbUserMini & { avatarUrl?: string; avatarFallbackUrl?: string; avatarOriginalUrl?: string }>(
      peerRows.map(u => {
        const urls = avatarUrlsFromMedia(normalizeJoinedMedia(u.avatar_media as never));
        return [u.id, { ...u, ...urls }];
      }),
    );
    prefetchResolvedAvatars([...peerProfiles.values()]);

    // Map thread_id → other participant
    const otherParticipant = new Map<string, string>();
    for (const p of (allParticipants ?? []) as DbParticipantRow[]) {
      if (p.user_id !== user.id) otherParticipant.set(p.thread_id, p.user_id);
    }

    // Build last_read and muted maps
    const lastReadMap = new Map<string, string | null>();
    const mutedThreads = new Set<string>();
    for (const p of (myParticipantRows ?? []) as DbMyParticipantRow[]) {
      lastReadMap.set(p.thread_id, p.last_read_message_id);
      if (p.muted) mutedThreads.add(p.thread_id);
    }

    // Group messages by thread
    const msgsByThread = new Map<string, DbMessageRow[]>();
    for (const m of (msgRows ?? []) as any[] as DbMessageRow[]) {
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
      const unread = computeUnread(msgs, lastReadMap.get(t.id) ?? null, user.id);

      const peer = peerProfiles.get(participantId);
      chatThreads.push({
        id: t.id,
        participantId,
        participantName: peer?.name,
        participantHandle: peer?.handle ?? undefined,
        participantTint: peer?.tint ?? undefined,
        participantAvatarUrl: peer?.avatarUrl,
        participantAvatarFallbackUrl: peer?.avatarFallbackUrl,
        participantAvatarOriginalUrl: peer?.avatarOriginalUrl,
        preview: lastMsg ? (lastMsg.kind === 'shared_post' ? 'Shared a post' : (lastMsg.text ?? '')) : '',
        time: lastMsg ? formatMessageTime(lastMsg.created_at) : formatMessageTime(t.updated_at),
        unread,
        muted: mutedThreads.has(t.id),
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
        postId: m.post_id ?? undefined,
      }));
    }

    setThreads(chatThreads);
    setMessages(chatMessages);
    return chatThreads;
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // ── Realtime: new threads + message inserts ───────────
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('adoption-threads-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'thread_participants', filter: `user_id=eq.${user.id}` },
        () => { load(); },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'threads' },
        () => { load(); },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'threads' },
        () => { load(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  // ── Realtime: message inserts ───────────────────────────
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('adoption-messages-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: { new: DbMessageRow }) => {
          const newMsg = payload.new as DbMessageRow;
          if (!threadIdsRef.current.has(newMsg.thread_id)) return;

          const isFromMe = newMsg.sender_user_id === userRef.current?.id;
          const chatMsg: ChatMessage = {
            id: newMsg.id,
            threadId: newMsg.thread_id,
            kind: newMsg.kind as ChatMessage['kind'],
            senderId: newMsg.sender_user_id ?? undefined,
            text: newMsg.text ?? '',
            time: 'Now',
            recordId: newMsg.record_id ?? undefined,
            postId: newMsg.post_id ?? undefined,
          };

          setMessages(prev => {
            const existing = prev[newMsg.thread_id] ?? [];
            // Skip if already present (optimistic duplicate)
            if (existing.some(m => m.id === newMsg.id)) return prev;
            // Replace optimistic text message
            const textOptIdx = existing.findLastIndex(
              m => m.id.startsWith('opt-msg-') && m.text === newMsg.text && isFromMe && newMsg.kind === 'text',
            );
            if (textOptIdx >= 0) {
              const updated = [...existing];
              updated[textOptIdx] = { ...updated[textOptIdx], id: newMsg.id };
              return { ...prev, [newMsg.thread_id]: updated };
            }
            // Replace optimistic shared_post message
            const sharedOptIdx = existing.findLastIndex(
              m => m.id.startsWith('opt-shared-')
                && m.kind === 'shared_post'
                && isFromMe
                && newMsg.kind === 'shared_post'
                && m.postId === newMsg.post_id,
            );
            if (sharedOptIdx >= 0) {
              const updated = [...existing];
              updated[sharedOptIdx] = { ...updated[sharedOptIdx], id: newMsg.id };
              return { ...prev, [newMsg.thread_id]: updated };
            }
            return { ...prev, [newMsg.thread_id]: [...existing, chatMsg] };
          });

          const preview = newMsg.kind === 'shared_post'
            ? (newMsg.text?.trim() || 'Shared a post')
            : (newMsg.text ?? '');

          setThreads(prev =>
            prev.map(t =>
              t.id === newMsg.thread_id
                ? {
                    ...t,
                    preview: preview || t.preview,
                    time: 'Now',
                    unread: isFromMe ? t.unread : t.unread + 1,
                  }
                : t,
            ),
          );
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Re-load on channel error to close any gaps
          load();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

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

  const sendAlertMessage = useCallback(async (
    threadId: string,
    postId: string,
    text?: string,
  ): Promise<boolean> => {
    if (!user) return false;
    const trimmed = text?.trim() ?? '';
    const nowMs = Date.now();
    const sharedOptId = `opt-shared-${nowMs}`;

    const sharedMsg: ChatMessage = {
      id: sharedOptId,
      threadId,
      kind: 'shared_post',
      senderId: user.id,
      text: '',
      time: 'Now',
      postId,
    };

    setMessages(prev => ({
      ...prev,
      [threadId]: [...(prev[threadId] ?? []), sharedMsg],
    }));

    const { data: sharedRow, error: sharedErr } = await supabase.from('messages').insert({
      thread_id: threadId,
      kind: 'shared_post',
      sender_user_id: user.id,
      post_id: postId,
    } as never).select('id').single();

    if (sharedErr || !sharedRow) {
      setMessages(prev => ({
        ...prev,
        [threadId]: (prev[threadId] ?? []).filter(m => m.id !== sharedOptId),
      }));
      return false;
    }

    const sharedRealId = (sharedRow as { id: string }).id;
    setMessages(prev => ({
      ...prev,
      [threadId]: (prev[threadId] ?? []).map(m =>
        m.id === sharedOptId ? { ...m, id: sharedRealId } : m,
      ),
    }));

    if (trimmed) {
      const textOptId = `opt-msg-${nowMs + 1}`;
      const textMsg: ChatMessage = {
        id: textOptId,
        threadId,
        kind: 'text',
        senderId: user.id,
        text: trimmed,
        time: 'Now',
      };

      setMessages(prev => ({
        ...prev,
        [threadId]: [...(prev[threadId] ?? []), textMsg],
      }));

      const { data: textRow, error: textErr } = await supabase.from('messages').insert({
        thread_id: threadId,
        kind: 'text',
        sender_user_id: user.id,
        text: trimmed,
      }).select('id').single();

      if (textErr || !textRow) {
        setMessages(prev => ({
          ...prev,
          [threadId]: (prev[threadId] ?? []).filter(m => m.id !== textOptId),
        }));
      } else {
        const textRealId = (textRow as { id: string }).id;
        setMessages(prev => ({
          ...prev,
          [threadId]: (prev[threadId] ?? []).map(m =>
            m.id === textOptId ? { ...m, id: textRealId } : m,
          ),
        }));
      }
    }

    const preview = trimmed || 'Shared a post';
    setThreads(prev => prev.map(t =>
      t.id === threadId ? { ...t, preview, time: 'Now' } : t,
    ));

    return true;
  }, [user]);

  const registerDmThread = useCallback((thread: ChatThread) => {
    setThreads(prev => (prev.some(t => t.id === thread.id) ? prev : [thread, ...prev]));
  }, []);

  const markRead = useCallback((threadId: string) => {
    const msgs = messages[threadId];
    if (!msgs?.length) return;
    const lastMsg = msgs[msgs.length - 1];
    if (!lastMsg?.id || lastMsg.id.startsWith('opt-')) return;

    // Optimistic: clear unread
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, unread: 0 } : t));

    // Persist via RPC (fire and forget) — new RPC not yet in generated types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.rpc as any)('mark_thread_read', { p_thread_id: threadId, p_message_id: lastMsg.id }).then(() => {});
  }, [messages]);

  const toggleMute = useCallback(async (threadId: string): Promise<boolean> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.rpc as any)('toggle_thread_mute', { p_thread_id: threadId });
    const newMuted: boolean = (data as boolean | null) ?? false;
    setThreads(prev =>
      prev.map(t => t.id === threadId ? { ...t, muted: newMuted } : t),
    );
    return newMuted;
  }, []);

  const ensureAdoptionRequestThread = useCallback((params: {
    listingId: string;
    peerId: string;
    threadId?: string;
    peerName?: string;
    peerHandle?: string;
    peerTint?: string;
    peerAvatarUrl?: string;
    peerAvatarFallbackUrl?: string;
    peerAvatarOriginalUrl?: string;
  }): ChatThread | null => {
    const profilePatch: Partial<ChatThread> = {
      ...(params.peerName ? { participantName: params.peerName } : {}),
      ...(params.peerHandle ? { participantHandle: params.peerHandle } : {}),
      ...(params.peerTint ? { participantTint: params.peerTint } : {}),
      ...(params.peerAvatarUrl ? { participantAvatarUrl: params.peerAvatarUrl } : {}),
      ...(params.peerAvatarFallbackUrl ? { participantAvatarFallbackUrl: params.peerAvatarFallbackUrl } : {}),
      ...(params.peerAvatarOriginalUrl ? { participantAvatarOriginalUrl: params.peerAvatarOriginalUrl } : {}),
    };

    const existing = threads.find(t => {
      if (params.threadId && t.id === params.threadId) return true;
      if (!params.threadId
        && t.participantId === params.peerId
        && t.adoptionPostId === params.listingId
        && !t.adoptionRecordId) {
        return true;
      }
      return false;
    });
    if (existing) {
      const needsProfile = Object.keys(profilePatch).some(
        key => profilePatch[key as keyof ChatThread] && !existing[key as keyof ChatThread],
      );
      if (needsProfile) {
        const updated = { ...existing, ...profilePatch };
        setThreads(prev => prev.map(t => (t.id === existing.id ? updated : t)));
        return updated;
      }
      return existing;
    }

    if (!params.threadId) return null;

    const thread: ChatThread = {
      id: params.threadId,
      participantId: params.peerId,
      ...profilePatch,
      preview: '',
      time: 'Now',
      unread: 0,
      adoptionPostId: params.listingId,
    };
    setThreads(prev => [thread, ...prev]);
    setMessages(prev => ({ ...prev, [params.threadId!]: prev[params.threadId!] ?? [] }));
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
      kind: kind as any,
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
    sendMessage, sendAlertMessage, registerDmThread, markRead, toggleMute,
    ensureAdoptionRequestThread, appendSystemMessage,
    dismissThread, patchThread, reload: load,
  };
}
