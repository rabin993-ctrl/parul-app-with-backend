import type { NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import type { AppNotification } from '../data/mockData';

export type NotificationRouteData = {
  type?: string;
  entity_type?: string;
  entity_id?: string;
  notification_id?: string;
};

type NavLike = {
  navigate: (name: string, params?: object) => void;
};

/** Open the root-level notifications inbox (works from any nested screen). */
export function openNotifications(navigation: { navigate: NavLike['navigate'] }) {
  navigation.navigate('Notifications');
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
      if (entityId) {
        nav.navigate('MainTabs', {
          screen: 'Profile',
          params: { screen: 'AdoptedDetail', params: { recordId: entityId } },
        });
      } else {
        nav.navigate('MainTabs', { screen: 'Profile' });
      }
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
      if (entityId) {
        nav.navigate('MainTabs', {
          screen: 'Profile',
          params: { screen: 'AdoptedDetail', params: { recordId: entityId } },
        });
        return true;
      }
      break;

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

  routeNotificationTarget(nav, {
    type: notif.type,
    entity_type: notifTypeToEntityType(notif.type),
    entity_id: notif.entityId,
  }, { fallbackToInbox: false });
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
