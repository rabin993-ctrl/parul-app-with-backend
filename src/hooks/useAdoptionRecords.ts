import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { AdoptionRecord, AdoptionUpdate, AdoptionUpdatePayload } from '../data/adoptionRecords';
import { ADOPTION_BOOTSTRAP_UPDATE, POSTER_ENDORSEMENT_DEFAULT_RECOMMENDED_TEXT } from '../data/adoptionRecords';
import { canAdopterPostUpdate, milestoneAfterUpdate, recomputeRecordStatus } from '../utils/adoptionUpdateSchedule';
import { formatNotificationTimestamp } from '../utils/time';
import type { AdoptionNotification } from '../context/AdoptionContext';
import { primeAdopterPublicStatus } from '../lib/adopterPublicFlagCache';
import { resolveAdopterPublicStatus } from '../utils/adoptionUserFlag';

type DbRecordRow = {
  id: string;
  listing_id: string;
  chat_thread_id: string | null;
  poster_user_id: string;
  adopter_user_id: string;
  pet_name: string;
  species: string | null;
  icon: string | null;
  tint: string | null;
  new_home: string | null;
  status: string;
  confirmed_at: string | null;
  completed_milestones: string[];
  poster_endorsed: boolean;
  poster_recommendation: string | null;
  next_update_due_at: string | null;
  closed_reason: string | null;
  closed_at: string | null;
};

type DbUpdateRow = {
  id: string;
  record_id: string;
  type: string;
  author_user_id: string;
  text: string | null;
  endorsement: string | null;
  photo_count: number | null;
  has_video: boolean;
  milestone_id: string | null;
  created_at: string;
};

