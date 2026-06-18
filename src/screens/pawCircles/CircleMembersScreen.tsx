import React, { useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Modal, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from '../../components/ui/Avatar';
import { IconButton } from '../../components/ui/Button';
import { ModalPresent } from '../../components/ui/ModalScrim';
import { Icon } from '../../components/icons/Icon';
import { radius, spacing } from '../../theme/tokens';
import { usePawCircles } from '../../context/PawCircleContext';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { JoinRequestRow } from '../../components/JoinRequestsSheet';
import { Toast, ToastData } from '../../components/ui/Toast';
import {
  PawCircleHairline,
  PawCirclePageHeader,
  PawCircleSearchField,
  PawCircleSectionLabel,
  pawCircleStyles,
} from './PawCircleChrome';
import { useCircleMembers, circleMemberToAvatarUser } from '../../hooks/useCircleMembers';
import { useCircleJoinRequests, CircleJoinRequestProfile } from '../../hooks/useCircleJoinRequests';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

type Route = RouteProp<CirclesStackParamList, 'CircleMembers'>;
type Nav = NativeStackNavigationProp<CirclesStackParamList, 'CircleMembers'>;
type SortId = 'name' | 'joined';

const AVATAR_INSET = 68;

const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: 'name', label: 'Alphabetically' },
  { id: 'joined', label: 'Date added' },
];

function SortPicker({
  value,
  onChange,
  surface,
  border,
  text,
  sub,
}: {
  value: SortId;
  onChange: (id: SortId) => void;
  surface: string;
  border: string;
  text: string;
  sub: string;
}) {
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find(o => o.id === value) ?? SORT_OPTIONS[0];

  const pick = (id: SortId) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.sortBtn, pressed && styles.rowPressed]}
      >
        <Text style={[styles.sortBtnText, { color: sub }]}>{current.label}</Text>
        <Icon name="chevronDown" size={12} color={sub} />
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <ModalPresent onDismiss={() => setOpen(false)} style={styles.sortScrim}>
          <View style={[styles.sortSheet, { backgroundColor: surface }]}>
            <Text style={[styles.sortSheetTitle, { color: sub }]}>Sort by</Text>
            {SORT_OPTIONS.map(opt => {
              const active = value === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => pick(opt.id)}
                  style={[styles.sortOption, active && { backgroundColor: text + '14' }]}
                >
                  <Text style={[styles.sortOptionText, { color: active ? text : sub }]}>
                    {opt.label}
                  </Text>
                  {active && <Icon name="check" size={14} color={text} />}
                </Pressable>
              );
            })}
          </View>
        </ModalPresent>
      </Modal>
    </>
  );
}

