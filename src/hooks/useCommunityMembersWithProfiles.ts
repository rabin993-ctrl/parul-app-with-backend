import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export type CommunityMemberProfile = {
  id: string;
  name: string;
  handle: string;
  tint: string | null;
  role: 'admin' | 'member';
};

export function useCommunityMembersWithProfiles(communityId: string) {
  const { user } = useAuth();
  const [members, setMembers] = useState<CommunityMemberProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!communityId) return;
    setLoading(true);
    const { data } = await supabase
      .from('community_members')
      .select('role, user:users!community_members_user_id_fkey(id, name, handle, tint)')
      .eq('community_id', communityId);

    const mapped: CommunityMemberProfile[] = (data ?? []).map((row: any) => ({
      id: row.user.id,
      name: row.user.name,
      handle: row.user.handle,
      tint: row.user.tint ?? null,
      role: row.role as 'admin' | 'member',
    }));
    setMembers(mapped);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  const isSelf = useCallback(
    (memberId: string) => memberId === user?.id,
    [user],
  );

  return { members, loading, isSelf, reload: load };
}
