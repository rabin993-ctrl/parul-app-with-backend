import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  type CircleMediaKind,
  extFromMime,
  formatFileSize,
  insertCircleSharedPost,
  uploadCircleChatMedia,
} from '../lib/circleChatMedia';
import type { PickedAsset } from './useMediaPicker';
import type { PickedFile } from './useFilePicker';

export type DbCircleMessage =
  | { id: string; type: 'text'; userId: string; text: string; time: string }
  | { id: string; type: 'system'; text: string; time: string }
  | { id: string; type: 'shared_post'; userId: string; postId: string; time: string }
  | {
      id: string;
      type: 'media';
      userId: string;
      time: string;
      caption?: string;
      mediaKind: CircleMediaKind;
      name: string;
      size: string;
      mediaUrl: string;
      thumbUrl?: string;
      mime?: string;
      durationMs?: number;
    };

const MESSAGE_SELECT = `
  id, type, sender_user_id, text, shared_post_id, created_at, deleted_at,
  circle_message_media (
    type, name, size,
    media_assets (url, thumb_url, mime, duration_ms)
  )
`;

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diffH < 48) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function normalizeMediaRow(row: unknown): {
  type: string;
  name: string | null;
  size: string | null;
  media_assets: { url: string; thumb_url: string | null; mime: string | null; duration_ms: number | null } | null;
} | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const assets = r.media_assets;
  const asset = Array.isArray(assets) ? assets[0] : assets;
  return {
    type: String(r.type ?? 'file'),
    name: typeof r.name === 'string' ? r.name : null,
    size: typeof r.size === 'string' ? r.size : null,
    media_assets: asset && typeof asset === 'object'
      ? asset as { url: string; thumb_url: string | null; mime: string | null; duration_ms: number | null }
      : null,
  };
}

function mediaKindFromRow(type: string): CircleMediaKind {
  if (type === 'photo') return 'photo';
  if (type === 'audio') return 'audio';
  return 'file';
}

function rowToMsg(row: Record<string, unknown>): DbCircleMessage | null {
  if (row.deleted_at) return null;
  const time = formatMsgTime(row.created_at as string);
  const type = row.type as string;

  if (type === 'system') {
    return { id: row.id as string, type: 'system', text: (row.text as string) ?? '', time };
  }
  if (type === 'text') {
    return {
      id: row.id as string,
      type: 'text',
      userId: (row.sender_user_id as string) ?? '',
      text: (row.text as string) ?? '',
      time,
    };
  }
  if (type === 'shared_post') {
    return {
      id: row.id as string,
      type: 'shared_post',
      userId: (row.sender_user_id as string) ?? '',
      postId: (row.shared_post_id as string) ?? '',
      time,
    };
  }

  const mediaRows = row.circle_message_media;
  const media = normalizeMediaRow(Array.isArray(mediaRows) ? mediaRows[0] : mediaRows);
  if ((type === 'media' || media) && media?.media_assets?.url) {
    const assets = media.media_assets;
    return {
      id: row.id as string,
      type: 'media',
      userId: (row.sender_user_id as string) ?? '',
      time,
      caption: (row.text as string) || undefined,
      mediaKind: mediaKindFromRow(media.type),
      name: media.name ?? 'Attachment',
      size: media.size ?? '',
      mediaUrl: assets.url,
      thumbUrl: assets.thumb_url ?? undefined,
      mime: assets.mime ?? undefined,
      durationMs: assets.duration_ms ?? undefined,
    };
  }

  return null;
}

function appendUnique(prev: DbCircleMessage[], msg: DbCircleMessage): DbCircleMessage[] {
  if (prev.some(m => m.id === msg.id)) return prev;
  const withoutOptimistic = prev.filter(m => {
    if (!m.id.startsWith('opt-')) return true;
    if (m.type !== msg.type) return true;
    if (m.type === 'text' && msg.type === 'text') {
      return m.text !== msg.text || m.userId !== msg.userId;
    }
    return true;
  });
  return [...withoutOptimistic, msg];
}