export function CircleMembersScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { circleId } = route.params;
  const { getCircle, createdCircles, getDbId } = usePawCircles();
  const { user } = useAuth();
  const circle = getCircle(circleId);
  const circleDbId = getDbId(circleId) ?? circleId;
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortId>('name');
  const [toast, setToast] = useState<ToastData | null>(null);
  const tabBarPad = useTabBarScrollPadding();

  const { members: memberList, refresh: refreshMembers } = useCircleMembers(circleDbId);
  const { requests, refresh: refreshRequests } = useCircleJoinRequests(circleDbId);

  const isCreator = createdCircles.some(c => c.id === circleId);

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = memberList;
    if (q) {
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) || m.handle.toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => Date.parse(b.joinedAt) - Date.parse(a.joinedAt));
    }
    return sorted;
  }, [memberList, query, sort]);

  const openProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  const removeMember = async (userId: string, name: string) => {
    const { error } = await supabase.rpc('remove_circle_member' as any, {
      p_circle_id: circleDbId,
      p_user_id: userId,
    });
    if (!error) {
      refreshMembers();
      setToast({ msg: `Removed ${name}`, icon: 'check', tone: 'neutral' });
    } else {
      setToast({ msg: 'Failed to remove member', icon: 'close', tone: 'neutral' });
    }
  };

  const confirmRemoveMember = (userId: string, name: string) => {
    Alert.alert(
      'Remove member?',
      `Remove ${name} from this circle? They will need to join again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => { void removeMember(userId, name); } },
      ],
    );
  };

  const approveRequest = async (req: CircleJoinRequestProfile) => {
    const { error } = await supabase.rpc('accept_circle_request', { p_request_id: req.id });
    if (!error) {
      refreshRequests();
      refreshMembers();
    } else {
      setToast({ msg: 'Failed to accept request', icon: 'close', tone: 'neutral' });
    }
  };

  const declineRequest = async (req: CircleJoinRequestProfile) => {
    const { error } = await supabase.rpc('decline_circle_request', { p_request_id: req.id });
    if (!error) {
      refreshRequests();
    } else {
      setToast({ msg: 'Failed to decline request', icon: 'close', tone: 'neutral' });
    }
  };

  const acceptAll = async () => {
    await Promise.all(
      requests.map(req =>
        supabase.rpc('accept_circle_request', { p_request_id: req.id })
      )
    );
    refreshRequests();
    refreshMembers();
  };

  if (!circle) return null;

  return (
    <>
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCirclePageHeader title="Members" onBack={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[pawCircleStyles.detailScroll, { paddingBottom: tabBarPad }]}
        keyboardShouldPersistTaps="handled"
      >
        <PawCircleSearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search members"
          onClear={() => setQuery('')}
        />

        <View style={styles.sortRow}>
          <Text style={[styles.sortLabel, { color: colors.textTertiary }]}>Sort by</Text>
          <SortPicker
            value={sort}
            onChange={setSort}
            surface={colors.surface}
            border={colors.border}
            text={colors.primary}
            sub={colors.textSecondary}
          />
        </View>

        <PawCircleHairline />

        {isCreator && requests.length > 0 && (
          <>
            <View style={styles.sectionHead}>
              <PawCircleSectionLabel>Pending requests</PawCircleSectionLabel>
              <Pressable
                onPress={acceptAll}
                style={({ pressed }) => [styles.acceptAllBtn, pressed && styles.rowPressed]}
              >
                <Text style={[styles.acceptAllText, { color: colors.primary }]}>Accept all</Text>
              </Pressable>
            </View>
            <View style={styles.listGroup}>
              {requests.map((req, index) => (
                <JoinRequestRow
                  key={req.id}
                  request={req}
                  onApprove={() => approveRequest(req)}
                  onDecline={() => declineRequest(req)}
                  onPressProfile={() => openProfile(req.userId)}
                  showDivider={index < requests.length - 1}
                  layout="list"
                />
              ))}
            </View>
          </>
        )}

        <PawCircleSectionLabel>
          {`${displayed.length} ${displayed.length === 1 ? 'member' : 'members'}`}
        </PawCircleSectionLabel>

        <View style={styles.listGroup}>
          {displayed.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No members found</Text>
            </View>
          ) : (
            displayed.map((item, index) => {
              const showRemove = isCreator && item.userId !== user?.id;
              const avatarUser = circleMemberToAvatarUser(item);

              return (
                <View key={item.userId}>
                  <Pressable
                    onPress={() => openProfile(item.userId)}
                    style={({ pressed }) => [styles.memberRow, pressed && styles.rowPressed]}
                  >
                    <Avatar user={avatarUser} size={40} />
                    <View style={styles.rowBody}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.role === 'admin' && (
                          <Text style={[styles.adminTag, { color: colors.primary }]}>Admin</Text>
                        )}
                      </View>
                      <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        @{item.handle}
                      </Text>
                    </View>
                    {showRemove ? (
                      <View style={styles.rowTrailing}>
                        <IconButton
                          name="close"
                          size={30}
                          tone="ghost"
                          color={colors.textTertiary}
                          onPress={() => confirmRemoveMember(item.userId, item.name)}
                        />
                      </View>
                    ) : (
                      <View style={styles.rowTrailing}>
                        <Icon name="chevronRight" size={16} color={colors.textTertiary} />
                      </View>
                    )}
                  </Pressable>
                  {index < displayed.length - 1 && (
                    <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>

    <Toast data={toast} onHide={() => setToast(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  sortLabel: { fontSize: 15 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  sortBtnText: { fontSize: 15, fontWeight: '500' },
  sortScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sortSheet: {
    width: '100%',
    maxWidth: 280,
    borderRadius: radius.xl,
    overflow: 'hidden',
    paddingVertical: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  sortSheetTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  sortOptionText: { fontSize: 16, fontWeight: '400' },
  listGroup: {
    gap: 0,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 11,
    minHeight: 60,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  acceptAllBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  acceptAllText: { fontSize: 13, fontWeight: '700' },
  rowBody: { flex: 1, gap: 2, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { fontSize: 16, fontWeight: '500', flexShrink: 1, letterSpacing: -0.2 },
  adminTag: { fontSize: 12, fontWeight: '600' },
  rowMeta: { fontSize: 13 },
  rowTrailing: {
    alignSelf: 'center',
    flexShrink: 0,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: AVATAR_INSET,
  },
  rowPressed: { opacity: 0.55 },
  emptyRow: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyText: { fontSize: 14 },
});
