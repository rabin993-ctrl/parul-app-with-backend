import React, { useCallback, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  View, Text, FlatList, Pressable, StyleSheet, Platform, Animated, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
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
import { useNotifications, type ActorUser } from '../hooks/useNotifications';
import { usePawCircles } from '../context/PawCircleContext';
import type { RootStackParamList } from '../navigation/RootNavigator';
import {
  routeAppNotificationPress,
  getRootNavigation,
} from '../navigation/notificationRouting';
import {
  resolvePendingJoinRequestId,
  isAlreadyHandledCircleRequestError,
} from '../utils/circleRequestNotifications';
import {
  resolvePendingInviteId,
  isAlreadyHandledCircleInviteError,
} from '../utils/circleInviteNotifications';
import {
  type NotifFilter,
  type GroupedAppNotif,
  groupAppNotifs,
  sortGroupedNotifs,
  resolveNotifDisplay,
  resolveCircleName,
  getToneForType,
  matchesNotifFilter,
} from '../utils/notificationDisplay';
import { unreadListRowStyle } from '../utils/unreadRowStyle';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

/** Matches Notifications FlatList `contentContainerStyle` horizontal padding. */
const NOTIF_LIST_BLEED = 14;

const FILTER_OPTIONS: { id: NotifFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'adoption', label: 'Adoption' },
  { id: 'rescue', label: 'Rescue' },
  { id: 'circles', label: 'Circles' },
  { id: 'posts', label: 'Posts' },
];

