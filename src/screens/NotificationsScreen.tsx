import React, { useCallback, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/tokens';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AppSubHeader } from '../components/ui/AppSubHeader';
import { Toast, ToastData } from '../components/ui/Toast';
import { Empty } from '../components/ui/Empty';
import { Segmented } from '../components/ui/Segmented';
import { Icon } from '../components/icons/Icon';
import type { AppNotification } from '../data/mockData';
import { useAdoption, type AdoptionNotification } from '../context/AdoptionContext';
import { useNotifications, type ActorUser } from '../hooks/useNotifications';
import { usePawCircles } from '../context/PawCircleContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { routeAppNotificationPress, navigateFromNotificationsInbox } from '../navigation/notificationRouting';

type NotifFilter = 'all' | 'unread' | 'circles' | 'posts' | 'adoption';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

type NotifWithMeta = AppNotification;

// Grouped: a primary notification + optional extras from the same event cluster
type GroupedAppNotif = {
  source: 'app';
  primary: NotifWithMeta;
  extras: NotifWithMeta[];
  actors: ActorUser[];
};
type UnifiedNotif =
  | GroupedAppNotif
  | { source: 'adoption'; data: AdoptionNotification };

const FILTER_OPTIONS: { id: NotifFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'adoption', label: 'Adoption' },
  { id: 'circles', label: 'Circles' },
  { id: 'posts', label: 'Posts' },
];

const GROUPABLE_TYPES = ['like', 'comment', 'mention'];

function resolveCircleRequestLabel(
  notif: NotifWithMeta,
  resolveCircleName: (circleDbId: string | undefined) => string | undefined,
): string {
  const circleName = resolveCircleName(notif.circleId) ?? 'your circle';
  return `${notif.userName} wants to join ${circleName}`;
}

function getToneForType(type: AppNotification['type'] | AdoptionNotification['type']): { icon: string; color: string } {
  switch (type) {
    case 'like': return { icon: 'heart', color: '#e85d7d' };
    case 'comment': return { icon: 'comment', color: '#6b7bef' };
    case 'circle_request': return { icon: 'circles', color: '#14A697' };
    case 'circle_accept': return { icon: 'check', color: '#14A697' };
    case 'adoption': return { icon: 'adoption', color: '#F2972E' };
    case 'update_request': return { icon: 'camera', color: '#C98E2A' };
    case 'adoption_confirmed': return { icon: 'check', color: '#3A9B72' };
    case 'endorsement_received': return { icon: 'heart', color: '#7C5CBF' };
    case 'mention': return { icon: 'at', color: '#9c59e8' };
    case 'lost': return { icon: 'alert', color: '#ef4444' };
    case 'found': return { icon: 'check', color: '#2FA46A' };
    default: return { icon: 'bell', color: '#7A6A56' };
  }
}

function groupAppNotifs(
  notifs: NotifWithMeta[],
  actorsByUid: Record<string, ActorUser>,
): GroupedAppNotif[] {
  const groups = new Map<string, NotifWithMeta[]>();
  const order: string[] = [];

  for (const n of notifs) {
    const key = GROUPABLE_TYPES.includes(n.type) && n.entityId
      ? `${n.type}:${n.entityId}`
      : n.id; // non-groupable → own group
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(n);
  }

  return order.map(key => {
    const members = groups.get(key)!;
    const [primary, ...extras] = members;
    const actors = members
      .map(m => actorsByUid[m.userId])
      .filter((a): a is ActorUser => !!a);
    return { source: 'app' as const, primary, extras, actors };
  });
}

function groupedBody(group: GroupedAppNotif): string {
  const { actors, extras, primary } = group;
  if (extras.length === 0) return primary.body;
  const firstName = actors[0]?.name ?? primary.userName;
  const rest = extras.length;
  const action = primary.type === 'like'
    ? 'liked your post 🐾'
    : primary.type === 'comment'
      ? 'commented on your post 🐾'
      : primary.type === 'mention'
        ? 'mentioned you 🐾'
        : primary.body;
  return rest === 1
    ? `${firstName} and 1 other ${action}`
    : `${firstName} and ${rest} others ${action}`;
}

