import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Post } from '../data/mockData';
import { rowToPost } from './useFeedQuery';

export function usePostsByCompanion(companionId: string | null | undefined): Post[] {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!companionId || !user) return;
    const uid = user.id;

    // Get post IDs tagged to this companion, then fetch full post rows.
    supabase
      .from('post_companions')
      .select('post_id')
      .eq('companion_id', companionId)
      .then(async ({ data: refs }) => {
        if (!refs || refs.length === 0) return;
        const ids = refs.map((r: any) => r.post_id as string);
        const { data } = await supabase
          .from('posts')
          .select([
            'id', 'author_user_id', 'companion_author_id', 'text', 'tag', 'label',
            'is_circle', 'circle_id', 'location', 'adoption_status', 'created_at',
            'author:users!author_user_id (id, name, handle, tint)',
            'post_media (idx)',
            'post_companions (companion_id)',
            'post_alerts (kind, area, last_seen, found_at, looks_like, phone)',
            'post_reactions (user_id, kind)',
            'post_saves (user_id)',
            'post_forwards (id)',
          ].join(','))
          .in('id', ids)
          .order('created_at', { ascending: false });
        if (data) setPosts((data as any[]).map(row => rowToPost(row, uid)));
      });
  }, [companionId, user]);

  return posts;
}