function rowToRecord(row: DbRecordRow, updates: AdoptionUpdate[]): AdoptionRecord {
  const confirmedAtMs = row.confirmed_at ? new Date(row.confirmed_at).getTime() : undefined;
  return {
    id: row.id,
    adoptionPostId: row.listing_id,
    chatThreadId: row.chat_thread_id ?? undefined,
    posterId: row.poster_user_id,
    adopterId: row.adopter_user_id,
    petName: row.pet_name,
    species: row.species ?? 'cat',
    icon: row.icon ?? 'cat',
    tint: row.tint ?? '#7A5AE0',
    newHome: row.new_home ?? undefined,
    status: row.status as AdoptionRecord['status'],
    confirmedAt: row.confirmed_at
      ? new Date(row.confirmed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : undefined,
    confirmedAtMs,
    updates,
    completedMilestones: (row.completed_milestones ?? []) as AdoptionRecord['completedMilestones'],
    posterEndorsed: row.poster_endorsed,
    posterRecommendation: row.poster_recommendation as AdoptionRecord['posterRecommendation'],
    nextUpdateDueAt: row.next_update_due_at ?? undefined,
    closedReason: row.closed_reason as 'relisted' | undefined,
    closedAt: row.closed_at
      ? new Date(row.closed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : undefined,
  };
}

function rowToUpdate(row: DbUpdateRow): AdoptionUpdate {
  return {
    id: row.id,
    type: row.type as AdoptionUpdate['type'],
    authorId: row.author_user_id,
    text: row.text ?? undefined,
    endorsement: row.endorsement as AdoptionUpdate['endorsement'],
    photoCount: row.photo_count ?? undefined,
    hasVideo: row.has_video,
    milestoneId: row.milestone_id as AdoptionUpdate['milestoneId'],
    createdAt: new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    createdAtMs: new Date(row.created_at).getTime(),
  };
}

export function useAdoptionRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AdoptionRecord[]>([]);
  const [adoptionNotifications, setAdoptionNotifications] = useState<AdoptionNotification[]>([]);

  const load = useCallback(async () => {
    if (!user) return;

    const [{ data: recRows }, { data: notifRows }] = await Promise.all([
      supabase
        .from('adoption_records')
        .select('*')
        .or(`poster_user_id.eq.${user.id},adopter_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false }),
      supabase
        .from('notifications')
        .select('id, type, title, body, data, read, created_at')
        .eq('recipient_id', user.id)
        .eq('type', 'update_request')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const recordIds = (recRows ?? []).map((r: DbRecordRow) => r.id);
    let updRows: DbUpdateRow[] = [];
    if (recordIds.length > 0) {
      const { data } = await supabase
        .from('adoption_updates')
        .select('*')
        .in('record_id', recordIds)
        .order('created_at', { ascending: true });
      updRows = (data ?? []) as DbUpdateRow[];
    }

    // Group updates by record_id
    const updatesByRecord = new Map<string, AdoptionUpdate[]>();
    for (const u of updRows) {
      const upd = rowToUpdate(u);
      const arr = updatesByRecord.get(u.record_id) ?? [];
      arr.push(upd);
      updatesByRecord.set(u.record_id, arr);
    }

    const mappedRecords = (recRows ?? []).map((r: DbRecordRow) =>
      rowToRecord(r, updatesByRecord.get(r.id) ?? []),
    );
    setRecords(mappedRecords);

    const adopterIds = new Set(mappedRecords.map(record => record.adopterId));
    for (const adopterId of adopterIds) {
      primeAdopterPublicStatus(adopterId, resolveAdopterPublicStatus(mappedRecords, adopterId));
    }

    setAdoptionNotifications(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (notifRows ?? []).map((n: any) => {
        const d = (n.data as Record<string, unknown> | null) ?? {};
        return {
          id: n.id as string,
          type: 'update_request' as const,
          recordId: (d.record_id as string) ?? '',
          petName: (d.pet_name as string) ?? '',
          title: (n.title as string | null) ?? 'Home update requested',
          body: (n.body as string | null) ?? '',
          time: formatNotificationTimestamp(n.created_at as string),
          unread: !(n.read as boolean),
          recipientId: user.id,
          milestoneId: (d.milestone_id as string) ?? undefined,
        };
      }),
    );
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('adoption-records-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'adoption_records' },
        () => { load(); },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'adoption_updates' },
        () => { load(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const proposeAdoption = useCallback(async (params: {
    threadId: string;
    adoptionPostId: string;
    posterId: string;
    adopterId: string;
    petName: string;
    species: string;
    icon: string;
    tint: string;
    requestId?: string;
  }): Promise<string | null> => {
    if (!user) return null;
    const nowMs = Date.now();
    const now = new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Optimistic record
    const optimisticId = `opt-rec-${nowMs}`;
    const optimisticRecord: AdoptionRecord = {
      id: optimisticId,
      adoptionPostId: params.adoptionPostId,
      chatThreadId: params.threadId,
      posterId: params.posterId,
      adopterId: params.adopterId,
      petName: params.petName,
      species: params.species,
      icon: params.icon,
      tint: params.tint,
      status: 'confirmed',
      confirmedAt: now,
      confirmedAtMs: nowMs,
      completedMilestones: [],
      updates: [{
        id: `opt-upd-${nowMs}`,
        type: 'adopter_home',
        authorId: params.adopterId,
        text: ADOPTION_BOOTSTRAP_UPDATE,
        createdAt: now,
        createdAtMs: nowMs,
      }],
    };
    setRecords(prev => [optimisticRecord, ...prev]);

    const { data, error } = await supabase.rpc('propose_adoption', {
      p_listing_id: params.adoptionPostId,
      p_adopter_user_id: params.adopterId,
      p_pet_name: params.petName,
      p_species: params.species,
      p_icon: params.icon,
      p_tint: params.tint,
      p_thread_id: params.threadId || undefined,
      p_request_id: params.requestId || undefined,
    });

    if (error || !data) {
      setRecords(prev => prev.filter(r => r.id !== optimisticId));
      return null;
    }

    const realId = data as string;
    setRecords(prev => prev.map(r => r.id === optimisticId ? { ...r, id: realId } : r));
    return realId;
  }, [user]);

  const confirmAdoption = useCallback(async (recordId: string) => {
    if (!user) return;
    const nowMs = Date.now();
    const now = new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    setRecords(prev => prev.map(r => {
      if (r.id !== recordId) return r;
      return {
        ...r,
        status: 'confirmed',
        confirmedAt: now,
        confirmedAtMs: nowMs,
        completedMilestones: [],
        updates: [...r.updates, {
          id: `opt-upd-${nowMs}`,
          type: 'adopter_home' as const,
          authorId: r.adopterId,
          text: ADOPTION_BOOTSTRAP_UPDATE,
          createdAt: now,
          createdAtMs: nowMs,
        }],
      };
    }));

    supabase.rpc('confirm_adoption', { p_record_id: recordId }).then(({ error }) => {
      if (error) load();
    });
  }, [user, load]);

  const relistAdoptionPlacement = useCallback((recordId: string) => {
    const target = records.find(r => r.id === recordId);
    if (!target) return null;

    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setRecords(prev => prev.map(r =>
      r.id === recordId
        ? { ...r, status: 'closed', closedReason: 'relisted', closedAt: now, chatThreadId: undefined }
        : r,
    ));

    supabase.from('adoption_records').update({
      status: 'closed', closed_reason: 'relisted', closed_at: new Date().toISOString(),
    }).eq('id', recordId).then(() => {});

    if (target.chatThreadId) {
      supabase.from('threads').update({ adoption_record_id: null }).eq('id', target.chatThreadId).then(() => {});
    }

    return {
      listingId: target.adoptionPostId,
      adopterId: target.adopterId,
      threadId: target.chatThreadId,
    };
  }, [records]);

  const submitAdopterUpdate = useCallback((recordId: string, payload: AdoptionUpdatePayload) => {
    if (!payload.photoCount || payload.photoCount < 1 || !user) return;

    const existing = records.find(r => r.id === recordId);
    if (!existing || !canAdopterPostUpdate(existing)) return;

    const nowMs = Date.now();
    const now = new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const mediaParts: string[] = [];
    if (payload.photoCount) mediaParts.push(`${payload.photoCount} photo${payload.photoCount > 1 ? 's' : ''}`);
    if (payload.hasVideo) mediaParts.push('1 video');
    const mediaLine = mediaParts.length > 0 ? `📸 ${mediaParts.join(' · ')}` : '';
    const text = [payload.text?.trim(), mediaLine].filter(Boolean).join('\n') || 'Home update shared';

    setRecords(prev => prev.map(r => {
      if (r.id !== recordId) return r;
      const milestoneId = milestoneAfterUpdate(r, nowMs);
      const completed = new Set(r.completedMilestones ?? []);
      if (milestoneId) completed.add(milestoneId);
      const updated: AdoptionRecord = {
        ...r,
        updates: [...r.updates, {
          id: `opt-upd-${nowMs}`,
          type: 'adopter_home',
          authorId: r.adopterId,
          text,
          photoCount: payload.photoCount,
          hasVideo: payload.hasVideo,
          milestoneId: milestoneId ?? undefined,
          createdAt: now,
          createdAtMs: nowMs,
        }],
        completedMilestones: [...completed] as AdoptionRecord['completedMilestones'],
        status: 'confirmed',
      };
      updated.status = recomputeRecordStatus(updated);
      return updated;
    }));

    const record = records.find(r => r.id === recordId);
    const milestoneId = record ? milestoneAfterUpdate(record, nowMs) : null;

    supabase.rpc('post_adoption_update', {
      p_record_id: recordId,
      p_type: 'adopter_home',
      p_text: text,
      p_milestone_id: milestoneId ?? undefined,
      p_photo_count: payload.photoCount ?? null,
      p_has_video: payload.hasVideo ?? false,
    }).then(({ error }) => { if (error) load(); });
  }, [user, records, load]);

  const submitPosterPlacement = useCallback((recordId: string, text: string) => {
    if (!user) return;
    const nowMs = Date.now();
    const now = new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setRecords(prev => prev.map(r =>
      r.id === recordId
        ? { ...r, updates: [...r.updates, { id: `opt-upd-${nowMs}`, type: 'poster_placement' as const, authorId: r.posterId, text, createdAt: now, createdAtMs: nowMs }] }
        : r,
    ));
    supabase.rpc('post_adoption_update', {
      p_record_id: recordId, p_type: 'poster_placement', p_text: text,
    }).then(({ error }) => { if (error) load(); });
  }, [user, load]);

  const submitPosterEndorsement = useCallback((
    recordId: string,
    recommendation: 'recommended' | 'not_recommended',
    text?: string,
  ) => {
    if (!user) return;
    const trimmed = text?.trim();
    if (recommendation === 'not_recommended' && !trimmed) return;

    const nowMs = Date.now();
    const now = new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const defaultText = recommendation === 'recommended'
      ? POSTER_ENDORSEMENT_DEFAULT_RECOMMENDED_TEXT
      : undefined;
    const noteText = trimmed || defaultText;

    setRecords(prev => prev.map(r =>
      r.id === recordId
        ? {
          ...r,
          posterRecommendation: recommendation,
          posterEndorsed: recommendation === 'recommended',
          updates: [...r.updates, {
            id: `opt-upd-${nowMs}`,
            type: 'poster_endorsement' as const,
            authorId: r.posterId,
            endorsement: recommendation,
            text: noteText,
            createdAt: now,
            createdAtMs: nowMs,
          }],
        }
        : r,
    ));
    void supabase.rpc('endorse_adopter', {
      p_record_id: recordId,
      p_recommendation: recommendation,
      p_text: noteText,
    }).then(({ error }) => {
      if (error) load();
    });
  }, [user, load]);

  const submitAdopterResponse = useCallback((recordId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    const nowMs = Date.now();
    const now = new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setRecords(prev => prev.map(r =>
      r.id === recordId
        ? { ...r, updates: [...r.updates, { id: `opt-upd-${nowMs}`, type: 'adopter_response' as const, authorId: r.adopterId, text: trimmed, createdAt: now, createdAtMs: nowMs }] }
        : r,
    ));
    supabase.rpc('adopter_respond', { p_record_id: recordId, p_text: trimmed })
      .then(({ error }) => { if (error) load(); });
  }, [user, load]);

  const dismissNotification = useCallback((id: string) => {
    setAdoptionNotifications(prev => prev.filter(n => n.id !== id));
    supabase.from('notifications').delete().eq('id', id).then(() => {});
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setAdoptionNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
    supabase.from('notifications').update({ read: true }).eq('id', id).then(() => {});
  }, []);

  return {
    records, setRecords, adoptionNotifications,
    proposeAdoption, confirmAdoption, relistAdoptionPlacement,
    submitAdopterUpdate, submitPosterPlacement,
    submitPosterEndorsement, submitAdopterResponse,
    dismissNotification, markNotificationRead,
    reload: load,
  };
}
