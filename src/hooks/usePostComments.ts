import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/** Inserts a comment or reply row and returns the new comment's UUID, or null on error. */
export function usePostComments() {
  const { user } = useAuth();

  const insertComment = useCallback(async (
    postId: string,
    text: string,
    parentId: string | null,
  ): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, parent_id: parentId, author_user_id: user.id, text })
      .select('id')
      .single();
    if (error) return null;
    return (data as { id: string }).id;
  }, [user]);

  return { insertComment };
}
