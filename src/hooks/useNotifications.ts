import { useCallback, useEffect, useRef, useState } from 'react';
import { avatarUrlsFromMedia, normalizeJoinedMedia, USER_AVATAR_MEDIA_SELECT } from '../lib/avatarMedia';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { AppNotification } from '../data/mockData';

export type ActorUser = {
  id: string;
  name: string;
  handle: string;
  tint: string;
  verified: boolean;
  avatarUrl?: string;
  avatarFallbackUrl?: string;
};

type DbNotifRow = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  actor_user_id: string | null;
  entity_id: string | null;
  data: { circle_id?: string; request_id?: string } | null;
  read: boolean;
  created_at: string;
};

const GENERAL_TYPES = [
  'like', 'comment', 'mention', 'lost', 'found',
  'circle_request', 'circle_accept', 'rescue_help',
];

const DEFAULT_TINT = '#F2972E';

function rowToAppNotif(row: DbNotifRow, actors: Record<string, ActorUser>): AppNotification {
  const actor = row.actor_user_id ? actors[row.actor_user_id] : undefined;
  const data = row.data ?? undefined;
  return {
    id: row.id,
    type: row.type,
    read: row.read,
    unread: !row.read,
    time: new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    text: row.title ?? '',
    body: row.body ?? '',
    actor: actor?.handle ?? '',
    userId: row.actor_user_id ?? '',
    userName: actor?.name ?? '',
    entityId: row.entity_id ?? undefined,
    circleId: data?.circle_id,
    requestId: data?.request_id ?? row.entity_id ?? undefined,
  };
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [actorsByUid, setActorsByUid] = useState<Record<string, ActorUser>>({});
  const actorsCacheRef = useRef<Record<string, ActorUser>>({});

  const fetchActors = useCallback(async (uids: string[]): Promise<Record<string, ActorUser>> => {
    const missing = uids.filter(id => !actorsCacheRef.current[id]);
    if (missing.length > 0) {
      const { data } = await (supabase as any)
        .from('users')
        .select(`id, name, handle, tint, verified, ${USER_AVATAR_MEDIA_SELECT}`)
        .in('id', missing);
      if (data) {
        for (const row of data ?? []) {
          const urls = avatarUrlsFromMedia(normalizeJoinedMedia(row.avatar_media as never));
          actorsCacheRef.current[row.id] = {
            id: row.id,
            name: row.name,
            handle: row.handle ?? row.name,
            tint: row.tint || DEFAULT_TINT,
            verified: row.verified,
            avatarUrl: urls.avatarUrl,
            avatarFallbackUrl: urls.avatarFallbackUrl,
          };
        }
      }
    }
    setActorsByUid({ ...actorsCacheRef.current });
    return actorsCacheRef.current;
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, actor_user_id, entity_id, data, read, created_at')
      .eq('recipient_id', user.id)
      .in('type', GENERAL_TYPES)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data) return;
    const rows = data as DbNotifRow[];
    const actorIds = [...new Set(rows.map(r => r.actor_user_id).filter(Boolean) as string[])];
    const actors = await fetchActors(actorIds);
    setNotifs(rows.map(r => rowToAppNotif(r, actors)));
  }, [user, fetchActors]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifs:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          const row = payload.new as DbNotifRow;
          if (!GENERAL_TYPES.includes(row.type)) return;
          const actorIds = row.actor_user_id ? [row.actor_user_id] : [];
          const actors = await fetchActors(actorIds);
          setNotifs(prev => [rowToAppNotif(row, actors), ...prev]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchActors]);

  const markRead = useCallback((id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true, unread: false } : n));
    supabase.from('notifications').update({ read: true }).eq('id', id).then(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true, unread: false })));
    supabase.rpc('mark_all_notifications_read').then(() => {});
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
    supabase.from('notifications').delete().eq('id', id).then(() => {});
  }, []);

  return { notifs, actorsByUid, markRead, markAllRead, dismissNotification, reload: load };
}