export function NotificationsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const {
    getNotificationsForUser,
    markNotificationRead,
    dismissNotification,
  } = useAdoption();
  const {
    notifs,
    actorsByUid,
    markRead,
    markAllRead: markAllGeneralRead,
    dismissNotification: dismissGeneralNotif,
  } = useNotifications();
  const { getDbId, createdCircles, joinedCircles } = usePawCircles();
  const [handledCircles, setHandledCircles] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<NotifFilter>('all');
  const [toast, setToast] = useState<ToastData | null>(null);

  const adoptionNotifs = useMemo(
    () => getNotificationsForUser('you'),
    [getNotificationsForUser],
  );

  const groupedAppNotifs = useMemo(
    () => groupAppNotifs(notifs, actorsByUid),
    [notifs, actorsByUid],
  );

  const unified: UnifiedNotif[] = useMemo(() => {
    const adoption = adoptionNotifs.map(n => ({ source: 'adoption' as const, data: n }));
    return [...adoption, ...groupedAppNotifs];
  }, [adoptionNotifs, groupedAppNotifs]);

  const markAllRead = () => {
    markAllGeneralRead();
    adoptionNotifs.filter(n => n.unread).forEach(n => markNotificationRead(n.id));
  };

  const resolveCircleName = useCallback((circleDbId: string | undefined) => {
    if (!circleDbId) return undefined;
    const all = [...createdCircles, ...joinedCircles];
    for (const circle of all) {
      if (getDbId(circle.id) === circleDbId) return circle.name;
    }
    return undefined;
  }, [createdCircles, joinedCircles, getDbId]);

  const handleCircleAction = async (notif: NotifWithMeta, accept: boolean) => {
    try {
      const requestId = notif.requestId ?? notif.entityId;
      if (requestId) {
        const fn = accept ? 'accept_circle_request' : 'decline_circle_request';
        const { error } = await (supabase.rpc as unknown as (
          fn: string,
          params: Record<string, unknown>,
        ) => Promise<{ error: unknown }>)(fn, { p_request_id: requestId });
        if (error) throw error;
      }
      markRead(notif.id);
      setHandledCircles(s => new Set([...s, notif.id]));
      const circleName = resolveCircleName(notif.circleId);
      setToast({
        msg: accept
          ? `Accepted${circleName ? ` for ${circleName}` : ''}`
          : `Declined${circleName ? ` for ${circleName}` : ''}`,
        icon: accept ? 'check' : 'close',
        tone: accept ? 'success' : 'neutral',
      });
    } catch {
      setToast({ msg: 'Something went wrong', icon: 'alert', tone: 'danger' });
    }
  };

  const handleAdoptionNotifPress = (notif: AdoptionNotification) => {
    if (notif.unread) markNotificationRead(notif.id);
    navigateFromNotificationsInbox(navigation, root => {
      root.navigate('MainTabs', {
        screen: 'Profile',
        params: { screen: 'AdoptedDetail', params: { recordId: notif.recordId } },
      });
    });
  };

  const handleAppNotifPress = useCallback((group: GroupedAppNotif) => {
    routeAppNotificationPress(
      navigation,
      group.primary,
      markRead,
      group.extras.map(e => e.id),
    );
  }, [navigation, markRead]);

  const filtered = unified.filter(item => {
    if (filter === 'unread') {
      if (item.source === 'adoption') return item.data.unread;
      return item.primary.unread || item.extras.some(e => e.unread);
    }
    if (filter === 'adoption') {
      return item.source === 'adoption'
        || (item.source === 'app' && item.primary.type === 'adoption');
    }
    if (filter === 'circles') {
      return item.source === 'app'
        && (item.primary.type === 'circle_request' || item.primary.type === 'circle_accept');
    }
    if (filter === 'posts') {
      return item.source === 'app'
        && (item.primary.type === 'like'
          || item.primary.type === 'comment'
          || item.primary.type === 'mention'
          || item.primary.type === 'lost'
          || item.primary.type === 'found');
    }
    return true;
  });

  const unreadCount =
    notifs.filter(n => n.unread).length +
    adoptionNotifs.filter(n => n.unread).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <AppSubHeader
        onBack={() => navigation.goBack()}
        titleNode={(
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: colors.primary }]}>Notifications</Text>
            {unreadCount > 0 ? <Badge tone="primary">{unreadCount}</Badge> : null}
          </View>
        )}
        trailing={unreadCount > 0 ? (
          <Pressable onPress={markAllRead} hitSlop={8} style={{ paddingHorizontal: 4 }}>
            <Text style={[styles.markRead, { color: colors.primary }]}>Mark all read</Text>
          </Pressable>
        ) : undefined}
      />

      <View style={{ paddingHorizontal: 14, marginTop: 12, marginBottom: 4 }}>
        <Segmented
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(v) => setFilter(v as NotifFilter)}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={
          filtered.length === 0
            ? { flexGrow: 1, paddingHorizontal: 14, paddingBottom: 32 }
            : { paddingHorizontal: 14, paddingBottom: 32 }
        }
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0
          ? <Empty icon="bell" title="All caught up" body="No notifications here." />
          : filtered.map(item =>
            item.source === 'adoption'
              ? (
                <SwipeNotifActions
                  key={item.data.id}
                  canMarkRead={item.data.unread}
                  onMarkRead={() => markNotificationRead(item.data.id)}
                  onDelete={() => dismissNotification(item.data.id)}
                >
                  <AdoptionNotifItem
                    notif={item.data}
                    onPress={() => handleAdoptionNotifPress(item.data)}
                  />
                </SwipeNotifActions>
              )
              : (
                <SwipeNotifActions
                  key={item.primary.id}
                  canMarkRead={item.primary.unread || item.extras.some(e => e.unread)}
                  onMarkRead={() => {
                    markRead(item.primary.id);
                    item.extras.forEach(e => markRead(e.id));
                  }}
                  onDelete={() => {
                    dismissGeneralNotif(item.primary.id);
                    item.extras.forEach(e => dismissGeneralNotif(e.id));
                  }}
                >
                  <NotifItem
                    group={item}
                    circleHandled={handledCircles.has(item.primary.id)}
                    onCircleAction={handleCircleAction}
                    onPress={() => handleAppNotifPress(item)}
                    getCircleName={resolveCircleName}
                  />
                </SwipeNotifActions>
              )
          )
        }
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Swipe actions (mark read + delete)
// ---------------------------------------------------------------------------