export function NotificationsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const {
    notifs,
    actorsByUid,
    markRead,
    markAllRead,
    dismissNotification,
    reload: reloadNotifications,
  } = useNotifications();
  const { getDbId, createdCircles, joinedCircles } = usePawCircles();
  const [circleActionId, setCircleActionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotifFilter>('all');
  const [toast, setToast] = useState<ToastData | null>(null);

  const resolveCircleNameById = useCallback((circleDbId: string | undefined) => {
    if (!circleDbId) return undefined;
    const all = [...createdCircles, ...joinedCircles];
    for (const circle of all) {
      if (getDbId(circle.id) === circleDbId) return circle.name;
    }
    return undefined;
  }, [createdCircles, joinedCircles, getDbId]);

  const groupedNotifs = useMemo(
    () => sortGroupedNotifs(groupAppNotifs(notifs, actorsByUid)),
    [notifs, actorsByUid],
  );

  const filtered = useMemo(() => groupedNotifs.filter(group => {
    const unread = group.primary.unread || group.extras.some(e => e.unread);
    return matchesNotifFilter(group.primary.type, filter, unread);
  }), [groupedNotifs, filter]);

  const unreadCount = notifs.filter(n => n.unread).length;

  useFocusEffect(useCallback(() => {
    reloadNotifications();
  }, [reloadNotifications]));

  const handleNotificationsBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    const root = getRootNavigation(navigation) as ReturnType<typeof getRootNavigation> & {
      dispatch?: (action: unknown) => void;
    };
    root.dispatch?.(
      CommonActions.navigate({
        name: 'MainTabs',
        params: { screen: 'Feed', params: { screen: 'FeedHome' } },
      }),
    );
  }, [navigation]);

  const handleCircleAction = async (notif: AppNotification, accept: boolean) => {
    setCircleActionId(notif.id);
    try {
      if (notif.type === 'circle_invite') {
        const { inviteId, alreadyHandled } = await resolvePendingInviteId(notif);
        if (alreadyHandled || !inviteId) {
          dismissNotification(notif.id);
          markRead(notif.id);
          setToast({
            msg: alreadyHandled ? 'Invite already handled' : 'Could not find this invite',
            icon: alreadyHandled ? 'check' : 'alert',
            tone: alreadyHandled ? 'neutral' : 'danger',
          });
          return;
        }

        const { error } = accept
          ? await supabase.rpc('accept_circle_invite' as never, { p_invite_id: inviteId } as never)
          : await supabase.rpc('decline_circle_invite' as never, { p_invite_id: inviteId } as never);

        if (error) {
          if (isAlreadyHandledCircleInviteError(error.message)) {
            dismissNotification(notif.id);
            markRead(notif.id);
            setToast({ msg: 'Invite already handled', icon: 'check', tone: 'neutral' });
            return;
          }
          throw error;
        }

        dismissNotification(notif.id);
        markRead(notif.id);
        const circleName = resolveCircleName(notif, resolveCircleNameById);
        if (accept && notif.requiresAdminApproval) {
          setToast({
            msg: `Request sent${circleName ? ` for ${circleName}` : ''} — waiting for admin approval`,
            icon: 'circles',
            tone: 'primary',
          });
        } else {
          setToast({
            msg: accept
              ? `Joined${circleName ? ` ${circleName}` : ''}`
              : `Declined${circleName ? ` ${circleName} invite` : ''}`,
            icon: accept ? 'check' : 'close',
            tone: accept ? 'success' : 'neutral',
          });
        }
        return;
      }

      const { requestId, alreadyHandled } = await resolvePendingJoinRequestId(notif);
      if (alreadyHandled || !requestId) {
        dismissNotification(notif.id);
        markRead(notif.id);
        setToast({
          msg: alreadyHandled ? 'Request already handled' : 'Could not find this join request',
          icon: alreadyHandled ? 'check' : 'alert',
          tone: alreadyHandled ? 'neutral' : 'danger',
        });
        return;
      }

      const { error } = accept
        ? await supabase.rpc('accept_circle_request', { p_request_id: requestId })
        : await supabase.rpc('decline_circle_request', { p_request_id: requestId });

      if (error) {
        if (isAlreadyHandledCircleRequestError(error.message)) {
          dismissNotification(notif.id);
          markRead(notif.id);
          setToast({ msg: 'Request already handled', icon: 'check', tone: 'neutral' });
          return;
        }
        throw error;
      }

      dismissNotification(notif.id);
      markRead(notif.id);
      const circleName = resolveCircleName(notif, resolveCircleNameById);
      setToast({
        msg: accept
          ? `Accepted${circleName ? ` for ${circleName}` : ''}`
          : `Declined${circleName ? ` for ${circleName}` : ''}`,
        icon: accept ? 'check' : 'close',
        tone: accept ? 'success' : 'neutral',
      });
    } catch (err) {
      console.error('[NotificationsScreen] circle action failed:', err);
      setToast({ msg: 'Something went wrong — try again', icon: 'alert', tone: 'danger' });
    } finally {
      setCircleActionId(null);
    }
  };

  const handleAppNotifPress = useCallback((group: GroupedAppNotif) => {
    routeAppNotificationPress(
      navigation,
      group.primary,
      markRead,
      group.extras.map(e => e.id),
    );
  }, [markRead, navigation]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <AppSubHeader
        onBack={handleNotificationsBack}
        titleNode={(
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
            {unreadCount > 0 ? <Badge tone="primary">{unreadCount}</Badge> : null}
          </View>
        )}
        trailing={unreadCount > 0 ? (
          <Pressable onPress={markAllRead} hitSlop={8} style={{ paddingHorizontal: 4 }}>
            <Text style={[styles.markRead, { color: colors.textSecondary }]}>Mark all read</Text>
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

      <FlatList
        style={{ flex: 1 }}
        data={filtered}
        keyExtractor={item => item.primary.id}
        contentContainerStyle={
          filtered.length === 0
            ? { flexGrow: 1, paddingHorizontal: 14, paddingBottom: 32 }
            : { paddingHorizontal: 14, paddingBottom: 32 }
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Empty icon="bell" title="All caught up" body="No notifications here." />}
        renderItem={({ item: group }) => (
          Platform.OS === 'web' ? (
            <NotifItem
              group={group}
              circleActionPending={circleActionId === group.primary.id}
              onCircleAction={handleCircleAction}
              onPress={() => handleAppNotifPress(group)}
              getCircleName={resolveCircleNameById}
              actorsByUid={actorsByUid}
            />
          ) : (
            <SwipeNotifActions
              canMarkRead={group.primary.unread || group.extras.some(e => e.unread)}
              onMarkRead={() => {
                markRead(group.primary.id);
                group.extras.forEach(e => markRead(e.id));
              }}
              onDelete={() => {
                dismissNotification(group.primary.id);
                group.extras.forEach(e => dismissNotification(e.id));
              }}
            >
              <NotifItem
                group={group}
                circleActionPending={circleActionId === group.primary.id}
                onCircleAction={handleCircleAction}
                onPress={() => handleAppNotifPress(group)}
                getCircleName={resolveCircleNameById}
                actorsByUid={actorsByUid}
              />
            </SwipeNotifActions>
          )
        )}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

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
    return (
      <WebSwipeRow actionWidth={actionWidth} onDelete={onDelete} onMarkRead={onMarkRead} canMarkRead={canMarkRead}>
        {children}
      </WebSwipeRow>
    );
  }

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      friction={2}
      overshootRight={false}
      containerStyle={{ overflow: 'hidden', backgroundColor: 'transparent' }}
      childrenContainerStyle={{ backgroundColor: 'transparent' }}
    >
      {children}
    </Swipeable>
  );
}

