import { CommonActions } from '@react-navigation/native';
import type { AppNotification } from '../data/mockData';

export type NotificationRouteData = {
  type?: string;
  entity_type?: string;
  entity_id?: string;
  notification_id?: string;
};

type NavLike = {
  navigate: (name: string, params?: object) => void;
  getParent?: () => NavLike | undefined;
};

type RootNavLike = NavLike & {
  getState?: () => {
    index: number;
    routes: { name: string; key?: string; state?: unknown; params?: object }[];
  };
  dispatch?: (action: unknown) => void;
};

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

/** Open the root-level notifications inbox (works from any nested screen). */
export function openNotifications(navigation: NavLike) {
  const root = getRootNavigation(navigation) as RootNavLike;
  const state = root.getState?.();

  if (isOnNotificationsInbox(root)) {
    return;
  }

  // Drop a stale inbox route left in the stack, then open fresh.
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

/** Route a push/banner payload to the most relevant screen; inbox is the fallback. */
export function routeNotificationTarget(
  nav: NavLike,
  data: NotificationRouteData,
  { fallbackToInbox = true }: { fallbackToInbox?: boolean } = {},
): boolean {
  const entityType = data.entity_type;
  const entityId = data.entity_id;
  const type = data.type;

  switch (entityType) {
    case 'circle':
      nav.navigate('MainTabs', { screen: 'Circles' });
      return true;

    case 'circle_join_request':
      if (fallbackToInbox) openNotifications(nav);
      return true;

    case 'adoption_record':
      nav.navigate('MainTabs', {
        screen: 'Circles',
        params: {
          screen: 'Hub',
          params: {
            filter: 'adoption',
            ...(entityId ? { recordId: entityId } : {}),
          },
        },
      });
      return true;

    case 'post':
      nav.navigate('MainTabs', { screen: 'Feed' });
      return true;

    case 'rescue_case':
      if (entityId) {
        nav.navigate('MainTabs', {
          screen: 'Profile',
          params: { screen: 'RescueDetail', params: { caseId: entityId } },
        });
      } else {
        nav.navigate('MainTabs', { screen: 'Feed' });
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
    case 'lost':
    case 'found':
    case 'like':
    case 'comment':
    case 'mention':
    case 'rescue_help':
      if (type === 'rescue_help' && entityId) {
        nav.navigate('MainTabs', {
          screen: 'Profile',
          params: { screen: 'RescueDetail', params: { caseId: entityId } },
        });
        return true;
      }
      nav.navigate('MainTabs', { screen: 'Feed' });
      return true;

    case 'circle_request':
      if (fallbackToInbox) openNotifications(nav);
      return true;

    case 'circle_accept':
      nav.navigate('MainTabs', { screen: 'Circles' });
      return true;

    case 'update_request':
    case 'adoption_confirmed':
    case 'endorsement_received':
    case 'adoption':
      nav.navigate('MainTabs', {
        screen: 'Circles',
        params: {
          screen: 'Hub',
          params: {
            filter: 'adoption',
            ...(entityId ? { recordId: entityId } : {}),
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

  if (notif.type === 'circle_request') return;

  routeNotificationTarget(getRootNavigation(nav), {
    type: notif.type,
    entity_type: notifTypeToEntityType(notif.type),
    entity_id: notif.entityId,
  }, { fallbackToInbox: false });
}

/** Navigate away from the notifications inbox (e.g. adoption rows). */
export function navigateFromNotificationsInbox(
  nav: NavLike,
  navigateTo: (root: NavLike) => void,
) {
  navigateTo(getRootNavigation(nav));
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
    case 'circle_request':
      return type === 'circle_request' ? 'circle_join_request' : 'circle';
    default:
      return undefined;
  }
}