function SwipeNotifActions({
  children,
  onDelete,
  onMarkRead,
  canMarkRead = false,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  onMarkRead?: () => void;
  canMarkRead?: boolean;
}) {
  const { colors } = useTheme();
  const swipeRef = useRef<Swipeable>(null);
  const actionWidth = canMarkRead ? 144 : 72;

  const renderRightActions = useCallback(
    () => (
      <View style={[styles.swipeActions, { width: actionWidth }]}>
        {canMarkRead && onMarkRead ? (
          <Pressable
            style={[styles.swipeActionBtn, { backgroundColor: colors.primary }]}
            onPress={() => { swipeRef.current?.close(); onMarkRead(); }}
            accessibilityLabel="Mark as read"
          >
            <Icon name="check" size={18} color="#fff" />
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.swipeActionBtn, { backgroundColor: colors.danger }]}
          onPress={() => { swipeRef.current?.close(); onDelete(); }}
          accessibilityLabel="Delete notification"
        >
          <Icon name="close" size={18} color="#fff" />
        </Pressable>
      </View>
    ),
    [actionWidth, canMarkRead, colors.danger, colors.primary, onDelete, onMarkRead],
  );

  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      friction={2}
      overshootRight={false}
      containerStyle={{ overflow: 'hidden', backgroundColor: colors.bg }}
      childrenContainerStyle={{ backgroundColor: colors.bg }}
    >
      {children}
    </Swipeable>
  );
}

// ---------------------------------------------------------------------------
// Adoption notification card
// ---------------------------------------------------------------------------

