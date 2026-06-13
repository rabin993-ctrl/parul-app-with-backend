import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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

const FILTER_OPTIONS: { id: NotifFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'adoption', label: 'Adoption' },
  { id: 'circles', label: 'Circles' },
  { id: 'posts', label: 'Posts' },
];

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

type UnifiedNotif =
  | { source: 'app'; data: NotifWithMeta }
  | { source: 'adoption'; data: AdoptionNotification };

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
  } = useNotifications();
  const [handledCircles, setHandledCircles] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<NotifFilter>('all');
  const [toast, setToast] = useState<ToastData | null>(null);
  const tabBarPad = useTabBarScrollPadding();

  const adoptionNotifs = useMemo(
    () => getNotificationsForUser('you'),
    [getNotificationsForUser],
  );

  const unified: UnifiedNotif[] = useMemo(() => {
    const adoption: UnifiedNotif[] = adoptionNotifs.map(n => ({ source: 'adoption' as const, data: n }));
    const app: UnifiedNotif[] = notifs.map(n => ({ source: 'app' as const, data: n }));
    return [...adoption, ...app];
  }, [adoptionNotifs, notifs]);

  const markAllRead = () => {
    markAllGeneralRead();
    adoptionNotifs.filter(n => n.unread).forEach(n => markNotificationRead(n.id));
  };

  const handleCircleAction = (notif: NotifWithMeta, accept: boolean) => {
    markRead(notif.id);
    setHandledCircles(s => new Set([...s, notif.id]));
    setToast({
      msg: accept ? `Request accepted — circles wiring coming soon` : 'Request ignored',
      icon: accept ? 'check' : 'close',
      tone: accept ? 'success' : 'neutral',
    });
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
      return item.source === 'adoption' ? item.data.unread : item.data.unread;
    }
    if (filter === 'adoption') {
      return item.source === 'adoption'
        || (item.source === 'app' && item.data.type === 'adoption');
    }
    if (filter === 'circles') {
      return item.source === 'app'
        && (item.data.type === 'circle_request' || item.data.type === 'circle_accept');
    }
    if (filter === 'posts') {
      return item.source === 'app'
        && (item.data.type === 'like' || item.data.type === 'comment' || item.data.type === 'mention');
    }
    return true;
  });

  const unreadCount =
    notifs.filter(n => n.unread).length +
    adoptionNotifs.filter(n => n.unread).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
          {unreadCount > 0 && <Badge tone="primary">{unreadCount}</Badge>}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead} style={{ paddingHorizontal: 4 }}>
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

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: tabBarPad, gap: 8 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0
          ? <Empty icon="bell" title="All caught up" body="No notifications here." />
          : filtered.map(item => (
            item.source === 'adoption'
              ? (
                <AdoptionNotifItem
                  key={item.data.id}
                  notif={item.data}
                  onPress={() => handleAdoptionNotifPress(item.data)}
                  onDismiss={() => dismissNotification(item.data.id)}
                />
              )
              : (
                <NotifItem
                  key={item.data.id}
                  notif={item.data}
                  sender={actorsByUid[item.data.userId]}
                  circleHandled={handledCircles.has(item.data.id)}
                  onCircleAction={handleCircleAction}
                />
              )
          ))
        }
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

function AdoptionNotifItem({
  notif,
  onPress,
  onDismiss,
}: {
  notif: AdoptionNotification;
  onPress: () => void;
  onDismiss: () => void;
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

      <IconButton name="close" size={32} tone="soft" onPress={onDismiss} />

      {notif.unread && (
        <View style={[styles.unreadDot, { backgroundColor: colors.warning }]} />
      )}
    </Pressable>
  );
}

function NotifItem({ notif, sender, circleHandled, onCircleAction }: {
  notif: NotifWithMeta;
  sender?: ActorUser;
  circleHandled?: boolean;
  onCircleAction: (n: NotifWithMeta, accept: boolean) => void;
}) {
  const { colors } = useTheme();
  const { icon, color } = getToneForType(notif.type);
  const isCircleRequest = notif.type === 'circle_request' && !circleHandled;

  return (
    <Pressable style={[
      styles.notifCard,
      {
        backgroundColor: notif.unread ? colors.primary + '10' : colors.surface,
        borderColor: notif.unread ? colors.primary + '28' : colors.border,
      }
    ]}>
      <View style={{ position: 'relative', flexShrink: 0 }}>
        {sender && <Avatar user={sender} size={46} />}
        <View style={[styles.notifIconDot, { backgroundColor: color }]}>
          <Icon name={icon} size={10} color="#fff" />
        </View>
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[styles.notifBody, { color: colors.text }]}>
          <Text style={{ fontWeight: '700' }}>{notif.userName} </Text>
          <Text style={{ color: colors.textSecondary }}>{notif.body}</Text>
        </Text>
        <Text style={[styles.notifTime, { color: colors.textTertiary }]}>{notif.time}</Text>

        {isCircleRequest && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <Button size="sm" variant="primary" onPress={() => onCircleAction(notif, true)}>Accept</Button>
            <Button size="sm" variant="outline" onPress={() => onCircleAction(notif, false)}>Ignore</Button>
          </View>
        )}
      </View>

      {notif.unread && (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
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
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
});
