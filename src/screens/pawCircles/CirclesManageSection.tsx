import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Platform, Modal, ScrollView,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, sheetLayout, spacing, typography } from '../../theme/tokens';
import { HubToggleBar } from '../../components/ui/HubToggleBar';
import { Avatar } from '../../components/ui/Avatar';
import { CircleAvatar } from '../../components/ui/CircleAvatar';
import { IconButton } from '../../components/ui/Button';
import { ModalPresent } from '../../components/ui/ModalScrim';
import { Icon } from '../../components/icons/Icon';
import { CirclePrivacy, PawCircle } from '../../data/pawCircles';
import { JoinRequestsSheet } from '../../components/JoinRequestsSheet';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { PawCircleSectionLabel, CirclePrivacyLockIcon } from './PawCircleChrome';
import { useCircleMembers, circleMemberToAvatarUser, type CircleMemberProfile } from '../../hooks/useCircleMembers';
import { useCircleJoinRequests } from '../../hooks/useCircleJoinRequests';
import { useAuth } from '../../context/AuthContext';
import { usePawCircles } from '../../context/PawCircleContext';
import { supabase } from '../../lib/supabase';
import { runJoinRequestAction, runJoinRequestActionsBatch } from '../../lib/joinRequestActions';
import { PENDING_JOIN_REQUESTS_A11Y_LABEL, PENDING_JOIN_REQUESTS_ICON } from '../../lib/groupChrome';

type FilterId = 'all' | 'created' | 'joined';
type MemberSortId = 'name' | 'joined';

