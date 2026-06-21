import { useCallback, useEffect, useRef, useState } from 'react';
import { avatarUrlsFromMedia, normalizeJoinedMedia, USER_AVATAR_MEDIA_SELECT } from '../lib/avatarMedia';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { AppNotification } from '../data/mockData';
import { formatNotificationTimestamp } from '../utils/time';
import { INBOX_TYPES } from '../utils/notificationDisplay';
import { filterActiveCircleRequestNotifs } from '../utils/circleRequestNotifications';
import { filterActiveCircleInviteNotifs } from '../utils/circleInviteNotifications';
import { adjustNotificationCount } from '../lib/notificationCountSync';

export type ActorUser = {
  id: string;
  name: string;
  handle: string;
  tint: string;
  verified: boolean;
  avatarUrl?: string;
  avatarFallbackUrl?: string;
};

type NotifData = {
  circle_id?: string;
  request_id?: string;
  post_id?: string;
  comment_id?: string;
  comment_preview?: string;
  listing_id?: string;
  thread_id?: string;
  record_id?: string;
  pet_name?: string;
  area?: string;
  circle_name?: string;
  milestone_id?: string;
  invite_id?: string;
  requires_admin_approval?: boolean;
  invited_by_user_id?: string;
  action?: string;
  case_id?: string;
  help_type?: string;
};

type DbNotifRow = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  actor_user_id: string | null;
  entity_id: string | null;
  data: NotifData | null;
  read: boolean;
  created_at: string;
};

const DEFAULT_TINT = '#F2972E';

const POST_ACTIVITY_TYPES = new Set(['like', 'comment', 'mention', 'lost', 'found']);

function rowToAppNotif(row: DbNotifRow, actors: Record<string, ActorUser>): AppNotification {
  const actor = row.actor_user_id ? actors[row.actor_user_id] : undefined;
  const data = row.data ?? {};
  const recordId = data.record_id
    ?? (row.type === 'update_request' || row.type === 'adoption_confirmed' || row.type === 'endorsement_received'
      ? row.entity_id ?? undefined
      : undefined);
  const petName = data.pet_name
    ?? (row.type === 'request_received' && row.title
      ? row.title.replace(/^New request for\s+/i, '').trim() || undefined
      : undefined);

  return {
    id: row.id,
    type: row.type,
    read: row.read,
    unread: !row.read,
    createdAt: row.created_at,
    time: formatNotificationTimestamp(row.created_at),
    text: row.title ?? '',
    body: row.body ?? '',
    actor: actor?.handle ?? '',
    userId: row.actor_user_id ?? '',
    userName: actor?.name ?? '',
    entityId: row.entity_id ?? undefined,
    postId: data.post_id
      ?? (POST_ACTIVITY_TYPES.has(row.type) ? row.entity_id ?? undefined : undefined),
    circleId: data.circle_id,
    requestId: data.request_id ?? (row.type === 'circle_request' ? row.entity_id ?? undefined : undefined),
    listingId: data.listing_id,
    recordId,
    threadId: data.thread_id,
    petName,
    commentId: data.comment_id,
    commentPreview: data.comment_preview,
    area: data.area,
    circleName: data.circle_name,
    milestoneId: data.milestone_id,
    inviteId: data.invite_id ?? (row.type === 'circle_invite' ? row.entity_id ?? undefined : undefined),
    requiresAdminApproval: data.requires_admin_approval,
    rescueAction: data.action,
  };
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [actorsByUid, setActorsByUid] = useState<Record<string, ActorUser>>({});
  const actorsCacheRef = useRef<Record<string, ActorUser>>({});
  const notifsRef = useRef(notifs);
  notifsRef.current = notifs;

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
      .in('type', [...INBOX_TYPES])
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data) return;
    const rows = data as DbNotifRow[];
    const actorIds = [...new Set(rows.map(r => r.actor_user_id).filter(Boolean) as string[])];
    const actors = await fetchActors(actorIds);
    let mapped = rows.map(r => rowToAppNotif(r, actors));
    const requestFilter = await filterActiveCircleRequestNotifs(mapped);
    mapped = requestFilter.active;
    const inviteFilter = await filterActiveCircleInviteNotifs(mapped);
    mapped = inviteFilter.active;
    const staleIds = [...requestFilter.staleIds, ...inviteFilter.staleIds];
    if (staleIds.length > 0) {
      supabase.from('notifications').delete().in('id', staleIds).then(() => {});
    }
    setNotifs(mapped);
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
          if (!(INBOX_TYPES as readonly string[]).includes(row.type)) return;
          const actorIds = row.actor_user_id ? [row.actor_user_id] : [];
          const actors = await fetchActors(actorIds);
          setNotifs(prev => [rowToAppNotif(row, actors), ...prev]);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchActors]);

  const markRead = useCallback(async (id: string) => {
    const target = notifsRef.current.find(n => n.id === id);
    if (!target?.unread) return;

    setNotifs(prev => prev.map(n => (
      n.id === id ? { ...n, read: true, unread: false } : n
    )));

    adjustNotificationCount(-1);
    const { error } = await supabase.rpc(
      'mark_notification_read' as never,
      { p_id: id } as never,
    );
    if (error) {
      console.error('[useNotifications] markRead failed:', error.message);
      adjustNotificationCount(1);
      setNotifs(prev => prev.map(n => (
        n.id === id ? { ...n, read: false, unread: true } : n
      )));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const unreadBefore = notifsRef.current.filter(n => n.unread).length;
    if (unreadBefore === 0) return;

    setNotifs(prev => prev.map(n => ({ ...n, read: true, unread: false })));

    adjustNotificationCount(-unreadBefore);
    const { error } = await supabase.rpc('mark_all_notifications_read');
    if (error) {
      console.error('[useNotifications] markAllRead failed:', error.message);
      adjustNotificationCount(unreadBefore);
      void load();
    }
  }, [load]);

  const dismissNotification = useCallback((id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
    supabase.from('notifications').delete().eq('id', id).then(() => {});
  }, []);

  return { notifs, actorsByUid, markRead, markAllRead, dismissNotification, reload: load };
}
