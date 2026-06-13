import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type CircleMemberProfile = {
  userId: string;
  name: string;
  handle: string;
  tint: string;
  role: 'admin' | 'member';
  joinedAt: string;
};

export function useCircleMembers(circleId: string | null | undefined) {
  const [members, setMembers] = useState<CircleMemberProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!circleId) return;
    setLoading(true);
    const { data } = await supabase
      .from('circle_members')
      .select('user_id, role, joined_at, users(id, name, handle, tint)')
      .eq('circle_id', circleId)
      .order('joined_at', { ascending: true });

    if (data) {
      setMembers(
        data.map((row: any) => ({
          userId: row.user_id,
          name: row.users?.name ?? row.user_id.slice(0, 8),
          handle: row.users?.handle ?? row.user_id.slice(0, 8),
          tint: row.users?.tint ?? '#888888',
          role: row.role as 'admin' | 'member',
          joinedAt: row.joined_at as string,
        }))
      );
    }
    setLoading(false);
  }, [circleId]);

  useEffect(() => {
    load();
  }, [load]);

  return { members, loading, refresh: load };
}
