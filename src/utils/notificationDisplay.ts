import type { AppNotification } from '../data/mockData';
import type { ActorUser } from '../hooks/useNotifications';

export const GROUPABLE_TYPES = ['like', 'comment', 'mention'] as const;

export const POSTS_FILTER_TYPES = [
  'like', 'comment', 'mention', 'lost', 'found',
] as const;

export const CIRCLES_FILTER_TYPES = ['circle_request', 'circle_accept', 'circle_invite'] as const;

export const ADOPTION_FILTER_TYPES = [
  'request_received', 'approved', 'rejected', 'adopted',
  'update_request', 'adoption_confirmed', 'endorsement_received',
] as const;

export const RESCUE_FILTER_TYPES = ['rescue_help'] as const;

export const INBOX_TYPES = [
  ...POSTS_FILTER_TYPES,
  ...CIRCLES_FILTER_TYPES,
  ...ADOPTION_FILTER_TYPES,
  ...RESCUE_FILTER_TYPES,
] as const;

export type NotifFilter = 'all' | 'unread' | 'circles' | 'posts' | 'adoption' | 'rescue';

export type NotifTone = { icon: string; color: string };

export type GroupedAppNotif = {
  primary: AppNotification;
  extras: AppNotification[];
  actors: ActorUser[];
};

export type ResolvedNotifDisplay = {
  bold: string | null;
  body: string;
  subtitle?: string;
  avatarUser: ActorUser | null;
  useActorStack: boolean;
  showTypeBadge: boolean;
  iconOnly: boolean;
  showCircleActions: boolean;
};

export function getToneForType(type: string): NotifTone {
  switch (type) {
    case 'like': return { icon: 'heart', color: '#e85d7d' };
    case 'comment': return { icon: 'comment', color: '#6b7bef' };
    case 'circle_request': return { icon: 'circles', color: '#14A697' };
    case 'circle_invite': return { icon: 'circles', color: '#14A697' };
    case 'circle_accept': return { icon: 'check', color: '#14A697' };
    case 'request_received': return { icon: 'adoption', color: '#F2972E' };
    case 'approved': return { icon: 'check', color: '#3A9B72' };
    case 'rejected': return { icon: 'close', color: '#9A8B7A' };
    case 'adopted': return { icon: 'heart', color: '#7C5CBF' };
    case 'update_request': return { icon: 'camera', color: '#C98E2A' };
    case 'adoption_confirmed': return { icon: 'check', color: '#3A9B72' };
    case 'endorsement_received': return { icon: 'heart', color: '#7C5CBF' };
    case 'mention': return { icon: 'at', color: '#9c59e8' };
    case 'lost': return { icon: 'alert', color: '#ef4444' };
    case 'found': return { icon: 'check', color: '#2FA46A' };
    case 'rescue_help': return { icon: 'heart', color: '#14A697' };
    default: return { icon: 'bell', color: '#7A6A56' };
  }
}

export function matchesNotifFilter(
  type: string,
  filter: NotifFilter,
  unread: boolean,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'unread') return unread;
  if (filter === 'posts') return (POSTS_FILTER_TYPES as readonly string[]).includes(type);
  if (filter === 'circles') return (CIRCLES_FILTER_TYPES as readonly string[]).includes(type);
  if (filter === 'adoption') return (ADOPTION_FILTER_TYPES as readonly string[]).includes(type);
  if (filter === 'rescue') return (RESCUE_FILTER_TYPES as readonly string[]).includes(type);
  return true;
}

function circleName(
  notif: AppNotification,
  getCircleName: (circleDbId: string | undefined) => string | undefined,
): string {
  return resolveCircleName(notif, getCircleName) ?? 'your circle';
}

export function resolveCircleName(
  notif: AppNotification,
  getCircleName: (circleDbId: string | undefined) => string | undefined,
): string | undefined {
  return notif.circleName ?? getCircleName(notif.circleId ?? notif.entityId);
}

function actorName(notif: AppNotification, actor: ActorUser | null): string {
  return actor?.name ?? notif.userName ?? 'Someone';
}

