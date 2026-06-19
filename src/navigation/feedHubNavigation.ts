import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AdoptionStackParamList } from './AdoptionNavigator';
import type { RescueStackParamList } from './RescueNavigator';

export const FEED_HOME_SCREEN = 'FeedHome' as const;
export const ADOPTION_HUB_SCREEN = 'AdoptionHub' as const;
export const RESCUE_HUB_SCREEN = 'RescueHub' as const;
export const FEED_POST_DETAIL_SCREEN = 'FeedPostDetail' as const;

export type FeedPostDetailParams = {
  postId: string;
  scrollToComments?: boolean;
};

export type FeedStackParamList = {
  FeedHome: undefined;
  Search: undefined;
  FeedPostDetail: FeedPostDetailParams;
  AdoptionHub: NavigatorScreenParams<AdoptionStackParamList> | undefined;
  RescueHub: NavigatorScreenParams<RescueStackParamList> | undefined;
};

export function feedHubScreenForSection(tab: 'adoption' | 'rescue') {
  return tab === 'adoption' ? ADOPTION_HUB_SCREEN : RESCUE_HUB_SCREEN;
}

export function feedTabParams(screen: keyof FeedStackParamList, params?: object) {
  return { screen, params };
}

export function navigateToFeedTab(
  navigation: { navigate: (name: string, params?: object) => void },
  screen: keyof FeedStackParamList = FEED_HOME_SCREEN,
) {
  navigation.navigate('Feed', { screen });
}
