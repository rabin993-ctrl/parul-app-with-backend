import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type CommunityEvent = {
  id: string;
  communityId: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  tint: string | null;
  createdBy: string;
};

function rowToEvent(row: any): CommunityEvent {
  return {
    id: row.id,
    communityId: row.community_id,
    title: row.title,
    description: row.description ?? null,
    location: row.location ?? null,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? null,
    tint: row.tint ?? null,
    createdBy: row.created_by,
  };
}

export function useCommunityEvents(communityId: string | null | undefined) {
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!communityId) { setEvents([]); return; }
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('community_events')
      .select('id, community_id, created_by, title, description, location, starts_at, ends_at, tint')
      .eq('community_id', communityId)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(20);
    if (data) setEvents((data as any[]).map(rowToEvent));
    setLoading(false);
  }, [communityId]);

  useEffect(() => { load(); }, [load]);

  return { events, loading, refresh: load };
}
