import { CommonActions } from '@react-navigation/native';
import type { AppNotification } from '../data/mockData';
import { getNotificationActions } from './notificationActions';
import { openRescueCaseDetail } from './rescueCaseRouting';
import { supabase } from '../lib/supabase';

export type NotificationRouteData = {
  type?: string;
  entity_type?: string;
  entity_id?: string;
  notification_id?: string;
  post_id?: string;
  circle_id?: string;
  record_id?: string;
  comment_id?: string;
  listing_id?: string;
  action?: string;
};

type NavLike = {
  navigate: (name: string, params?: object) => void;
  getParent?: () => NavLike | undefined;
  goBack?: () => void;
};

type RootNavLike = NavLike & {
  getState?: () => {
    index: number;
    routes: { name: string; key?: string; state?: unknown; params?: object }[];
  };
  dispatch?: (action: unknown) => void;
};

const POST_ACTIVITY_TYPES = new Set(['like', 'comment', 'mention', 'lost', 'found']);

/** Walk up to the root stack navigator (MainTabs + Notifications). */
export function getRootNavigation(navigation: NavLike): NavLike {
  let root: NavLike = navigation;
  while (root.getParent?.()) {
    root = root.getParent()!;
  }
  return root;
}

function isOnNotificationsInbox(root: RootNavLike): boolean {
  const state = root.getState?.();
  return state?.routes?.[state.index]?.name === 'Notifications';
}

function dismissNotificationsModal(nav: NavLike, then: () => void) {
  const root = getRootNavigation(nav) as RootNavLike;
  if (isOnNotificationsInbox(root)) {
    root.goBack?.();
    requestAnimationFrame(() => requestAnimationFrame(then));
    return;
  }
  then();
}

/** Open the root-level notifications inbox (works from any nested screen). */
export function openNotifications(navigation: NavLike) {
  const root = getRootNavigation(navigation) as RootNavLike;
  const state = root.getState?.();

  if (isOnNotificationsInbox(root)) {
    return;
  }

  if (state?.routes.some(r => r.name === 'Notifications') && root.dispatch) {
    const mainTabsRoute = state.routes.find(r => r.name === 'MainTabs') ?? { name: 'MainTabs' };
    root.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [mainTabsRoute],
      } as never),
    );
    requestAnimationFrame(() => root.navigate('Notifications'));
    return;
  }

  root.navigate('Notifications');
}

function resolvePostId(data: NotificationRouteData): string | undefined {
  if (data.post_id) return data.post_id;
  if (data.entity_type === 'post' && data.entity_id) return data.entity_id;
  if (POST_ACTIVITY_TYPES.has(data.type ?? '') && data.entity_id) return data.entity_id;
  return undefined;
}

function resolveCircleDbId(data: NotificationRouteData): string | undefined {
  if (data.circle_id) return data.circle_id;
  if (data.entity_type === 'circle' && data.entity_id) return data.entity_id;
  return undefined;
}

function resolveRecordId(data: NotificationRouteData, type?: string): string | undefined {
  if (data.record_id) return data.record_id;
  if (
    type === 'update_request'
    || type === 'adoption_confirmed'
    || type === 'endorsement_received'
    || type === 'adoption'
  ) {
    return data.entity_id ?? undefined;
  }
  return undefined;
}

async function resolveAdoptionListingId(data: NotificationRouteData): Promise<string | undefined> {
  if (data.listing_id) return data.listing_id;
  const requestId = data.entity_id;
  if (!requestId) return undefined;
  const { data: row } = await supabase
    .from('adoption_requests')
    .select('listing_id')
    .eq('id', requestId)
    .maybeSingle();
  return (row as { listing_id: string } | null)?.listing_id ?? undefined;
}

async function openAdoptionRequestReview(
  nav: NavLike,
  data: NotificationRouteData,
): Promise<boolean> {
  const listingId = await resolveAdoptionListingId(data);
  nav.navigate('MainTabs', {
    screen: 'Circles',
    params: {
      screen: 'Hub',
      params: {
        filter: 'adoption',
        ...(listingId ? { reviewListingId: listingId } : {}),
      },
    },
  });
  return true;
}

async function openFeedPost(
  nav: NavLike,
  postId: string,
  data: NotificationRouteData,
): Promise<boolean> {
  const actions = getNotificationActions();
  const type = data.type;
  const post = await actions.loadFeedPost?.(postId);
  if (post) {
    actions.ensureFeedPost?.(post);
  }

  nav.navigate('MainTabs', {
    screen: 'Feed',
    params: {
      screen: 'FeedPostDetail',
      params: {
        postId,
        scrollToComments: type === 'comment' || type === 'mention',
      },
    },
  });
  return true;
}

async function openCircleChat(nav: NavLike, circleDbId: string): Promise<boolean> {
  const actions = getNotificationActions();
  const slug = await actions.resolveCircleSlugByDbId?.(circleDbId);
  if (!slug) {
    nav.navigate('MainTabs', { screen: 'Circles' });
    return true;
  }
  nav.navigate('MainTabs', {
    screen: 'Circles',
    params: {
      screen: 'CircleChat',
      params: { circleId: slug, returnTo: 'Hub' },
    },
  });
  return true;
}

function navigateToRescueCaseDetail(nav: NavLike, caseId: string, data: NotificationRouteData) {
  openRescueCaseDetail(nav, caseId, {
    openHelpOffers: data.type === 'rescue_help' && data.action !== 'accepted',
  });
}