function WebSwipeRow({
  children,
  actionWidth,
  onDelete,
  onMarkRead,
  canMarkRead = false,
}: {
  children: React.ReactNode;
  actionWidth: number;
  onDelete: () => void;
  onMarkRead?: () => void;
  canMarkRead?: boolean;
}) {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);
  const startX = useRef(0);

  const snapTo = useCallback((open: boolean) => {
    openRef.current = open;
    Animated.spring(translateX, {
      toValue: open ? -actionWidth : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 80,
    }).start();
  }, [actionWidth, translateX]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => (
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 6
      ),
      onPanResponderGrant: () => {
        translateX.stopAnimation(v => { startX.current = v; });
      },
      onPanResponderMove: (_, g) => {
        const next = Math.min(0, Math.max(-actionWidth, startX.current + g.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const projected = startX.current + g.dx;
        snapTo(projected < -actionWidth / 3 || g.vx < -0.5);
      },
      onPanResponderTerminate: () => snapTo(openRef.current),
    }),
  ).current;

  return (
    <View style={{ overflow: 'hidden', backgroundColor: colors.bg }}>
      <View style={[styles.swipeActions, { width: actionWidth, position: 'absolute', right: 0, top: 0, bottom: 0 }]}>
        {canMarkRead && onMarkRead ? (
          <Pressable
            style={[styles.swipeActionBtn, { backgroundColor: colors.primary }]}
            onPress={() => { snapTo(false); onMarkRead(); }}
            accessibilityLabel="Mark as read"
          >
            <Icon name="check" size={18} color="#fff" />
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.swipeActionBtn, { backgroundColor: colors.danger }]}
          onPress={() => { snapTo(false); onDelete(); }}
          accessibilityLabel="Delete notification"
        >
          <Icon name="close" size={18} color="#fff" />
        </Pressable>
      </View>
      <Animated.View
        style={{ transform: [{ translateX }], backgroundColor: 'transparent' }}
        {...pan.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

function NotifItem({
  group,
  circleActionPending,
  onCircleAction,
  onPress,
  getCircleName,
  actorsByUid,
}: {
  group: GroupedAppNotif;
  circleActionPending?: boolean;
  onCircleAction: (n: AppNotification, accept: boolean) => void;
  onPress: () => void;
  getCircleName: (circleDbId: string | undefined) => string | undefined;
  actorsByUid: Record<string, ActorUser>;
}) {
  const { colors, isDark, groupedBg } = useTheme();
  const { primary, extras, actors } = group;
  const isUnread = primary.unread || extras.some(e => e.unread);
  const display = resolveNotifDisplay(group, actorsByUid, getCircleName, false);
  const { icon, color } = getToneForType(primary.type);
  const isAlert = primary.type === 'lost' || primary.type === 'found';
  const isGrouped = extras.length > 0;

  const rowStyle = [
    styles.notifRow,
    { borderBottomColor: colors.border },
    isUnread
      ? unreadListRowStyle({
        isUnread,
        listBleed: NOTIF_LIST_BLEED,
        rowInset: 0,
        isDark,
        groupedBg,
        colors,
      })
      : { backgroundColor: colors.bg },
  ];

  const rowContent = (
    <>
      <View style={{ flexShrink: 0 }}>
        {display.useActorStack && actors.length >= 2 ? (
          <View style={styles.avatarStack}>
            <View style={styles.avatarBack}>
              <Avatar user={actors[1]} size={36} />
            </View>
            <View style={styles.avatarFront}>
              <Avatar user={actors[0]} size={40} />
            </View>
          </View>
        ) : display.iconOnly ? (
          <View style={[styles.notifIconWrap, { backgroundColor: color + '18' }]}>
            <Icon name={icon} size={18} color={color} />
          </View>
        ) : (
          <View style={{ position: 'relative' }}>
            {display.avatarUser && <Avatar user={display.avatarUser} size={46} />}
            {display.showTypeBadge && (
              <View style={[styles.notifIconDot, { backgroundColor: color }]}>
                <Icon name={icon} size={10} color="#fff" />
              </View>
            )}
          </View>
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[styles.notifBody, { color: colors.text }]}>
          {isGrouped ? (
            <Text style={{ color: colors.textSecondary }}>{display.body}</Text>
          ) : (
            <>
              {display.bold ? (
                <Text style={{ fontWeight: '700', color: isAlert ? color : colors.text }}>
                  {display.bold}{' '}
                </Text>
              ) : null}
              <Text style={{ color: display.bold && !isAlert ? colors.textSecondary : colors.text }}>
                {display.body}
              </Text>
            </>
          )}
        </Text>
        {display.subtitle ? (
          <Text style={[styles.notifSub, { color: colors.textSecondary }]} numberOfLines={2}>
            {display.subtitle}
          </Text>
        ) : null}
        <Text style={[styles.notifTime, { color: colors.textTertiary }]}>{primary.time}</Text>

        {display.showCircleActions && (
          <View
            style={styles.circleActionRow}
            {...(Platform.OS === 'web' ? { onClick: (e: { stopPropagation?: () => void }) => e.stopPropagation?.() } : {})}
          >
            <Button
              size="sm"
              variant="primary"
              loading={circleActionPending}
              disabled={circleActionPending}
              onPress={() => onCircleAction(primary, true)}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={circleActionPending}
              disabled={circleActionPending}
              onPress={() => onCircleAction(primary, false)}
            >
              Ignore
            </Button>
          </View>
        )}
      </View>

      {isUnread && (
        <Icon name="paw" size={12} color={colors.primary} />
      )}
    </>
  );

  if (display.showCircleActions) {
    return <View style={rowStyle}>{rowContent}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [...rowStyle, { opacity: pressed ? 0.82 : 1 }]}
    >
      {rowContent}
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
    width: 46,
    height: 46,
    borderRadius: 23,
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
  circleActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    ...(Platform.OS === 'web' ? { zIndex: 2, position: 'relative' as const } : {}),
  },
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
