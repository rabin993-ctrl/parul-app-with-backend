import React, { useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Modal, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from '../../components/ui/Avatar';
import { IconButton } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { radius, spacing } from '../../theme/tokens';
import { usePawCircles } from '../../context/PawCircleContext';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { CircleMember, getCircleMembers, getJoinRequests } from '../../data/pawCircleChat';
import { JoinRequestRow } from '../../components/JoinRequestsSheet';
import { users } from '../../data/mockData';
import { Toast, ToastData } from '../../components/ui/Toast';
import { CircleHeroCard, EditCircleSheet } from './CircleHeroCard';
import {
  PawCircleHairline,
  PawCirclePageHeader,
  PawCircleSearchField,
  PawCircleSectionLabel,
  pawCircleStyles,
} from './PawCircleChrome';

type Route = RouteProp<CirclesStackParamList, 'CircleMembers'>;
type Nav = NativeStackNavigationProp<CirclesStackParamList, 'CircleMembers'>;
type SortId = 'name' | 'joined';

const AVATAR_INSET = 68;

const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: 'name', label: 'Alphabetically' },
  { id: 'joined', label: 'Date added' },
];

const MONTH_INDEX: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

function joinedSortKey(joinedAt: string): number {
  const lower = joinedAt.toLowerCase();
  if (lower.includes('today')) return 1_000_000;
  if (lower.includes('yesterday')) return 999_999;
  if (lower.includes('this week')) return 999_000;
  const rel = joinedAt.match(/(\d+)\s*(m|h|d)/i);
  if (rel) {
    const n = parseInt(rel[1], 10);
    const unit = rel[2].toLowerCase();
    if (unit === 'm') return 900_000 - n;
    if (unit === 'h') return 950_000 - n * 60;
    if (unit === 'd') return 980_000 - n * 1440;
  }
  const abs = joinedAt.match(/([A-Za-z]+)\s+(\d{4})/);
  if (abs) {
    return parseInt(abs[2], 10) * 100 + (MONTH_INDEX[abs[1]] ?? 0);
  }
  return 0;
}

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
  const { scrim } = useTheme();
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

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.sortScrim, { backgroundColor: scrim }]} onPress={() => setOpen(false)}>
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
        </Pressable>
      </Modal>
    </>
  );
}

export function CircleMembersScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { circleId } = route.params;
  const { getCircle, createdCircles, updateCircle } = usePawCircles();
  const circle = getCircle(circleId);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortId>('name');
  const [memberList, setMemberList] = useState<CircleMember[]>(() => getCircleMembers(circleId, circle));
  const [requests, setRequests] = useState(() => getJoinRequests(circleId));
  const [editOpen, setEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const tabBarPad = useTabBarScrollPadding();

  const isCreator = createdCircles.some(c => c.id === circleId);

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = memberList;
    if (q) {
      list = list.filter(m => {
        const u = users[m.userId];
        return u?.name.toLowerCase().includes(q) || u?.handle.toLowerCase().includes(q);
      });
    }
    const sorted = [...list];
    if (sort === 'name') {
      sorted.sort((a, b) => {
        const an = users[a.userId]?.name ?? '';
        const bn = users[b.userId]?.name ?? '';
        return an.localeCompare(bn);
      });
    } else {
      sorted.sort((a, b) => joinedSortKey(b.joinedAt) - joinedSortKey(a.joinedAt));
    }
    return sorted;
  }, [memberList, query, sort]);

  const openProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  const removeMember = (userId: string) => {
    setMemberList(ms => ms.filter(m => m.userId !== userId));
  };

  const saveEdit = async (name: string, bio: string) => {
    if (!name.trim()) return;
    setSavingEdit(true);
    await updateCircle(circleId, { name, bio });
    setSavingEdit(false);
    setEditOpen(false);
    setToast({ msg: 'Circle updated', icon: 'check', tone: 'success' });
  };

  if (!circle) return null;

  const displayBio = circle.bio ?? circle.tagline ?? '';

  return (
    <>
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCirclePageHeader title="Members" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[pawCircleStyles.detailScroll, { paddingBottom: tabBarPad }]}
        keyboardShouldPersistTaps="handled"
      >
        <CircleHeroCard
          circle={circle}
          bio={displayBio}
          canEdit={isCreator}
          onEdit={() => setEditOpen(true)}
        />

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
                onPress={() => setRequests([])}
                style={({ pressed }) => [styles.acceptAllBtn, pressed && styles.rowPressed]}
              >
                <Text style={[styles.acceptAllText, { color: colors.primary }]}>Accept all</Text>
              </Pressable>
            </View>
            <View style={styles.listGroup}>
              {requests.map((req, index) => (
                <JoinRequestRow
                  key={req.userId}
                  request={req}
                  onApprove={() => setRequests(r => r.filter(x => x.userId !== req.userId))}
                  onDecline={() => setRequests(r => r.filter(x => x.userId !== req.userId))}
                  onPressProfile={() => openProfile(req.userId)}
                  showDivider={index < requests.length - 1}
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
              const u = users[item.userId];
              if (!u) return null;
              const showRemove = isCreator && item.userId !== 'you';

              return (
                <View key={item.userId}>
                  <Pressable
                    onPress={() => openProfile(item.userId)}
                    style={({ pressed }) => [styles.memberRow, pressed && styles.rowPressed]}
                  >
                    <Avatar user={u} size={40} />
                    <View style={styles.rowBody}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                          {u.name}
                        </Text>
                        {item.role === 'admin' && (
                          <Text style={[styles.adminTag, { color: colors.primary }]}>Admin</Text>
                        )}
                      </View>
                      <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        @{u.handle} · {u.companions} companion{u.companions !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {showRemove ? (
                      <IconButton
                        name="close"
                        size={30}
                        tone="ghost"
                        color={colors.textTertiary}
                        onPress={() => removeMember(item.userId)}
                      />
                    ) : (
                      <Icon name="chevronRight" size={16} color={colors.textTertiary} />
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

    <EditCircleSheet
      visible={editOpen}
      circle={circle}
      onClose={() => setEditOpen(false)}
      onSave={saveEdit}
      saving={savingEdit}
    />
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
    alignItems: 'center',
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
