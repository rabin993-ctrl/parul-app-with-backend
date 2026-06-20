import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { usePawCircles } from '../context/PawCircleContext';
import type { PawCircle } from '../data/pawCircles';
import type { CircleMemberSearchResult } from '../utils/destinationSearch';

type CrossMemberRow = {
  circle_id: string;
  user_id: string;
  circles: { name: string } | null;
  users: {
    name: string;
    handle: string | null;
    tint: string | null;
  } | null;
};

/** Cross-circle member index for destination search (Forward sheet, Mention picker). */
export function useAllCircleMembers(circles: PawCircle[], enabled: boolean) {
  const { user } = useAuth();
  const { getDbId } = usePawCircles();
  const [members, setMembers] = useState<CircleMemberSearchResult[]>([]);

  useEffect(() => {
    if (!enabled) {
      setMembers([]);
      return;
    }

    const dbIds = circles
      .map(c => getDbId(c.id))
      .filter((id): id is string => Boolean(id));
    if (dbIds.length === 0) {
      setMembers([]);
      return;
    }

    let cancelled = false;
    const circleNameByDbId = new Map(
      circles
        .map(c => {
          const id = getDbId(c.id);
          return id ? [id, c.name] as const : null;
        })
        .filter((entry): entry is readonly [string, string] => entry !== null),
    );

    (supabase as any)
      .from('circle_members')
      .select('circle_id, user_id, circles(name), users(name, handle, tint)')
      .in('circle_id', dbIds)
      .then(({ data }: { data: CrossMemberRow[] | null }) => {
        if (cancelled || !data) return;
        setMembers(
          data
            .filter(row => row.user_id !== user?.id)
            .map(row => ({
              userId: row.user_id,
              circleId: row.circle_id,
              circleName: row.circles?.name ?? circleNameByDbId.get(row.circle_id) ?? 'Circle',
              name: row.users?.name,
              handle: row.users?.handle ?? undefined,
              tint: row.users?.tint ?? undefined,
            })),
        );
      });

    return () => { cancelled = true; };
  }, [enabled, circles, getDbId, user?.id]);

  return members;
}
