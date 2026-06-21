import type { Post } from '../data/mockData';
import type { HomeSectionTab } from '../components/ui/HomeHubDropdown';

export type NotificationActionHandlers = {
  requestFeedPostFocus?: (
    postId: string,
    options?: { filters?: string[]; post?: Post; openComments?: boolean },
  ) => void;
  ensureFeedPost?: (post: Post) => void;
  queueAdoptionReviewPopup?: (listingId: string) => void;
  resetToFeed?: () => void;
  selectSection?: (tab: HomeSectionTab) => void;
  resolveCircleSlugByDbId?: (dbId: string) => Promise<string | null>;
  loadFeedPost?: (postId: string) => Promise<Post | null>;
};

let handlers: NotificationActionHandlers = {};

export function registerNotificationActions(next: NotificationActionHandlers) {
  handlers = { ...handlers, ...next };
}

export function clearNotificationActions() {
  handlers = {};
}

export function getNotificationActions(): NotificationActionHandlers {
  return handlers;
}
