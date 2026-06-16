import type { Post } from '../data/mockData';

export const LOST_FOUND_FEED_FILTER = 'lost-found';

export function isFeedAlertPost(post: Post): boolean {
  return post.label === 'lost' || post.label === 'found';
}

export type FeedPostFocusOptions = {
  filters?: string[];
  post?: Post;
};

/** Feed filters needed so a shared post is visible when we scroll to it. */
export function getFeedFocusFiltersForPost(post: Post): string[] {
  if (isFeedAlertPost(post)) return [LOST_FOUND_FEED_FILTER];
  if (post.label === 'adoption' || post.tag === 'adoption') return [];
  if (post.label === 'rescue' || post.tag === 'rescue') return ['rescue'];
  if (post.label === 'meme') return ['meme'];
  if (post.tag === 'paw-posting' || post.companionAuthorId) return ['paw-posting'];
  return [];
}

function isAdoptionFeedPost(post: Post): boolean {
  return post.label === 'adoption' || post.tag === 'adoption';
}

/** Jump to a feed post from circle chat, DMs, etc. */
export function openFeedSharedPost(params: {
  post: Post;
  requestFeedPostFocus: (postId: string, options?: FeedPostFocusOptions) => void;
  resetToFeed: () => void;
  navigateToFeed: () => void;
  selectSection?: (tab: 'adoption' | 'rescue') => void;
  onBeforeNavigate?: () => void;
}): void {
  if (isAdoptionFeedPost(params.post)) {
    params.onBeforeNavigate?.();
    params.selectSection?.('adoption');
    params.navigateToFeed();
    return;
  }

  params.requestFeedPostFocus(params.post.id, {
    filters: getFeedFocusFiltersForPost(params.post),
    post: params.post,
  });
  params.resetToFeed();
  params.onBeforeNavigate?.();
  params.navigateToFeed();
}

/** @deprecated Use {@link openFeedSharedPost} */
export function openFeedAlertPost(params: Parameters<typeof openFeedSharedPost>[0]): boolean {
  openFeedSharedPost(params);
  return isFeedAlertPost(params.post);
}
