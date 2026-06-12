import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Platform, Modal, ScrollView,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, sheetLayout, spacing, typography } from '../../theme/tokens';
import { HubToggleBar } from '../../components/ui/HubToggleBar';
import { Avatar } from '../../components/ui/Avatar';
import { IconButton } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { CirclePrivacy, PawCircle } from '../../data/pawCircles';
import {
  CircleMember, getCircleMembers, getCirclePreview, getJoinRequests,
} from '../../data/pawCircleChat';
import { JoinRequestsSheet } from '../../components/JoinRequestsSheet';
import { users } from '../../data/mockData';
import { PawCircleSectionLabel } from './PawCircleChrome';

type FilterId = 'all' | 'created' | 'joined';
type MemberSortId = 'name' | 'joined';

const MEMBER_SORT_OPTIONS: { id: MemberSortId; label: string }[] = [
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

type CircleManageSectionProps = {
  circles: PawCircle[];
  createdIds: Set<string>;
  joinRequestsResetKey?: number;
  onOpenChat: (circleId: string) => void;
  onOpenSettings: (circleId: string) => void;
};

export function CirclesManageSection({
  circles,
  createdIds,
  joinRequestsResetKey = 0,
  onOpenChat,
  onOpenSettings,
}: CircleManageSectionProps) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<FilterId>('all');

  const filtered = useMemo(() => circles.filter(c => {
    if (filter === 'created' && !createdIds.has(c.id)) return false;
    if (filter === 'joined' && createdIds.has(c.id)) return false;
    return true;
  }), [circles, createdIds, filter]);

  const filters: { id: FilterId; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'created', label: 'Yours' },
    { id: 'joined', label: 'Joined' },
  ];

  return (
    <View style={styles.panel}>
      <PawCircleSectionLabel>Your circles</PawCircleSectionLabel>

      <HubToggleBar
        items={filters}
        value={filter}
        onChange={id => setFilter(id as FilterId)}
        bordered={false}
        style={styles.hubToggle}
      />

      {filtered.length === 0 ? (
        <View style={styles.emptyInner}>
          <Icon name="circles" size={22} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No circles in this filter
          </Text>
        </View>
      ) : (
        <View style={styles.flatList}>
          {filtered.map(c => (
            <CircleManageCard
              key={c.id}
              circle={c}
              isCreated={createdIds.has(c.id)}
              joinRequestsResetKey={joinRequestsResetKey}
              onOpenChat={() => onOpenChat(c.id)}
              onOpenSettings={() => onOpenSettings(c.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function CircleManageCard({
  circle,
  isCreated,
  joinRequestsResetKey,
  onOpenChat,
  onOpenSettings,
}: {
  circle: PawCircle;
  isCreated: boolean;
  joinRequestsResetKey: number;
  onOpenChat: () => void;
  onOpenSettings: () => void;
}) {
  const { colors, iconBg } = useTheme();
  const preview = getCirclePreview(circle.id);
  const [requests, setRequests] = useState(() => (isCreated ? getJoinRequests(circle.id) : []));
  const [requestsOpen, setRequestsOpen] = useState(false);
  const pendingRequests = requests.length;
  const [privacy, setPrivacy] = useState<CirclePrivacy>(circle.privacy ?? 'open');
  const [circleMembers, setCircleMembers] = useState(() => getCircleMembers(circle.id, circle));

  const removeMember = (userId: string) => {
    setCircleMembers(ms => ms.filter(m => m.userId !== userId));
  };

  useEffect(() => {
    if (requests.length === 0) setRequestsOpen(false);
  }, [requests.length]);

  useEffect(() => {
    setRequests(isCreated ? getJoinRequests(circle.id) : []);
    setRequestsOpen(false);
  }, [joinRequestsResetKey, circle.id, isCreated]);

  const metaLine = `${isCreated ? 'Creator' : 'Member'} · ${circleMembers.length} ${circleMembers.length === 1 ? 'member' : 'members'}`;
  const chatPreview = preview.lastMessage || 'Say hello to your circle!';
  const memberUsers = circleMembers
    .map(m => users[m.userId])
    .filter(Boolean)
    .slice(0, 3);
  const hasUnread = preview.unread > 0;

  return (
    <View style={styles.manageCard}>
      <View style={styles.manageHeader}>
        <View style={[styles.manageIcon, { backgroundColor: iconBg(circle.iconBg) }]}>
          <Icon
            name={circle.icon}
            size={20}
            color={circle.tint}
            fill={circle.icon === 'paw' || circle.icon === 'cat' ? circle.tint : 'none'}
          />
        </View>

        <View style={styles.manageMeta}>
          <View style={styles.manageTitleRow}>
            <Text style={[styles.manageName, { color: colors.text }]} numberOfLines={1}>
              {circle.name}
            </Text>
            {isCreated && (
              <PrivacyDropdown value={privacy} onChange={setPrivacy} />
            )}
          </View>
          <Text style={[styles.metaLine, { color: colors.textSecondary }]} numberOfLines={1}>
            {metaLine}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onOpenChat}
        accessibilityRole="button"
        accessibilityLabel={`Open chat for ${circle.name}`}
        style={({ pressed }) => [
          styles.chatRow,
          {
            backgroundColor: hasUnread ? colors.primary + '10' : colors.primary + '06',
            opacity: pressed ? 0.78 : 1,
          },
          Platform.OS === 'web' && styles.chatRowWeb,
        ]}
      >
        <View style={styles.chatRowMain}>
          <Text
            style={[
              styles.chatPreviewText,
              {
                color: hasUnread ? colors.text : colors.textSecondary,
                fontWeight: hasUnread ? '700' : '500',
              },
            ]}
            numberOfLines={2}
          >
            {chatPreview}
          </Text>
          <View style={styles.chatRowTrail}>
            {hasUnread && (
              <View style={[styles.chatUnread, { backgroundColor: colors.primary }]}>
                <Text style={[styles.chatUnreadText, { color: colors.onPrimary }]}>
                  {preview.unread}
                </Text>
              </View>
            )}
            <Icon name="chevronRight" size={16} color={colors.textTertiary} />
          </View>
        </View>
      </Pressable>

      <View style={styles.manageFooter}>
        <MemberAvatarStrip
          circleName={circle.name}
          members={memberUsers}
          circleMembers={circleMembers}
          extraCount={Math.max(0, circleMembers.length - memberUsers.length)}
          canRemoveMembers={isCreated}
          onRemoveMember={removeMember}
        />
        <View style={styles.footerActions}>
          {pendingRequests > 0 && (
            <IconButton
              name="user"
              size={36}
              tone="soft"
              color={colors.primary}
              count={pendingRequests}
              onPress={() => setRequestsOpen(true)}
            />
          )}
          <IconButton
            name="settings"
            size={36}
            tone="soft"
            color={colors.textSecondary}
            onPress={onOpenSettings}
          />
        </View>
      </View>

      <JoinRequestsSheet
        visible={requestsOpen}
        onClose={() => setRequestsOpen(false)}
        circleName={circle.name}
        requests={requests}
        onApprove={userId => setRequests(r => r.filter(x => x.userId !== userId))}
        onDecline={userId => setRequests(r => r.filter(x => x.userId !== userId))}
        onAcceptAll={() => {
          setRequests([]);
          setRequestsOpen(false);
        }}
      />
    </View>
  );
}

const PRIVACY_OPTIONS: { id: CirclePrivacy; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'request', label: 'Request' },
];

function PrivacyDropdown({
  value,
  onChange,
}: {
  value: CirclePrivacy;
  onChange: (v: CirclePrivacy) => void;
}) {
  const { colors, scrim } = useTheme();
  const [open, setOpen] = useState(false);
  const current = PRIVACY_OPTIONS.find(o => o.id === value) ?? PRIVACY_OPTIONS[0];

  const pick = (id: CirclePrivacy) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.privacyChip, { backgroundColor: colors.primary + '12' }]}
      >
        <Icon name="shield" size={10} color={colors.primary} />
        <Text style={[styles.privacyChipText, { color: colors.text }]}>{current.label}</Text>
        <Icon name="chevronDown" size={10} color={colors.textTertiary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.privacyScrim, { backgroundColor: scrim }]} onPress={() => setOpen(false)}>
          <View style={[styles.privacySheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.privacySheetTitle, { color: colors.textSecondary }]}>Circle privacy</Text>
            {PRIVACY_OPTIONS.map(opt => {
              const active = value === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => pick(opt.id)}
                  style={[
                    styles.privacyMenuItem,
                    active && { backgroundColor: colors.primary + '14' },
                  ]}
                >
                  <Text style={[
                    styles.privacyMenuItemText,
                    { color: active ? colors.primary : colors.text },
                  ]}>
                    {opt.label}
                  </Text>
                  {active && <Icon name="check" size={14} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MemberSortPicker({
  value,
  onChange,
}: {
  value: MemberSortId;
  onChange: (id: MemberSortId) => void;
}) {
  const { colors, scrim } = useTheme();
  const [sortOpen, setSortOpen] = useState(false);

  const pick = (id: MemberSortId) => {
    onChange(id);
    setSortOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setSortOpen(true)}
        style={[styles.sortBtn, { backgroundColor: colors.primary + '10' }]}
      >
        <Icon name="sliders" size={12} color={colors.textSecondary} />
        <Text style={[styles.sortBtnText, { color: colors.textSecondary }]}>Sort</Text>
        <Icon name="chevronDown" size={10} color={colors.textTertiary} />
      </Pressable>

      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={[styles.sortScrim, { backgroundColor: scrim }]} onPress={() => setSortOpen(false)}>
          <View style={[styles.sortSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sortSheetTitle, { color: colors.textSecondary }]}>Sort by</Text>
            {MEMBER_SORT_OPTIONS.map(opt => {
              const active = value === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => pick(opt.id)}
                  style={[styles.sortOption, active && { backgroundColor: colors.primary + '14' }]}
                >
                  <Text style={[styles.sortOptionText, { color: active ? colors.primary : colors.text }]}>
                    {opt.label}
                  </Text>
                  {active && <Icon name="check" size={14} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MemberAvatarStrip({
  circleName,
  members,
  circleMembers,
  extraCount,
  canRemoveMembers,
  onRemoveMember,
}: {
  circleName: string;
  members: { id: string; name: string; tint: string }[];
  circleMembers: CircleMember[];
  extraCount: number;
  canRemoveMembers?: boolean;
  onRemoveMember?: (userId: string) => void;
}) {
  const { colors, scrim } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<MemberSortId>('name');
  const plusLabel = extraCount > 0 ? `+${extraCount}` : '+';

  const closeSheet = () => {
    setOpen(false);
    setQuery('');
    setSort('name');
  };

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = circleMembers;
    if (q) {
      list = list.filter(m => {
        const u = users[m.userId];
        return u?.name.toLowerCase().includes(q) || u?.handle.toLowerCase().includes(q);
      });
    }
    const sorted = [...list];
    if (sort === 'name') {
      sorted.sort((a, b) => (users[a.userId]?.name ?? '').localeCompare(users[b.userId]?.name ?? ''));
    } else {
      sorted.sort((a, b) => joinedSortKey(b.joinedAt) - joinedSortKey(a.joinedAt));
    }
    return sorted;
  }, [circleMembers, query, sort]);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`View members of ${circleName}`}
        style={styles.memberStrip}
      >
        {members.map((u, i) => (
          <View
            key={u.id}
            style={[
              styles.memberAvatarWrap,
              i > 0 && styles.memberAvatarOverlap,
              { zIndex: members.length - i, borderColor: colors.surface },
            ]}
          >
            <Avatar user={u} size={28} />
          </View>
        ))}
        <View style={[
          styles.memberPlus,
          extraCount > 0 && styles.memberPlusCount,
          extraCount >= 10 && styles.memberPlusCountWide,
          members.length > 0 && styles.memberPlusGap,
          {
            backgroundColor: extraCount > 0 ? colors.primary : colors.infoBg,
            borderColor: colors.surface,
          },
        ]}>
          <Text style={[
            styles.memberPlusText,
            {
              color: extraCount > 0 ? colors.onPrimary : colors.primary,
              fontSize: extraCount > 0 ? (extraCount >= 10 ? 10 : 11) : 13,
            },
          ]}>
            {plusLabel}
          </Text>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeSheet}>
        <View style={[styles.memberScrim, { backgroundColor: scrim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
          <View style={[styles.memberSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.memberSheetTitle, { color: colors.text }]}>{circleName}</Text>
            <Text style={[styles.memberSheetSub, { color: colors.textSecondary }]}>
              {circleMembers.length} {circleMembers.length === 1 ? 'member' : 'members'}
            </Text>

            <View style={[styles.memberSheetSearch, { borderBottomColor: colors.border }]}>
              <Icon name="search" size={15} color={colors.textTertiary} />
              <TextInput
                style={[styles.memberSheetSearchInput, { color: colors.text }]}
                placeholder="Search members"
                placeholderTextColor={colors.textTertiary}
                value={query}
                onChangeText={setQuery}
              />
              <MemberSortPicker value={sort} onChange={setSort} />
            </View>

            <ScrollView
              style={styles.memberSheetScroll}
              contentContainerStyle={styles.memberSheetScrollContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {displayed.map((m, index) => {
                const u = users[m.userId];
                if (!u) return null;
                return (
                  <View key={m.userId}>
                    <View style={styles.memberSheetRow}>
                      <Avatar user={u} size={36} />
                      <View style={styles.memberSheetMeta}>
                        <Text style={[styles.memberSheetName, { color: colors.text }]} numberOfLines={1}>
                          {u.name}
                        </Text>
                        <Text style={[styles.memberSheetDetail, { color: colors.textSecondary }]} numberOfLines={1}>
                          @{u.handle} · {u.companions} companion{u.companions !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      {canRemoveMembers && m.userId !== 'you' && onRemoveMember && (
                        <IconButton
                          name="close"
                          size={30}
                          tone="ghost"
                          color={colors.textTertiary}
                          onPress={() => onRemoveMember(m.userId)}
                        />
                      )}
                    </View>
                    {index < displayed.length - 1 && (
                      <View style={[styles.memberSheetDivider, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm,
  },
  hubToggle: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: spacing.xs,
  },
  flatList: {
    gap: spacing.lg,
  },
  emptyInner: {
    alignItems: 'center',
    paddingVertical: spacing.xl2,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: { ...typography.small, textAlign: 'center' },
  manageCard: {
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  manageHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  manageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageMeta: { flex: 1, gap: 3, minWidth: 0 },
  manageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  manageName: { ...typography.title, flex: 1, minWidth: 0 },
  metaLine: { ...typography.meta },
  privacyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    flexShrink: 0,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  privacyChipText: { fontSize: 10.5, fontWeight: '700' },
  privacyScrim: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl2,
  },
  privacySheet: {
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
  privacySheetTitle: {
    ...typography.sectionLabel,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  privacyMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  privacyMenuItemText: { fontSize: 15, fontWeight: '600' },
  chatRow: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 3,
  },
  chatRowWeb: { cursor: 'pointer' as const },
  chatRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chatPreviewText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
  },
  chatRowTrail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  chatUnread: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  chatUnreadText: {
    fontSize: 11,
    fontWeight: '700',
  },
  manageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  memberStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  memberAvatarWrap: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  memberAvatarOverlap: {
    marginLeft: -8,
  },
  memberPlus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    flexShrink: 0,
  },
  memberPlusCount: {
    width: undefined,
    minWidth: 30,
    paddingHorizontal: 7,
    borderRadius: radius.full,
  },
  memberPlusCountWide: {
    minWidth: 36,
    paddingHorizontal: 8,
  },
  memberPlusGap: {
    marginLeft: 2,
  },
  memberPlusText: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  memberScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
    paddingBottom: spacing.xl2,
  },
  memberSheet: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    maxHeight: `${Math.round(sheetLayout.maxHeightRatio * 100)}%`,
    width: '100%',
    zIndex: 1,
    flexDirection: 'column',
  },
  memberSheetTitle: {
    ...typography.title,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  memberSheetSub: {
    ...typography.meta,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    marginTop: 2,
  },
  memberSheetSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingBottom: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberSheetSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  memberSheetScroll: {
    flexGrow: 1,
    flexShrink: 1,
    maxHeight: sheetLayout.listScrollMax,
    ...Platform.select({
      web: { overflowY: 'auto' as const, minHeight: 0 },
      default: {},
    }),
  },
  memberSheetScrollContent: {
    paddingBottom: spacing.md,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.full,
    flexShrink: 0,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  sortBtnText: { fontSize: 11.5, fontWeight: '700' },
  sortScrim: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl2,
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
    ...typography.sectionLabel,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sortOptionText: { fontSize: 15, fontWeight: '600' },
  memberSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  memberSheetMeta: { flex: 1, gap: 2, minWidth: 0 },
  memberSheetName: { fontSize: 14, fontWeight: '700' },
  memberSheetDetail: { ...typography.meta },
  memberSheetDivider: { height: StyleSheet.hairlineWidth, marginLeft: 63 },
});
