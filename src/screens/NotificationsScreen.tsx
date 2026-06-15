import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button, IconButton } from '../components/ui/Button';
import { Toast, ToastData } from '../components/ui/Toast';
import { Empty } from '../components/ui/Empty';
import { Segmented } from '../components/ui/Segmented';
import { Icon } from '../components/icons/Icon';
import type { AppNotification } from '../data/mockData';
import { useAdoption, type AdoptionNotification } from '../context/AdoptionContext';
import { useNotifications, type ActorUser } from '../hooks/useNotifications';
import type { ProfileStackParamList } from '../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../navigation/tabBarInsets';

type NotifFilter = 'all' | 'unread' | 'circles' | 'posts' | 'adoption';

type TabNav = BottomTabNavigationProp<{ Profile: undefined }>;
type ProfileNav = NativeStackNavigationProp<ProfileStackParamList>;
type Nav = CompositeNavigationProp<ProfileNav, TabNav>;

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
  const [handledCircles, setHandledCircles] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<NotifFilter>('all');
  const [toast, setToast] = useState<ToastData | null>(null);
  const tabBarPad = useTabBarScrollPadding();

  const adoptionNotifs = useMemo(
    () => getNotificationsForUser('you'),
    [getNotificationsForUser],
  );

  // Auto-mark all as read when the screen mounts — clears the Profile tab badge.
  useEffect(() => {
    markAllGeneralRead();
    adoptionNotifs.filter(n => n.unread).forEach(n => markNotificationRead(n.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleCircleAction = async (notif: NotifWithMeta, accept: boolean) => {
    try {
      if (notif.entityId) {
        const fn = accept ? 'accept_circle_request' : 'decline_circle_request';
        const { error } = await (supabase.rpc as unknown as (
          fn: string,
          params: Record<string, unknown>,
        ) => Promise<{ error: unknown }>)(fn, { p_request_id: notif.entityId });
        if (error) throw error;
      }
      markRead(notif.id);
      setHandledCircles(s => new Set([...s, notif.id]));
      setToast({
        msg: accept ? 'Request accepted!' : 'Request declined',
        icon: accept ? 'check' : 'close',
        tone: accept ? 'success' : 'neutral',
      });
    } catch {
      setToast({ msg: 'Something went wrong', icon: 'alert', tone: 'danger' });
    }
  };

  const handleAdoptionNotifPress = (notif: AdoptionNotification) => {
    markNotificationRead(notif.id);
    navigation.navigate('Profile', {
      screen: 'AdoptedDetail',
      params: { recordId: notif.recordId },
    } as never);
  };

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
        && (item.primary.type === 'like' || item.primary.type === 'comment' || item.primary.type === 'mention');
    }
    return true;
  });

  const unreadCount =
    notifs.filter(n => n.unread).length +
    adoptionNotifs.filter(n => n.unread).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <IconButton
            name="chevronLeft"
            size={36}
            tone="soft"
            onPress={() => navigation.goBack()}
          />
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
          {unreadCount > 0 && <Badge tone="primary">{unreadCount}</Badge>}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead} style={{ paddingHorizontal: 8 }}>
            <Text style={[styles.markRead, { color: colors.primary }]}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      <View style={{ paddingHorizontal: 14, marginTop: 12, marginBottom: 4 }}>
        <Segmented
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(v) => setFilter(v as NotifFilter)}
        />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: tabBarPad, gap: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0
          ? <Empty icon="bell" title="All caught up" body="No notifications here." />
          : filtered.map(item =>
            item.source === 'adoption'
              ? (
                <SwipeToDelete
                  key={item.data.id}
                  onDelete={() => dismissNotification(item.data.id)}
                >
                  <AdoptionNotifItem
                    notif={item.data}
                    onPress={() => handleAdoptionNotifPress(item.data)}
                  />
                </SwipeToDelete>
              )
              : (
                <SwipeToDelete
                  key={item.primary.id}
                  onDelete={() => {
                    dismissGeneralNotif(item.primary.id);
                    item.extras.forEach(e => dismissGeneralNotif(e.id));
                  }}
                >
                  <NotifItem
                    group={item}
                    circleHandled={handledCircles.has(item.primary.id)}
                    onCircleAction={handleCircleAction}
                  />
                </SwipeToDelete>
              )
          )
        }
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Swipe-to-delete wrapper
// ---------------------------------------------------------------------------

function SwipeToDelete({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const swipeRef = useRef<Swipeable>(null);

  const renderRightActions = useCallback(
    (progress: Animated.AnimatedInterpolation<number>) => {
      const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [80, 0],
      });
      return (
        <Animated.View style={[styles.deleteAction, { transform: [{ translateX }] }]}>
          <Pressable
            style={[styles.deleteBtn, { backgroundColor: colors.danger }]}
            onPress={() => { swipeRef.current?.close(); onDelete(); }}
          >
            <Icon name="close" size={18} color="#fff" />
          </Pressable>
        </Animated.View>
      );
    },
    [colors.danger, onDelete],
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={60}
      onSwipeableOpen={() => { setTimeout(onDelete, 180); }}
      containerStyle={{ borderRadius: radius.xl, overflow: 'hidden' }}
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
      style={[
        styles.notifCard,
        {
          backgroundColor: notif.unread ? colors.warningBg : colors.surface,
          borderColor: notif.unread ? colors.warning + '28' : colors.border,
        },
      ]}
    >
      <View style={[styles.notifIconWrap, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={20} color={color} />
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

function NotifItem({ group, circleHandled, onCircleAction }: {
  group: GroupedAppNotif;
  circleHandled?: boolean;
  onCircleAction: (n: NotifWithMeta, accept: boolean) => void;
}) {
  const { colors } = useTheme();
  const { primary, extras, actors } = group;
  const { icon, color } = getToneForType(primary.type);
  const isCircleRequest = primary.type === 'circle_request' && !circleHandled;
  const isUnread = primary.unread || extras.some(e => e.unread);
  const isGrouped = extras.length > 0;

  const bodyText = isGrouped
    ? groupedBody(group)
    : GROUPABLE_TYPES.includes(primary.type)
      ? `${primary.body} 🐾`
      : primary.body;

  return (
    <Pressable style={[
      styles.notifCard,
      {
        backgroundColor: isUnread ? colors.primary + '10' : colors.surface,
        borderColor: isUnread ? colors.primary + '28' : colors.border,
      }
    ]}>
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
          {isGrouped
            ? <Text style={{ color: colors.textSecondary }}>{bodyText}</Text>
            : (
              <>
                <Text style={{ fontWeight: '700' }}>{primary.userName} </Text>
                <Text style={{ color: colors.textSecondary }}>{bodyText}</Text>
              </>
            )
          }
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingTop: 4, paddingBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '800' },
  markRead: { fontSize: 13.5, fontWeight: '600' },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 12, borderRadius: radius.xl, borderWidth: 1,
  },
  notifIconWrap: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 8,
    width: 80,
  },
  deleteBtn: {
    width: 60,
    height: '100%' as any,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