export function groupedBody(group: GroupedAppNotif): string {
  const { actors, extras, primary } = group;
  if (extras.length === 0) return primary.body;
  const firstName = actors[0]?.name ?? primary.userName ?? 'Someone';
  const rest = extras.length;
  const action = primary.type === 'like'
    ? 'liked your post'
    : primary.type === 'comment'
      ? 'commented on your post'
      : primary.type === 'mention'
        ? 'mentioned you'
        : primary.body;
  return rest === 1
    ? `${firstName} and 1 other ${action}`
    : `${firstName} and ${rest} others ${action}`;
}

export function groupAppNotifs(
  notifs: AppNotification[],
  actorsByUid: Record<string, ActorUser>,
): GroupedAppNotif[] {
  const groups = new Map<string, AppNotification[]>();
  const order: string[] = [];

  for (const n of notifs) {
    const key = (GROUPABLE_TYPES as readonly string[]).includes(n.type) && n.entityId
      ? `${n.type}:${n.entityId}`
      : n.id;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(n);
  }

  return order.map(key => {
    const members = groups.get(key)!;
    const sorted = [...members].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const [primary, ...extras] = sorted;
    const actors = sorted
      .map(m => actorsByUid[m.userId])
      .filter((a): a is ActorUser => !!a);
    return { primary, extras, actors };
  });
}

/** Sort notification groups newest-first by latest activity in each group. */
export function sortGroupedNotifs(groups: GroupedAppNotif[]): GroupedAppNotif[] {
  return [...groups].sort((a, b) => {
    const aTime = Math.max(
      new Date(a.primary.createdAt).getTime(),
      ...a.extras.map(e => new Date(e.createdAt).getTime()),
    );
    const bTime = Math.max(
      new Date(b.primary.createdAt).getTime(),
      ...b.extras.map(e => new Date(e.createdAt).getTime()),
    );
    return bTime - aTime;
  });
}

