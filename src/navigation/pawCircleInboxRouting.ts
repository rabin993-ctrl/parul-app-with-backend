import type { ChatSegment } from '../components/adoption/AdoptionChatsList';

export type PawCircleInboxFilter = 'all' | 'unread' | 'adoption' | 'rescue' | 'circles' | 'direct';

export type PawCircleHubParams = {
  filter?: PawCircleInboxFilter;
  threadId?: string;
  recordId?: string;
  adoptionSegment?: ChatSegment;
  /** Open the adoption request review popup for this listing (from notifications). */
  reviewListingId?: string;
};

type NavLike = {
  navigate: (name: string, params?: object) => void;
  getParent?: () => NavLike | undefined;
};

/** Open the Paw Circle unified inbox (optionally focused on a thread or filter). */
export function navigateToPawCircleInbox(
  navigation: NavLike,
  params?: PawCircleHubParams,
) {
  let nav: NavLike = navigation;
  while (nav.getParent?.()) {
    nav = nav.getParent()!;
  }
  nav.navigate('MainTabs', {
    screen: 'Circles',
    params: {
      screen: 'Hub',
      params: params ?? {},
    },
  });
}
