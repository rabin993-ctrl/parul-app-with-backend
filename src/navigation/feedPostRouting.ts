import type { Post } from '../data/mockData';

export function isFeedAlertPost(post: Post): boolean {
  return post.label === 'lost' || post.label === 'found';
}

/** Jump to the lost/found card for this post on the Feed tab. Returns true when handled. */
export function openFeedAlertPost(params: {
  post: Post;
  requestFeedPostFocus: (postId: string) => void;
  resetToFeed: () => void;
  navigateToFeed: () => void;
  onBeforeNavigate?: () => void;
}): boolean {
  if (!isFeedAlertPost(params.post)) return false;
  params.requestFeedPostFocus(params.post.id);
  params.resetToFeed();
  params.onBeforeNavigate?.();
  params.navigateToFeed();
  return true;
}
