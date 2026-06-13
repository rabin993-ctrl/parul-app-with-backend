import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Client-side notification row inserts for Wave 2 feed events.
 * Wave 5 replaces these with server-side fan-out via Edge Functions.
 */
export function useNotificationWriter() {
  const { user } = useAuth();

  const notifyComment = useCallback(async (
    postId: string,
    postAuthorId: string,
    commentId: string,
  ) => {
    if (!user || postAuthorId === user.id) return;
    await supabase.from('notifications').insert({
      recipient_id: postAuthorId,
      type: 'comment',
      actor_user_id: user.id,
      entity_type: 'post',
      entity_id: postId,
      data: { post_id: postId, comment_id: commentId },
    });
  }, [user]);

  const notifyLike = useCallback(async (
    postId: string,
    postAuthorId: string,
  ) => {
    if (!user || postAuthorId === user.id) return;
    await supabase.from('notifications').insert({
      recipient_id: postAuthorId,
      type: 'like',
      actor_user_id: user.id,
      entity_type: 'post',
      entity_id: postId,
      data: { post_id: postId },
    });
  }, [user]);

  return { notifyComment, notifyLike };
}
