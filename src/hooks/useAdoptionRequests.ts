import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { adjustNotificationCount } from '../lib/notificationCountSync';
import type { AdoptionRequest, AdoptionRequestStatus, AdoptionFeedNotification } from '../context/AdoptionFeedContext';

type DbRequestRow = {
  id: string;
  listing_id: string;
  poster_user_id: string;
  requester_user_id: string;
  message: string | null;
  status: string;
  submitted_at: string;
  thread_id: string | null;
  adoption_listings: { name: string } | null;
  requester: { name: string; handle: string | null } | null;
};

/** Debounce window for coalescing burst realtime events into one reload. */
const REALTIME_RELOAD_MS = 600;

function rowToRequest(row: DbRequestRow): AdoptionRequest {
  const requesterName = row.requester?.name?.trim()
    || row.requester?.handle?.trim()
    || '';
  return {
    id: row.id,
    listingId: row.listing_id,
    listingName: row.adoption_listings?.name ?? '',
    posterId: row.poster_user_id,
    requesterId: row.requester_user_id,
    requesterName,
    message: row.message ?? '',
    submittedAt: new Date(row.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    status: row.status as AdoptionRequestStatus,
    threadId: row.thread_id ?? undefined,
  };
}

export function useAdoptionRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AdoptionRequest[]>([]);
  const [notifications, setNotifications] = useState<AdoptionFeedNotification[]>([]);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadInFlightRef = useRef<Promise<void> | null>(null);
  const loadQueuedRef = useRef(false);

  const load = useCallback(async () => {
    if (!user) return;

    if (loadInFlightRef.current) {
      loadQueuedRef.current = true;
      return loadInFlightRef.current;
    }

    const run = async () => {
      const [{ data: reqRows }, { data: notifRows }] = await Promise.all([
        supabase
          .from('adoption_requests')
          .select(`
          id, listing_id, poster_user_id, requester_user_id,
          message, status, submitted_at, thread_id,
          adoption_listings(name),
          requester:users!requester_user_id(name, handle)
        `)
          .or(`requester_user_id.eq.${user.id},poster_user_id.eq.${user.id}`)
          .order('submitted_at', { ascending: false }),
        supabase
          .from('notifications')
          .select('id, type, title, body, entity_id, data, read, created_at')
          .eq('recipient_id', user.id)
          .in('type', ['request_received', 'approved', 'rejected', 'adopted'])
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      setRequests((reqRows ?? []).map((r: DbRequestRow) => rowToRequest(r as DbRequestRow)));
      setNotifications(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (notifRows ?? []).map((n: any) => ({
          id: n.id,
          type: n.type as AdoptionFeedNotification['type'],
          title: n.title ?? '',
          body: n.body ?? '',
          listingId: (n.data as Record<string, unknown>)?.listing_id as string ?? '',
          requestId: (n.data as Record<string, unknown>)?.request_id as string ?? '',
          recipientId: user.id,
          time: new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          read: n.read,
        })),
      );
    };

    loadInFlightRef.current = run().finally(() => {
      loadInFlightRef.current = null;
      if (loadQueuedRef.current) {
        loadQueuedRef.current = false;
        void load();
      }
    });

    return loadInFlightRef.current;
  }, [user]);

  const scheduleReload = useCallback(() => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      reloadTimerRef.current = null;
      void load();
    }, REALTIME_RELOAD_MS);
  }, [load]);

  const markRequestNotificationsRead = useCallback(async (opts: {
    listingId?: string;
    requestId?: string;
  } = {}) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('id, data')
      .eq('recipient_id', user.id)
      .eq('type', 'request_received')
      .eq('read', false);

    if (error || !data?.length) return;

    const ids = data
      .filter(row => {
        const payload = row.data as Record<string, unknown> | null;
        if (opts.listingId && payload?.listing_id !== opts.listingId) return false;
        if (opts.requestId && payload?.request_id !== opts.requestId) return false;
        return true;
      })
      .map(row => row.id as string);

    if (ids.length === 0) return;

    setNotifications(prev => prev.map(n => (
      ids.includes(n.id) ? { ...n, read: true } : n
    )));
    adjustNotificationCount(-ids.length);

    const results = await Promise.all(
      ids.map(id => supabase.rpc(
        'mark_notification_read' as never,
        { p_id: id } as never,
      )),
    );
    const failed = results.filter(r => r.error).length;
    if (failed > 0) {
      adjustNotificationCount(failed);
      void load();
    }
  }, [user, load]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => () => {
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
  }, []);

  useEffect(() => {
    if (!user) return;

    const requestsChannel = supabase
      .channel(`adoption-requests-feed:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'adoption_requests' },
        () => { scheduleReload(); },
      )
      .subscribe();

    // Backup when adoption_requests realtime (0051) is missing — only new
    // incoming requests need a poster inbox refresh; other adoption notifs
    // are handled by optimistic updates or the requests channel.
    const notifsChannel = supabase
      .channel(`adoption-requests-notifs:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { type?: string };
          if (row.type === 'request_received') {
            scheduleReload();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(notifsChannel);
    };
  }, [user, scheduleReload]);

  const submitRequest = useCallback((input: {
    listingId: string;
    listingName: string;
    posterId: string;
    message: string;
    threadId?: string;
  }): string => {
    if (!user) return '';
    const trimmedMessage = input.message.trim();
    const existing = requests.find(r =>
      r.listingId === input.listingId && r.requesterId === user.id,
    );

    if (existing && (existing.status === 'adopted' || existing.status === 'rejected')) {
      setRequests(prev => prev.map(r =>
        r.id === existing.id
          ? {
            ...r,
            message: trimmedMessage,
            status: 'submitted' as AdoptionRequestStatus,
            threadId: undefined,
            submittedAt: 'Just now',
          }
          : r,
      ));

      supabase.from('adoption_requests').update({
        message: trimmedMessage,
        status: 'submitted',
        thread_id: null,
        submitted_at: new Date().toISOString(),
      }).eq('id', existing.id).then(({ error }) => {
        if (error) load();
      });

      if (input.posterId !== user.id) {
        supabase.from('notifications').insert({
          recipient_id: input.posterId,
          type: 'request_received',
          actor_user_id: user.id,
          entity_type: 'adoption_request',
          entity_id: existing.id,
          title: `New request for ${input.listingName}`,
          body: `Someone wants to adopt ${input.listingName}. Review their message.`,
          data: { listing_id: input.listingId, request_id: existing.id },
        }).then(() => {});
      }

      return existing.id;
    }

    if (existing && (existing.status === 'submitted' || existing.status === 'approved')) {
      return existing.id;
    }

    const reqId = `opt-req-${Date.now()}`;
    const req: AdoptionRequest = {
      id: reqId,
      listingId: input.listingId,
      listingName: input.listingName,
      posterId: input.posterId,
      requesterId: user.id,
      requesterName: '',
      message: trimmedMessage,
      submittedAt: 'Just now',
      status: 'submitted',
      threadId: input.threadId,
    };
    setRequests(prev => [req, ...prev]);

    supabase.from('adoption_requests').insert({
      listing_id: input.listingId,
      poster_user_id: input.posterId,
      requester_user_id: user.id,
      message: trimmedMessage,
      thread_id: input.threadId ?? null,
    }).select('id').single().then(({ data, error }) => {
      if (error || !data) {
        setRequests(prev => prev.filter(r => r.id !== reqId));
        return;
      }
      const realId = (data as { id: string }).id;
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, id: realId } : r));

      // Notify poster
      if (input.posterId !== user.id) {
        supabase.from('notifications').insert({
          recipient_id: input.posterId,
          type: 'request_received',
          actor_user_id: user.id,
          entity_type: 'adoption_request',
          entity_id: realId,
          title: `New request for ${input.listingName}`,
          body: `Someone wants to adopt ${input.listingName}. Review their message.`,
          data: { listing_id: input.listingId, request_id: realId },
        }).then(() => {});
      }
    });

    return reqId;
  }, [user, requests, load]);

  const approveRequest = useCallback(async (requestId: string): Promise<string | null> => {
    const target = requests.find(r => r.id === requestId);
    if (!target || !user) return null;

    // Optimistic status update
    setRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, status: 'approved' as AdoptionRequestStatus } : r,
    ));

    const { data, error } = await supabase.rpc('approve_adoption_request', { p_request_id: requestId });
    if (error) {
      setRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, status: 'submitted' as AdoptionRequestStatus } : r,
      ));
      return null;
    }

    const threadId = data as string;
    setRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, threadId, status: 'approved' as AdoptionRequestStatus } : r,
    ));

    // Notify requester
    supabase.from('notifications').insert({
      recipient_id: target.requesterId,
      type: 'approved',
      actor_user_id: user.id,
      entity_type: 'adoption_request',
      entity_id: requestId,
      title: `${target.listingName} — request approved`,
      body: 'Your request was approved. Open your thread to coordinate.',
      data: { listing_id: target.listingId, request_id: requestId, thread_id: threadId },
    }).then(() => {});

    void markRequestNotificationsRead({
      listingId: target.listingId,
      requestId,
    });

    return threadId;
  }, [requests, user, markRequestNotificationsRead]);

  const rejectRequest = useCallback((requestId: string) => {
    const target = requests.find(r => r.id === requestId);
    if (!target || !user) return;

    setRequests(prev => prev.map(r =>
      r.id === requestId ? { ...r, status: 'rejected' as AdoptionRequestStatus } : r,
    ));

    supabase.rpc('reject_adoption_request', { p_request_id: requestId }).then(({ error }) => {
      if (error) {
        setRequests(prev => prev.map(r =>
          r.id === requestId ? { ...r, status: 'submitted' as AdoptionRequestStatus } : r,
        ));
        return;
      }
      void markRequestNotificationsRead({
        listingId: target.listingId,
        requestId,
      });
      supabase.from('notifications').insert({
        recipient_id: target.requesterId,
        type: 'rejected',
        actor_user_id: user.id,
        entity_type: 'adoption_request',
        entity_id: requestId,
        title: `Update on ${target.listingName}`,
        body: 'The poster passed on this request. Browse other pets.',
        data: { listing_id: target.listingId, request_id: requestId },
      }).then(() => {});
    });
  }, [requests, user, markRequestNotificationsRead]);

  const cancelRequest = useCallback((requestId: string) => {
    setRequests(prev => prev.filter(r => r.id !== requestId));
    supabase.from('adoption_requests').delete().eq('id', requestId).then(() => {});
  }, []);

  const completeAdoption = useCallback((requestId: string, note?: string) => {
    if (!user) return;
    setRequests(prev => {
      const target = prev.find(r => r.id === requestId);
      if (!target) return prev;

      // Notify the adopter
      supabase.from('notifications').insert({
        recipient_id: target.requesterId,
        type: 'adopted',
        actor_user_id: user.id,
        entity_type: 'adoption_request',
        entity_id: requestId,
        title: `${target.listingName} found a home!`,
        body: note ?? 'The poster marked this adoption complete.',
        data: { listing_id: target.listingId, request_id: requestId },
      }).then(() => {});

      return prev.map(r => {
        if (r.id === requestId) return { ...r, status: 'adopted' as AdoptionRequestStatus };
        if (r.listingId === target.listingId && r.status !== 'rejected')
          return { ...r, status: 'rejected' as AdoptionRequestStatus };
        return r;
      });
    });

    // Persist status changes to DB
    supabase.from('adoption_requests').update({ status: 'adopted' }).eq('id', requestId).then(() => {});
    supabase.from('adoption_requests')
      .update({ status: 'rejected' })
      .neq('id', requestId)
      .in('status', ['submitted', 'approved'])
      .then(() => {}); // full listing filter happens via the RLS + RPC context
  }, [user]);

  const attachThreadToRequest = useCallback((requestId: string, threadId: string) => {
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, threadId } : r));
    supabase.from('adoption_requests').update({ thread_id: threadId }).eq('id', requestId).then(() => {});
  }, []);

  const clearRequestOnRelist = useCallback((listingId: string, requesterId: string) => {
    setRequests(prev => prev.map(r =>
      r.listingId === listingId && r.requesterId === requesterId
        ? { ...r, status: 'rejected' as AdoptionRequestStatus, threadId: undefined }
        : r,
    ));
    // Poster cannot DELETE (RLS); reset so the requester can re-apply via upsert.
    supabase.from('adoption_requests')
      .update({ status: 'rejected', thread_id: null })
      .eq('listing_id', listingId)
      .eq('requester_user_id', requesterId)
      .then(({ error }) => {
        if (error) load();
      });
  }, [load]);

  const markNotificationRead = useCallback(async (id: string) => {
    const target = notifications.find(n => n.id === id);
    if (!target || target.read) return;

    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    adjustNotificationCount(-1);

    const { error } = await supabase.rpc(
      'mark_notification_read' as never,
      { p_id: id } as never,
    );
    if (error) {
      adjustNotificationCount(1);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: false } : n)));
    }
  }, [notifications]);

  const markListingRequestNotificationsRead = useCallback(
    (listingId: string) => markRequestNotificationsRead({ listingId }),
    [markRequestNotificationsRead],
  );

  return {
    requests, setRequests, notifications,
    submitRequest, approveRequest, rejectRequest, cancelRequest,
    completeAdoption, attachThreadToRequest, clearRequestOnRelist,
    markNotificationRead, markListingRequestNotificationsRead, reload: load,
  };
}