function AdoptionNotifItem({
  notif,
  onPress,
}: {
  notif: AdoptionNotification;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { icon, color } = getToneForType(notif.type);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.notifRow,
        {
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <View style={[styles.notifIconWrap, { backgroundColor: color + '18' }]}>
        <Icon name={icon} size={18} color={color} />
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[styles.notifBody, { color: colors.text }]}>
          <Text style={{ fontWeight: '700' }}>{notif.title}</Text>
        </Text>
        <Text style={[styles.notifSub, { color: colors.textSecondary }]}>{notif.body}</Text>
        <Text style={[styles.notifTime, { color: colors.textTertiary }]}>{notif.time}</Text>
      </View>

      {notif.unread && (
        <Icon name="paw" size={12} color={colors.warning} />
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// General notification card (supports grouping)
// ---------------------------------------------------------------------------

function NotifItem({ group, circleHandled, onCircleAction, onPress, getCircleName }: {
  group: GroupedAppNotif;
  circleHandled?: boolean;
  onCircleAction: (n: NotifWithMeta, accept: boolean) => void;
  onPress: () => void;
  getCircleName: (circleDbId: string | undefined) => string | undefined;
}) {
  const { colors } = useTheme();
  const { primary, extras, actors } = group;
  const { icon, color } = getToneForType(primary.type);
  const isCircleRequest = primary.type === 'circle_request' && !circleHandled;
  const isUnread = primary.unread || extras.some(e => e.unread);
  const isGrouped = extras.length > 0;

  const isAlertNotif = primary.type === 'lost' || primary.type === 'found';
  const alertLabelColor = primary.type === 'found' ? '#2FA46A' : primary.type === 'lost' ? '#ef4444' : colors.textSecondary;

  const bodyText = isGrouped
    ? groupedBody(group)
    : GROUPABLE_TYPES.includes(primary.type)
      ? `${primary.body} 🐾`
      : primary.body;

  const renderMainText = () => {
    if (isGrouped) {
      return <Text style={{ color: colors.textSecondary }}>{bodyText}</Text>;
    }
    if (isCircleRequest) {
      return (
        <Text style={{ color: colors.text }}>
          {resolveCircleRequestLabel(primary, getCircleName)}
        </Text>
      );
    }
    if (isAlertNotif) {
      const alertLabel = primary.text || (primary.type === 'found' ? 'Found pet alert nearby' : 'Lost pet alert nearby');
      return (
        <>
          <Text style={{ fontWeight: '700' }}>{primary.userName} </Text>
          <Text style={{ fontWeight: '600', color: alertLabelColor }}>{alertLabel}</Text>
          {primary.body ? (
            <Text style={{ color: colors.textSecondary }}> · {primary.body}</Text>
          ) : null}
        </>
      );
    }
    return (
      <>
        <Text style={{ fontWeight: '700' }}>{primary.userName} </Text>
        <Text style={{ color: colors.textSecondary }}>{bodyText}</Text>
      </>
    );
  };

  return (
    <Pressable
      onPress={isCircleRequest ? undefined : onPress}
      style={({ pressed }) => [
        styles.notifRow,
        {
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
          opacity: pressed && !isCircleRequest ? 0.82 : 1,
        },
      ]}
    >
      {/* Avatar stack for grouped, single avatar otherwise */}
      <View style={{ flexShrink: 0 }}>
        {isGrouped && actors.length >= 2 ? (
          <View style={styles.avatarStack}>
            <View style={styles.avatarBack}>
              <Avatar user={actors[1]} size={36} />
            </View>
            <View style={styles.avatarFront}>
              <Avatar user={actors[0]} size={40} />
            </View>
          </View>
        ) : (
          <View style={{ position: 'relative' }}>
            {actors[0] && <Avatar user={actors[0]} size={46} />}
            <View style={[styles.notifIconDot, { backgroundColor: color }]}>
              <Icon name={icon} size={10} color="#fff" />
            </View>
          </View>
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[styles.notifBody, { color: colors.text }]}>
          {renderMainText()}
        </Text>
        <Text style={[styles.notifTime, { color: colors.textTertiary }]}>{primary.time}</Text>

        {isCircleRequest && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <Button size="sm" variant="primary" onPress={() => onCircleAction(primary, true)}>Accept</Button>
            <Button size="sm" variant="outline" onPress={() => onCircleAction(primary, false)}>Ignore</Button>
          </View>
        )}
      </View>

      {isUnread && (
        <Icon name="paw" size={12} color={colors.primary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    ...typography.appHeaderTitle,
  },
  markRead: { fontSize: 13.5, fontWeight: '600' },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notifIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifIconDot: {
    position: 'absolute', bottom: -2, right: -2, width: 20, height: 20,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  notifBody: { fontSize: 14, lineHeight: 20 },
  notifSub: { fontSize: 13, lineHeight: 18 },
  notifTime: { fontSize: 12 },
  avatarStack: {
    width: 60, height: 46,
    position: 'relative',
  },
  avatarBack: {
    position: 'absolute', top: 6, left: 18,
    borderWidth: 2, borderColor: 'transparent', borderRadius: 20,
  },
  avatarFront: {
    position: 'absolute', top: 0, left: 0,
    borderWidth: 2, borderColor: 'transparent', borderRadius: 22,
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  swipeActionBtn: {
    width: 72,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
