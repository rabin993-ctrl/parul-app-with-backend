import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Post } from '../data/mockData';
import { FEED_SELECT, rowToPost, type DbPostRow } from './useFeedQuery';

/** Posts authored as this companion (paw postings / gallery / updates) — not owner posts merely tagged "with". */
export function usePostsByCompanion(companionId: string | null | undefined): Post[] {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!companionId || !user) return;
    const uid = user.id;

    supabase
      .from('posts')
      .select(FEED_SELECT)
      .eq('companion_author_id', companionId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setPosts((data as DbPostRow[]).map(row => rowToPost(row, uid)));
        else setPosts([]);
      });
  }, [companionId, user]);

  return posts;
}
