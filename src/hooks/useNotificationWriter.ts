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
    actorName?: string,
    commentPreview?: string,
  ) => {
    if (!user || postAuthorId === user.id) return;
    const name = actorName?.trim() || 'Someone';
    const preview = commentPreview?.trim().slice(0, 120);
    const { error } = await supabase.from('notifications').insert({
      recipient_id: postAuthorId,
      type: 'comment',
      actor_user_id: user.id,
      entity_type: 'post',
      entity_id: postId,
      title: `${name} commented on your post`,
      body: preview ? `"${preview}"` : 'Tap to view the comment.',
      data: {
        post_id: postId,
        comment_id: commentId,
        ...(preview ? { comment_preview: preview } : {}),
      },
    });
    if (error) console.error('[notifyComment]', error.message);
  }, [user]);

  const notifyLike = useCallback(async (
    postId: string,
    postAuthorId: string,
    actorName?: string,
  ) => {
    if (!user || postAuthorId === user.id) return;
    const name = actorName?.trim() || 'Someone';
    const { error } = await supabase.from('notifications').insert({
      recipient_id: postAuthorId,
      type: 'like',
      actor_user_id: user.id,
      entity_type: 'post',
      entity_id: postId,
      title: `${name} liked your post`,
      body: 'Your post is getting some love.',
      data: { post_id: postId },
    });
    if (error) console.error('[notifyLike]', error.message);
  }, [user]);

  return { notifyComment, notifyLike };
}
