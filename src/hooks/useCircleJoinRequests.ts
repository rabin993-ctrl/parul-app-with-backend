import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type CircleJoinRequestProfile = {
  id: string;
  userId: string;
  name: string;
  handle: string;
  tint: string;
  note?: string;
  time: string;
};

export function useCircleJoinRequests(circleId: string | null | undefined) {
  const [requests, setRequests] = useState<CircleJoinRequestProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!circleId) return;
    setLoading(true);
    const { data } = await supabase
      .from('circle_join_requests')
      .select('id, user_id, note, created_at, users(id, name, handle, tint)')
      .eq('circle_id', circleId)
      .eq('state', 'pending')
      .order('created_at', { ascending: true });

    if (data) {
      setRequests(
        data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          name: row.users?.name ?? row.user_id.slice(0, 8),
          handle: row.users?.handle ?? row.user_id.slice(0, 8),
          tint: row.users?.tint ?? '#888888',
          note: row.note ?? undefined,
          time: row.created_at as string,
        }))
      );
    }
    setLoading(false);
  }, [circleId]);

  useEffect(() => {
    load();
  }, [load]);

  return { requests, loading, refresh: load };
}
