import type { Post } from '../data/mockData';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ADOPTION_HUB_SCREEN, type FeedPostDetailParams } from './feedHubNavigation';
import type { CirclesStackParamList } from './CirclesNavigator';
import { resetCirclesStackToHub } from './circlesStackRouting';

import { isAlertPost } from '../utils/postAlertMerge';

export const LOST_FOUND_FEED_FILTER = 'lost-found';

export function isFeedAlertPost(post: Post): boolean {
  return isAlertPost(post);
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

type CirclesNav = NativeStackNavigationProp<CirclesStackParamList>;

function sharedPostDetailParams(post: Post): FeedPostDetailParams {
  return {
    postId: post.id,
    scrollToComments: !isFeedAlertPost(post),
  };
}

/** Open a shared feed post on the Circles stack (back returns to chat / prior screen). */
export function openFeedSharedPost(params: {
  post: Post;
  ensureFeedPost: (post: Post) => void;
  /** Circle chat — push on the active Circles stack. */
  circlesNavigation?: CirclesNav;
  /** DMs / modals — push via tab navigator onto Circles stack. */
  tabNavigation?: NavigationProp<ParamListBase>;
  selectSection?: (tab: 'adoption' | 'rescue') => void;
  onBeforeNavigate?: () => void;
}): void {
  if (isAdoptionFeedPost(params.post)) {
    params.onBeforeNavigate?.();
    params.selectSection?.('adoption');
    const tabNav = params.tabNavigation ?? params.circlesNavigation?.getParent();
    tabNav?.navigate('Feed', { screen: ADOPTION_HUB_SCREEN });
    if (tabNav) resetCirclesStackToHub(tabNav);
    return;
  }

  params.ensureFeedPost(params.post);
  params.onBeforeNavigate?.();

  const detailParams = sharedPostDetailParams(params.post);

  if (params.circlesNavigation) {
    params.circlesNavigation.navigate('FeedPostDetail', detailParams);
    return;
  }

  params.tabNavigation?.navigate('Circles', {
    screen: 'FeedPostDetail',
    params: detailParams,
  });
}

/** @deprecated Use {@link openFeedSharedPost} */
export function openFeedAlertPost(params: Parameters<typeof openFeedSharedPost>[0]): boolean {
  openFeedSharedPost(params);
  return isFeedAlertPost(params.post);
}
