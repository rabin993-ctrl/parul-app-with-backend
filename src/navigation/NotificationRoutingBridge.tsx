import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFeedPosts } from '../context/FeedPostContext';
import { useHomeHub } from '../context/HomeHubContext';
import { usePawCircles } from '../context/PawCircleContext';
import { fetchFeedPostById } from '../hooks/useFeedQuery';
import { supabase } from '../lib/supabase';
import {
  clearNotificationActions,
  registerNotificationActions,
} from './notificationActions';

export function NotificationRoutingBridge() {
  const { user } = useAuth();
  const { requestFeedPostFocus } = useFeedPosts();
  const { resetToFeed, selectSection } = useHomeHub();
  const { getDbId, createdCircles, joinedCircles } = usePawCircles();

  useEffect(() => {
    registerNotificationActions({
      requestFeedPostFocus,
      resetToFeed,
      selectSection,
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
        if (!user?.id) return null;
        return fetchFeedPostById(postId, user.id);
      },
    });
    return () => { clearNotificationActions(); };
  }, [
    createdCircles,
    getDbId,
    joinedCircles,
    requestFeedPostFocus,
    resetToFeed,
    selectSection,
    user?.id,
  ]);

  return null;
}