export function useCircleMessages(
  circleId: string | null | undefined,
  userId: string | null | undefined,
) {
  const [messages, setMessages] = useState<DbCircleMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const seenIds = useRef(new Set<string>());

  const load = useCallback(async () => {
    if (!circleId) return;
    setLoading(true);
    const { data } = await supabase
      .from('circle_messages')
      .select(MESSAGE_SELECT)
      .eq('circle_id', circleId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(200);
    if (data) {
      const msgs = (data as Record<string, unknown>[])
        .map(rowToMsg)
        .filter((m): m is DbCircleMessage => m !== null);
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
        async (payload) => {
          const id = (payload.new as { id: string }).id;
          if (seenIds.current.has(id)) return;
          const { data } = await supabase
            .from('circle_messages')
            .select(MESSAGE_SELECT)
            .eq('id', id)
            .maybeSingle();
          const msg = data ? rowToMsg(data as Record<string, unknown>) : null;
          if (!msg || seenIds.current.has(msg.id)) return;
          seenIds.current.add(msg.id);
          setMessages(prev => appendUnique(prev, msg));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [circleId]);

  const insertMediaMessage = useCallback(async (
    mediaKind: CircleMediaKind,
    name: string,
    sizeLabel: string,
    upload: () => Promise<{ mediaId: string }>,
    caption?: string,
  ): Promise<boolean> => {
    if (!circleId || !userId) return false;
    setSending(true);
    try {
      const { mediaId } = await upload();
      const { data: msgRow, error: msgErr } = await supabase
        .from('circle_messages')
        .insert({
          circle_id: circleId,
          type: 'media',
          sender_user_id: userId,
          text: caption?.trim() || null,
        })
        .select('id')
        .single();
      if (msgErr || !msgRow) return false;

      const messageId = (msgRow as { id: string }).id;
      const sharedType = mediaKind === 'audio' ? 'audio' : mediaKind;
      const { error: mediaErr } = await supabase.from('circle_message_media').insert({
        circle_id: circleId,
        message_id: messageId,
        type: sharedType,
        media_id: mediaId,
        name,
        size: sizeLabel,
      });
      if (mediaErr) return false;

      seenIds.current.add(messageId);
      const { data: fullRow } = await supabase
        .from('circle_messages')
        .select(MESSAGE_SELECT)
        .eq('id', messageId)
        .maybeSingle();
      const parsed = fullRow ? rowToMsg(fullRow as Record<string, unknown>) : null;
      if (parsed) setMessages(prev => appendUnique(prev, parsed));
      return true;
    } finally {
      setSending(false);
    }
  }, [circleId, userId]);

  const send = useCallback(async (text: string) => {
    if (!circleId || !userId || !text.trim()) return false;
    const optimisticId = `opt-${Date.now()}`;
    const optimistic: DbCircleMessage = {
      id: optimisticId,
      type: 'text',
      userId,
      text: text.trim(),
      time: 'Just now',
    };
    setMessages(prev => [...prev, optimistic]);
    seenIds.current.add(optimisticId);

    const { data, error } = await supabase.from('circle_messages').insert({
      circle_id: circleId,
      type: 'text',
      sender_user_id: userId,
      text: text.trim(),
    }).select('id').single();

    if (error || !data?.id) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      seenIds.current.delete(optimisticId);
      return false;
    }

    seenIds.current.add(data.id);
    setMessages(prev => prev.map(m => (m.id === optimisticId ? { ...m, id: data.id } : m)));
    return true;
  }, [circleId, userId]);

  const sendPhoto = useCallback(async (asset: PickedAsset, caption?: string) => {
    if (!userId) return false;
    return insertMediaMessage(
      'photo',
      'Photo',
      formatFileSize(asset.bytes),
      async () => {
        const uploaded = await uploadCircleChatMedia({
          userId,
          localUri: asset.uri,
          ext: asset.ext,
          mime: asset.mime,
          bytes: asset.bytes,
          width: asset.width,
          height: asset.height,
        });
        return { mediaId: uploaded.mediaId };
      },
      caption,
    );
  }, [insertMediaMessage, userId]);

  const sendFile = useCallback(async (file: PickedFile, caption?: string) => {
    if (!userId) return false;
    const ext = extFromMime(file.mime, file.name.split('.').pop() ?? 'bin');
    return insertMediaMessage(
      'file',
      file.name,
      formatFileSize(file.bytes),
      async () => {
        const uploaded = await uploadCircleChatMedia({
          userId,
          localUri: file.uri,
          ext,
          mime: file.mime,
          bytes: file.bytes,
          generateVariants: false,
        });
        return { mediaId: uploaded.mediaId };
      },
      caption,
    );
  }, [insertMediaMessage, userId]);

  const sendVoiceNote = useCallback(async (
    localUri: string,
    durationMs: number,
    caption?: string,
  ) => {
    if (!userId) return false;
    const ext = extFromMime('audio/m4a');
    return insertMediaMessage(
      'audio',
      'Voice note',
      formatFileSize(undefined),
      async () => {
        const blob = await (await fetch(localUri)).blob();
        const uploaded = await uploadCircleChatMedia({
          userId,
          localUri,
          ext,
          mime: 'audio/m4a',
          bytes: blob.size,
          durationMs,
          generateVariants: false,
        });
        return { mediaId: uploaded.mediaId };
      },
      caption,
    );
  }, [insertMediaMessage, userId]);

  const sendSharedPost = useCallback(async (postId: string) => {
    if (!circleId || !userId) return false;
    setSending(true);
    try {
      const id = await insertCircleSharedPost(circleId, userId, postId);
      if (!id) return false;
      seenIds.current.add(id);
      const msg: DbCircleMessage = {
        id,
        type: 'shared_post',
        userId,
        postId,
        time: 'Just now',
      };
      setMessages(prev => appendUnique(prev, msg));
      return true;
    } finally {
      setSending(false);
    }
  }, [circleId, userId]);

  return {
    messages,
    loading,
    sending,
    send,
    sendPhoto,
    sendFile,
    sendVoiceNote,
    sendSharedPost,
    refresh: load,
  };
}