/** Route a push/banner payload to the most relevant screen; inbox is the fallback. */
export async function routeNotificationTarget(
  nav: NavLike,
  data: NotificationRouteData,
  { fallbackToInbox = true }: { fallbackToInbox?: boolean } = {},
): Promise<boolean> {
  const entityType = data.entity_type;
  const entityId = data.entity_id;
  const type = data.type;
  const postId = resolvePostId(data);
  const circleDbId = resolveCircleDbId(data);
  const recordId = resolveRecordId(data, type);

  if (postId && (entityType === 'post' || POST_ACTIVITY_TYPES.has(type ?? ''))) {
    return openFeedPost(nav, postId, data);
  }

  if (circleDbId && (entityType === 'circle' || type === 'circle_accept')) {
    return openCircleChat(nav, circleDbId);
  }

  switch (entityType) {
    case 'circle_join_request':
    case 'circle_invite':
      if (fallbackToInbox) openNotifications(nav);
      return true;

    case 'adoption_record':
      nav.navigate('MainTabs', {
        screen: 'Circles',
        params: {
          screen: 'Hub',
          params: {
            filter: 'adoption',
            ...(recordId ? { recordId } : {}),
          },
        },
      });
      return true;

    case 'post':
      nav.navigate('MainTabs', { screen: 'Feed', params: { screen: 'FeedHome' } });
      return true;

    case 'rescue_case':
      if (entityId) {
        navigateToRescueCaseDetail(nav, entityId, data);
      } else {
        nav.navigate('MainTabs', { screen: 'Feed', params: { screen: 'FeedHome' } });
      }
      return true;

    case 'consult':
      if (entityId) {
        nav.navigate('MainTabs', {
          screen: 'Vet',
          params: { screen: 'Status', params: { consultId: entityId } },
        });
      }
      return true;

    default:
      break;
  }

  switch (type) {
    case 'rescue_help':
      if (entityId) {
        navigateToRescueCaseDetail(nav, entityId, data);
        return true;
      }
      nav.navigate('MainTabs', { screen: 'Feed', params: { screen: 'FeedHome' } });
      return true;

    case 'circle_request':
    case 'circle_invite':
      if (fallbackToInbox) openNotifications(nav);
      return true;

    case 'circle_accept':
      if (circleDbId) return openCircleChat(nav, circleDbId);
      nav.navigate('MainTabs', { screen: 'Circles' });
      return true;

    case 'update_request':
    case 'adoption_confirmed':
    case 'endorsement_received':
      if (recordId) {
        nav.navigate('MainTabs', {
          screen: 'Profile',
          params: { screen: 'AdoptedDetail', params: { recordId } },
        });
        return true;
      }
      break;

    case 'request_received':
      return openAdoptionRequestReview(nav, data);

    case 'approved':
      nav.navigate('MainTabs', { screen: 'Feed', params: { screen: 'AdoptionHub' } });
      return true;

    case 'rejected':
      nav.navigate('MainTabs', { screen: 'Feed', params: { screen: 'AdoptionHub' } });
      return true;

    case 'adopted':
      nav.navigate('MainTabs', { screen: 'Feed', params: { screen: 'AdoptionHub' } });
      return true;

    case 'adoption':
      nav.navigate('MainTabs', {
        screen: 'Circles',
        params: {
          screen: 'Hub',
          params: {
            filter: 'adoption',
            ...(recordId ? { recordId } : {}),
          },
        },
      });
      return true;

    default:
      break;
  }

  if (fallbackToInbox) {
    openNotifications(nav);
    return true;
  }
  return false;
}

function notifTypeToEntityType(type: string): string | undefined {
  switch (type) {
    case 'like':
    case 'comment':
    case 'mention':
    case 'lost':
    case 'found':
      return 'post';
    case 'rescue_help':
      return 'rescue_case';
    case 'circle_accept':
      return 'circle';
    case 'circle_request':
      return 'circle_join_request';
    case 'circle_invite':
      return 'circle_invite';
    case 'update_request':
    case 'adoption_confirmed':
    case 'endorsement_received':
      return 'adoption_record';
    default:
      return undefined;
  }
}

function buildRouteDataFromAppNotif(notif: AppNotification): NotificationRouteData {
  const entityId = notif.recordId
    ?? (notif.type === 'circle_request' ? (notif.requestId ?? notif.entityId) : undefined)
    ?? (notif.type === 'circle_invite' ? (notif.inviteId ?? notif.entityId) : undefined)
    ?? notif.entityId;

  return {
    type: notif.type,
    entity_type: notifTypeToEntityType(notif.type),
    entity_id: entityId,
    post_id: notif.postId
      ?? (POST_ACTIVITY_TYPES.has(notif.type) ? (notif.entityId ?? entityId) : undefined),
    circle_id: notif.circleId ?? (notif.type === 'circle_accept' ? notif.entityId : undefined),
    record_id: notif.recordId,
    comment_id: notif.commentId,
    listing_id: notif.listingId,
    action: notif.rescueAction,
  };
}

/** Route from an in-app notification row tap (marks read first). */
export function routeAppNotificationPress(
  nav: NavLike,
  notif: AppNotification,
  markRead: (id: string) => void,
  extraIds: string[] = [],
): void {
  if (notif.unread) {
    markRead(notif.id);
    extraIds.forEach(markRead);
  }

  if (notif.type === 'circle_request' || notif.type === 'circle_invite') return;

  dismissNotificationsModal(nav, () => {
    void routeNotificationTarget(
      getRootNavigation(nav),
      buildRouteDataFromAppNotif(notif),
      { fallbackToInbox: false },
    );
  });
}

/** Navigate away from the notifications inbox (e.g. adoption rows). */
export function navigateFromNotificationsInbox(
  nav: NavLike,
  navigateTo: (root: NavLike) => void,
) {
  dismissNotificationsModal(nav, () => {
    navigateTo(getRootNavigation(nav));
  });
}