export function resolveNotifDisplay(
  group: GroupedAppNotif,
  actorsByUid: Record<string, ActorUser>,
  getCircleName: (circleDbId: string | undefined) => string | undefined,
  circleHandled: boolean,
): ResolvedNotifDisplay {
  const { primary, extras, actors } = group;
  const isGrouped = extras.length > 0;
  const actor = actors[0] ?? (primary.userId ? actorsByUid[primary.userId] : null) ?? null;
  const name = actorName(primary, actor);

  if (isGrouped) {
    return {
      bold: null,
      body: groupedBody(group),
      avatarUser: null,
      useActorStack: actors.length >= 2,
      showTypeBadge: false,
      iconOnly: false,
      showCircleActions: false,
    };
  }

  switch (primary.type) {
    case 'like':
      return {
        bold: name,
        body: 'liked your post',
        avatarUser: actor,
        useActorStack: false,
        showTypeBadge: true,
        iconOnly: false,
        showCircleActions: false,
      };

    case 'comment': {
      const preview = primary.commentPreview
        ?? (primary.body.trim().startsWith('"') ? primary.body.trim() : undefined);
      return {
        bold: name,
        body: 'commented on your post',
        subtitle: preview,
        avatarUser: actor,
        useActorStack: false,
        showTypeBadge: true,
        iconOnly: false,
        showCircleActions: false,
      };
    }

    case 'mention':
      return {
        bold: name,
        body: 'mentioned you',
        subtitle: primary.body.trim() || undefined,
        avatarUser: actor,
        useActorStack: false,
        showTypeBadge: true,
        iconOnly: false,
        showCircleActions: false,
      };

    case 'circle_request': {
      const cName = circleName(primary, getCircleName);
      return {
        bold: name,
        body: `wants to join ${cName}`,
        subtitle: primary.body.trim().startsWith('Invited by') ? primary.body.trim() : undefined,
        avatarUser: actor,
        useActorStack: false,
        showTypeBadge: true,
        iconOnly: false,
        showCircleActions: !circleHandled,
      };
    }

    case 'circle_invite': {
      const cName = circleName(primary, getCircleName);
      const inviteBody = primary.body.trim().includes('admin approval')
        ? primary.body.trim()
        : undefined;
      return {
        bold: name,
        body: `invited you to ${cName}`,
        subtitle: inviteBody,
        avatarUser: actor,
        useActorStack: false,
        showTypeBadge: true,
        iconOnly: false,
        showCircleActions: !circleHandled,
      };
    }

    case 'circle_accept': {
      const cName = circleName(primary, getCircleName);
      const acceptBody = primary.body.trim()
        || (cName !== 'your circle' ? `You're now a member of ${cName}.` : 'Your circle join request was accepted.');
      return {
        bold: null,
        body: acceptBody,
        avatarUser: null,
        useActorStack: false,
        showTypeBadge: false,
        iconOnly: true,
        showCircleActions: false,
      };
    }

    case 'lost':
    case 'found': {
      const alertTitle = primary.type === 'found'
        ? 'Found pet alert nearby'
        : 'Lost pet alert nearby';
      return {
        bold: alertTitle,
        body: primary.body.trim() || primary.area || '',
        avatarUser: actor,
        useActorStack: false,
        showTypeBadge: true,
        iconOnly: false,
        showCircleActions: false,
      };
    }

    case 'rescue_help':
      return {
        bold: name,
        body: primary.rescueAction === 'accepted'
          ? 'accepted your help on a rescue case'
          : 'offered help on your rescue',
        subtitle: primary.body.trim() || undefined,
        avatarUser: actor,
        useActorStack: false,
        showTypeBadge: true,
        iconOnly: false,
        showCircleActions: false,
      };

    case 'request_received': {
      const pet = primary.petName?.trim();
      return {
        bold: name,
        body: pet ? `requested to adopt ${pet}` : 'sent an adoption request',
        subtitle: primary.body.trim() || undefined,
        avatarUser: actor,
        useActorStack: false,
        showTypeBadge: true,
        iconOnly: false,
        showCircleActions: false,
      };
    }

    case 'approved':
      return {
        bold: null,
        body: primary.text.trim()
          || (primary.petName ? `Your request for ${primary.petName} was approved` : 'Your adoption request was approved'),
        subtitle: primary.body.trim() || undefined,
        avatarUser: actor,
        useActorStack: false,
        showTypeBadge: false,
        iconOnly: true,
        showCircleActions: false,
      };

    case 'rejected':
      return {
        bold: null,
        body: primary.text.trim() || 'Update on your adoption request',
        subtitle: primary.body.trim() || undefined,
        avatarUser: null,
        useActorStack: false,
        showTypeBadge: false,
        iconOnly: true,
        showCircleActions: false,
      };

    case 'adopted':
      return {
        bold: null,
        body: primary.text.trim()
          || (primary.petName ? `${primary.petName} found a home!` : 'Adoption marked complete'),
        subtitle: primary.body.trim() || undefined,
        avatarUser: actor,
        useActorStack: false,
        showTypeBadge: false,
        iconOnly: true,
        showCircleActions: false,
      };

    case 'update_request':
      return {
        bold: null,
        body: primary.text.trim()
          || (primary.petName ? `Home update due for ${primary.petName}` : 'Home update requested'),
        subtitle: primary.body.trim() || undefined,
        avatarUser: null,
        useActorStack: false,
        showTypeBadge: false,
        iconOnly: true,
        showCircleActions: false,
      };

    case 'adoption_confirmed':
      return {
        bold: null,
        body: primary.text.trim()
          || (primary.petName ? `Adoption confirmed for ${primary.petName}` : 'Adoption confirmed'),
        subtitle: primary.body.trim() || undefined,
        avatarUser: null,
        useActorStack: false,
        showTypeBadge: false,
        iconOnly: true,
        showCircleActions: false,
      };

    case 'endorsement_received':
      return {
        bold: name,
        body: 'endorsed you',
        subtitle: primary.body.trim() || undefined,
        avatarUser: actor,
        useActorStack: false,
        showTypeBadge: true,
        iconOnly: false,
        showCircleActions: false,
      };

    default:
      return {
        bold: name,
        body: primary.body.trim() || primary.text.trim() || 'New notification',
        avatarUser: actor,
        useActorStack: false,
        showTypeBadge: true,
        iconOnly: false,
        showCircleActions: false,
      };
  }
}
