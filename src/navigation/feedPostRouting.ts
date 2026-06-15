import type { Post } from '../data/mockData';

export const LOST_FOUND_FEED_FILTER = 'lost-found';

export function isFeedAlertPost(post: Post): boolean {
  return post.label === 'lost' || post.label === 'found';
}

export type FeedPostFocusOptions = {
  filters?: string[];
  post?: Post;
};

/** Jump to the lost/found card for this post on the Feed tab. Returns true when handled. */
export function openFeedAlertPost(params: {
  post: Post;
  requestFeedPostFocus: (postId: string, options?: FeedPostFocusOptions) => void;
  resetToFeed: () => void;
  navigateToFeed: () => void;
  onBeforeNavigate?: () => void;
}): boolean {
  if (!isFeedAlertPost(params.post)) return false;
  params.requestFeedPostFocus(params.post.id, {
    filters: [LOST_FOUND_FEED_FILTER],
    post: params.post,
  });
  params.resetToFeed();
  params.onBeforeNavigate?.();
  params.navigateToFeed();
  return true;
}
