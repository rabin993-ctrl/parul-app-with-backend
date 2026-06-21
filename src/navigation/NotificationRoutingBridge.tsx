import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFeedPosts } from '../context/FeedPostContext';
import { useHomeHub } from '../context/HomeHubContext';
import { usePawCircles } from '../context/PawCircleContext';
import { selectFeedRows, postsFromDbRows, type DbPostRow } from '../hooks/useFeedQuery';
import { supabase } from '../lib/supabase';
import { useAdoptionFeed } from '../context/AdoptionFeedContext';
import {
  clearNotificationActions,
  registerNotificationActions,
} from './notificationActions';

export function NotificationRoutingBridge() {
  const { user } = useAuth();
  const { requestFeedPostFocus, ensureFeedPost } = useFeedPosts();
  const { resetToFeed, selectSection } = useHomeHub();
  const { queueAdoptionReviewPopup } = useAdoptionFeed();
  const { getDbId, createdCircles, joinedCircles } = usePawCircles();

  useEffect(() => {
    registerNotificationActions({
      requestFeedPostFocus,
      ensureFeedPost,
      resetToFeed,
      selectSection,
      queueAdoptionReviewPopup,
      resolveCircleSlugByDbId: async (dbId: string) => {
        for (const circle of [...createdCircles, ...joinedCircles]) {
          if (getDbId(circle.id) === dbId) return circle.id;
        }
        const { data } = await supabase
          .from('circles')
          .select('slug')
          .eq('id', dbId)
          .maybeSingle();
        const slug = (data as { slug: string | null } | null)?.slug;
        return slug ?? null;
      },
      loadFeedPost: async (postId: string) => {
        const { data } = await selectFeedRows(select =>
          supabase.from('posts').select(select).eq('id', postId).maybeSingle(),
        );
        if (!data) return null;
        const [post] = await postsFromDbRows([data as unknown as DbPostRow], user?.id ?? '');
        return post ?? null;
      },
    });
    return () => { clearNotificationActions(); };
  }, [
    createdCircles,
    getDbId,
    joinedCircles,
    requestFeedPostFocus,
    ensureFeedPost,
    resetToFeed,
    selectSection,
    queueAdoptionReviewPopup,
    user?.id,
  ]);

  return null;
}
