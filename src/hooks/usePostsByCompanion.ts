import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useFeedPosts } from '../context/FeedPostContext';
import type { Post } from '../data/mockData';
import { FEED_SELECT, postsFromDbRows, type DbPostRow } from './useFeedQuery';

/** Posts authored as this companion (paw postings / gallery / updates) — not owner posts merely tagged "with". */
export function usePostsByCompanion(companionId: string | null | undefined): {
  posts: Post[];
  refresh: () => void;
} {
  const { user } = useAuth();
  const { postMutationsRevision } = useFeedPosts();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!companionId || !user) {
      setPosts([]);
      return;
    }
    const uid = user.id;
    let cancelled = false;

    supabase
      .from('posts')
      .select(FEED_SELECT)
      .eq('companion_author_id', companionId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (cancelled) return;
        if (data) {
          const posts = await postsFromDbRows(data as unknown as DbPostRow[], uid);
          if (!cancelled) setPosts(posts);
        } else setPosts([]);
      });

    return () => { cancelled = true; };
  }, [companionId, user, refreshKey, postMutationsRevision]);

  return { posts, refresh };
}
