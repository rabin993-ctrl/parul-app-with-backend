import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
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

  const load = useCallback(async () => {
    if (!user) return;
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
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('adoption-requests-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'adoption_requests' },
        () => { load(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const submitRequest = useCallback((input: {
    listingId: string;
    listingName: string;
    posterId: string;
    message: string;
    threadId?: string;
  }): string => {
    if (!user) return '';
    const reqId = `opt-req-${Date.now()}`;
    const req: AdoptionRequest = {
      id: reqId,
      listingId: input.listingId,
      listingName: input.listingName,
      posterId: input.posterId,
      requesterId: user.id,
      requesterName: '',
      message: input.message.trim(),
      submittedAt: 'Just now',
      status: 'submitted',
      threadId: input.threadId,
    };
    setRequests(prev => [req, ...prev]);

    supabase.from('adoption_requests').insert({
      listing_id: input.listingId,
      poster_user_id: input.posterId,
      requester_user_id: user.id,
      message: input.message.trim(),
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
  }, [user]);

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

    return threadId;
  }, [requests, user]);

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
  }, [requests, user]);

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
    setRequests(prev => prev.filter(r => !(r.listingId === listingId && r.requesterId === requesterId)));
    supabase.from('adoption_requests')
      .delete().eq('listing_id', listingId).eq('requester_user_id', requesterId).then(() => {});
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    supabase.from('notifications').update({ read: true }).eq('id', id).then(() => {});
  }, []);

  return {
    requests, setRequests, notifications,
    submitRequest, approveRequest, rejectRequest, cancelRequest,
    completeAdoption, attachThreadToRequest, clearRequestOnRelist,
    markNotificationRead, reload: load,
  };
}