const MEMBER_SORT_OPTIONS: { id: MemberSortId; label: string }[] = [
  { id: 'name', label: 'Alphabetically' },
  { id: 'joined', label: 'Date added' },
];


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
  onOpenChat,
  onOpenSettings,
}: {
  circle: PawCircle;
  isCreated: boolean;
  joinRequestsResetKey?: number;
  onOpenChat: () => void;
  onOpenSettings: () => void;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { updateCircle, resolveCircleDbId, refreshMembership, pendingCountByCircle, pendingIncomingJoinRows, dismissPendingJoinRequest } = usePawCircles();
  const circleDbId = resolveCircleDbId(circle.id);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [privacy, setPrivacy] = useState<CirclePrivacy>(circle.privacy ?? 'open');
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);

  const seedRows = useMemo(
    () => (circleDbId
      ? pendingIncomingJoinRows.filter(r => r.circle_id === circleDbId)
      : []),
    [circleDbId, pendingIncomingJoinRows],
  );

  const { members, refresh: refreshMembers } = useCircleMembers(circleDbId);
  const { requests, loading: requestsLoading, refresh: refreshRequests, dismissRequest } = useCircleJoinRequests(
    isCreated ? circleDbId : null,
    seedRows,
  );

  const expectedPendingCount = circleDbId ? (pendingCountByCircle[circleDbId] ?? 0) : 0;
  const resyncRequests = async () => {
    await Promise.all([refreshRequests(), refreshMembers(), refreshMembership()]);
  };

  const dismissOne = (reqId: string) => {
    dismissRequest(reqId);
    if (circleDbId) dismissPendingJoinRequest(reqId, circleDbId);
  };

  const pendingRequests = Math.max(requests.length, expectedPendingCount);

  useEffect(() => {
    if (requests.length === 0) setRequestsOpen(false);
  }, [requests.length]);

  const removeMember = async (userId: string) => {
    if (!circleDbId) return;
    await supabase.rpc('remove_circle_member' as any, {
      p_circle_id: circleDbId,
      p_user_id: userId,
    });
    refreshMembers();
  };

  const metaLine = `${isCreated ? 'Creator' : 'Member'} · ${members.length} ${members.length === 1 ? 'member' : 'members'}`;
  const chatPreview = 'Say hello to your circle!';
  const hasUnread = false;

  return (
    <View style={styles.manageCard}>
      <View style={styles.manageHeader}>
        <CircleAvatar circle={circle} size={44} iconSize={20} label={circle.name} />

        <View style={styles.manageMeta}>
          <View style={styles.manageTitleRow}>
            <Text style={[styles.manageName, { color: colors.text }]} numberOfLines={1}>
              {circle.name}
            </Text>
            {!isCreated ? <CirclePrivacyLockIcon privacy={circle.privacy} size={13} /> : null}
            {isCreated && (
              <PrivacyDropdown
                value={privacy}
                onChange={v => {
                  setPrivacy(v);
                  updateCircle(circle.id, { privacy: v });
                }}
              />
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
            <Icon name="chevronRight" size={16} color={colors.textTertiary} />
          </View>
        </View>
      </Pressable>

      <View style={styles.manageFooter}>
        <MemberAvatarStrip
          circleName={circle.name}
          members={members}
          canRemoveMembers={isCreated}
          currentUserId={user?.id}
          onRemoveMember={(userId) => {
            const member = members.find(m => m.userId === userId);
            if (member) setRemoveTarget({ userId, name: member.name });
          }}
        />
        <View style={styles.footerActions}>
          {pendingRequests > 0 && (
            <IconButton
              name={PENDING_JOIN_REQUESTS_ICON}
              size={36}
              tone="soft"
              color={colors.primary}
              count={pendingRequests}
              accessibilityLabel={PENDING_JOIN_REQUESTS_A11Y_LABEL}
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
        loading={requestsLoading}
        onApprove={req => {
          runJoinRequestAction('accept', req, () => dismissOne(req.id), resyncRequests);
        }}
        onDecline={req => {
          runJoinRequestAction('decline', req, () => dismissOne(req.id), async () => {
            await Promise.all([refreshRequests(), refreshMembership()]);
          });
        }}
        onAcceptAll={() => {
          runJoinRequestActionsBatch('accept', requests, () => {
            for (const req of requests) dismissOne(req.id);
          }, resyncRequests);
        }}
      />

      <ConfirmDialog
        visible={!!removeTarget}
        title="Remove member?"
        body={removeTarget
          ? `Remove ${removeTarget.name} from this circle? They will need to join again.`
          : ''}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) void removeMember(removeTarget.userId);
          setRemoveTarget(null);
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
  const { colors } = useTheme();
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

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <ModalPresent onDismiss={() => setOpen(false)} style={styles.privacyScrim}>
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
        </ModalPresent>
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
  const { colors } = useTheme();
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

      <Modal visible={sortOpen} transparent animationType="none" onRequestClose={() => setSortOpen(false)}>
        <ModalPresent onDismiss={() => setSortOpen(false)} style={styles.sortScrim}>
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
        </ModalPresent>
      </Modal>
    </>
  );
}

function MemberAvatarStrip({
  circleName,
  members,
  canRemoveMembers,
  currentUserId,
  onRemoveMember,
}: {
  circleName: string;
  members: CircleMemberProfile[];
  canRemoveMembers?: boolean;
  currentUserId?: string;
  onRemoveMember?: (userId: string) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<MemberSortId>('name');
  const stripAvatars = members.slice(0, 3);
  const extraCount = Math.max(0, members.length - 3);
  const plusLabel = extraCount > 0 ? `+${extraCount}` : '+';

  const closeSheet = () => {
    setOpen(false);
    setQuery('');
    setSort('name');
  };

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = members;
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
  }, [members, query, sort]);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`View members of ${circleName}`}
        style={styles.memberStrip}
      >
        {stripAvatars.map((m, i) => (
          <View
            key={m.userId}
            style={[
              styles.memberAvatarWrap,
              i > 0 && styles.memberAvatarOverlap,
              { zIndex: stripAvatars.length - i, borderColor: colors.surface },
            ]}
          >
            <Avatar user={circleMemberToAvatarUser(m)} size={28} />
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

      <Modal visible={open} transparent animationType="none" onRequestClose={closeSheet}>
        <ModalPresent onDismiss={closeSheet} style={styles.memberScrim} animatedScale={false}>
          <View style={[styles.memberSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.memberSheetTitle, { color: colors.text }]}>{circleName}</Text>
            <Text style={[styles.memberSheetSub, { color: colors.textSecondary }]}>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </Text>

            <View style={[styles.memberSheetSearch, { borderBottomColor: colors.border }]}>
              <Icon name="search" size={18} color={colors.textTertiary} />
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
              {displayed.map((m, index) => (
                <View key={m.userId}>
                  <View style={styles.memberSheetRow}>
                    <Avatar user={circleMemberToAvatarUser(m)} size={36} />
                    <View style={styles.memberSheetMeta}>
                      <Text style={[styles.memberSheetName, { color: colors.text }]} numberOfLines={1}>
                        {m.name}
                      </Text>
                      <Text style={[styles.memberSheetDetail, { color: colors.textSecondary }]} numberOfLines={1}>
                        @{m.handle}
                      </Text>
                    </View>
                    {canRemoveMembers && m.userId !== currentUserId && onRemoveMember && (
                      <IconButton
                        name="close"
                        size={40}
                        iconSize={20}
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
              ))}
            </ScrollView>
          </View>
        </ModalPresent>
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
