import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, Modal, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from '../../components/ui/Avatar';
import { Button, IconButton } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
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
import { runJoinRequestAction, runJoinRequestActionsBatch } from '../../lib/joinRequestActions';
import { filterUsersByQuery, type SearchUserResult } from '../../utils/feedSearch';
import { escapeIlikePattern, parseSearchTokens } from '../../utils/textSearch';

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
  const {
    getCircle,
    createdCircles,
    resolveCircleDbId,
    refreshMembership,
    pendingCountByCircle,
    pendingIncomingJoinRows,
    sendCircleInvite,
    dismissPendingJoinRequest,
  } = usePawCircles();
  const { user } = useAuth();
  const circle = getCircle(circleId);
  const circleDbId = resolveCircleDbId(circleId);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortId>('name');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<SearchUserResult[]>([]);
  const [invitedUserIds, setInvitedUserIds] = useState<Set<string>>(() => new Set());
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const tabBarPad = useTabBarScrollPadding();

  const isAdmin = createdCircles.some(c => c.id === circleId);
  const expectedPendingCount = circleDbId ? (pendingCountByCircle[circleDbId] ?? 0) : 0;
  const seedRows = useMemo(
    () => (circleDbId
      ? pendingIncomingJoinRows.filter(r => r.circle_id === circleDbId)
      : []),
    [circleDbId, pendingIncomingJoinRows],
  );

  const { members: memberList, refresh: refreshMembers } = useCircleMembers(circleDbId);
  const { requests, loading: requestsLoading, refresh: refreshRequests, dismissRequest } = useCircleJoinRequests(
    isAdmin ? circleDbId : null,
    seedRows,
  );

  const pendingCount = Math.max(requests.length, expectedPendingCount);
  const showPendingSection = isAdmin && (pendingCount > 0 || requestsLoading);

  const resyncRequests = async () => {
    await Promise.all([refreshRequests(), refreshMembers(), refreshMembership()]);
  };

  const dismissOne = (reqId: string) => {
    dismissRequest(reqId);
    if (circleDbId) dismissPendingJoinRequest(reqId, circleDbId);
  };

  const memberIds = useMemo(
    () => new Set(memberList.map(m => m.userId)),
    [memberList],
  );

  useEffect(() => {
    if (!isAdmin || !circleDbId) return;
    let cancelled = false;
    void (supabase as any)
      .from('circle_invites')
      .select('invitee_user_id')
      .eq('circle_id', circleDbId)
      .eq('state', 'pending')
      .then(({ data }: { data: { invitee_user_id: string }[] | null }) => {
        if (cancelled || !data) return;
        setInvitedUserIds(prev => {
          const next = new Set(prev);
          for (const row of data) next.add(row.invitee_user_id);
          return next;
        });
      });
    return () => {
      cancelled = true;
    };
  }, [circleDbId, isAdmin]);

  useEffect(() => {
    const tokens = parseSearchTokens(query);
    if (tokens.length === 0) {
      setRemoteUsers([]);
      return;
    }

    let cancelled = false;
    const primary = escapeIlikePattern(tokens[0]);
    void supabase
      .from('users')
      .select('id, name, handle, tint')
      .or(`name.ilike.%${primary}%,handle.ilike.%${primary}%`)
      .limit(40)
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data ?? []).map(row => ({
          id: row.id,
          name: row.name ?? row.handle ?? row.id.slice(0, 8),
          handle: row.handle ?? undefined,
          tint: row.tint ?? undefined,
        }));
        setRemoteUsers(filterUsersByQuery(rows, query));
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const inviteCandidates = useMemo(() => {
    const tokens = parseSearchTokens(query);
    if (tokens.length === 0) return [];

    return remoteUsers.filter(candidate => {
      if (memberIds.has(candidate.id)) return false;
      if (candidate.id === user?.id) return false;
      return true;
    });
  }, [memberIds, query, remoteUsers, user?.id]);

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
    setRemoveTarget({ userId, name });
  };

  const approveRequest = (req: CircleJoinRequestProfile) => {
    runJoinRequestAction('accept', req, () => dismissOne(req.id), resyncRequests);
  };

  const declineRequest = (req: CircleJoinRequestProfile) => {
    runJoinRequestAction('decline', req, () => dismissOne(req.id), async () => {
      await Promise.all([refreshRequests(), refreshMembership()]);
    });
  };

  const inviteConfirmMessage = (inviteeName: string) => {
    const circleName = circle?.name ?? 'this circle';
    if (isAdmin || circle?.privacy !== 'request') {
      return `Invite ${inviteeName} to ${circleName}?`;
    }
    return `Invite ${inviteeName} to ${circleName}? An admin will need to approve their membership.`;
  };

  const inviteUser = (candidate: SearchUserResult) => {
    const message = inviteConfirmMessage(candidate.name);

    const send = async () => {
      setInvitingUserId(candidate.id);
      try {
        await sendCircleInvite(circleId, candidate.id);
        setInvitedUserIds(prev => new Set(prev).add(candidate.id));
        setToast({ msg: `Invite sent to ${candidate.name}`, icon: 'check', tone: 'neutral' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not send invite';
        if (msg.toLowerCase().includes('invite already sent')) {
          setInvitedUserIds(prev => new Set(prev).add(candidate.id));
          setToast({ msg: 'Invite already sent', icon: 'check', tone: 'neutral' });
        } else if (msg.toLowerCase().includes('already a member')) {
          setToast({ msg: 'Already a member', icon: 'close', tone: 'neutral' });
        } else {
          setToast({ msg: 'Failed to send invite', icon: 'close', tone: 'neutral' });
        }
      } finally {
        setInvitingUserId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof globalThis.confirm === 'function' && !globalThis.confirm(message)) return;
      void send();
      return;
    }

    Alert.alert('Send invite', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Invite', onPress: () => { void send(); } },
    ]);
  };

  const acceptAll = () => {
    runJoinRequestActionsBatch('accept', requests, () => {
      for (const req of requests) dismissOne(req.id);
    }, resyncRequests);
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
          placeholder="Search or invite members"
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

        {showPendingSection && (
          <>
            <View style={styles.sectionHead}>
              <PawCircleSectionLabel>
                {requestsLoading && requests.length === 0 ? 'Pending requests…' : 'Pending requests'}
              </PawCircleSectionLabel>
              {!requestsLoading && requests.length > 1 ? (
                <Pressable
                  onPress={acceptAll}
                  style={({ pressed }) => [styles.acceptAllBtn, pressed && styles.rowPressed]}
                >
                  <Text style={[styles.acceptAllText, { color: colors.primary }]}>Accept all</Text>
                </Pressable>
              ) : null}
            </View>
            {requestsLoading && requests.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Loading requests…</Text>
              </View>
            ) : (
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
            )}
          </>
        )}

        <PawCircleSectionLabel>
          {`${displayed.length} ${displayed.length === 1 ? 'member' : 'members'}`}
        </PawCircleSectionLabel>

        <View style={styles.listGroup}>
          {displayed.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {query.trim() ? 'No matching members' : 'No members found'}
              </Text>
            </View>
          ) : (
            displayed.map((item, index) => {
              const showRemove = isAdmin && item.userId !== user?.id;
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
                          size={40}
                          iconSize={20}
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

        {inviteCandidates.length > 0 && (
          <>
            <PawCircleSectionLabel>Add to circle</PawCircleSectionLabel>
            <View style={styles.listGroup}>
              {inviteCandidates.map((candidate, index) => {
                const alreadyInvited = invitedUserIds.has(candidate.id);
                const avatarUser = {
                  id: candidate.id,
                  name: candidate.name,
                  tint: candidate.tint ?? colors.primary,
                };

                return (
                  <View key={candidate.id}>
                    <View style={styles.memberRow}>
                      <Pressable
                        onPress={() => openProfile(candidate.id)}
                        style={({ pressed }) => [
                          styles.inviteRowMain,
                          pressed && styles.rowPressed,
                        ]}
                      >
                        <Avatar user={avatarUser} size={40} />
                        <View style={styles.rowBody}>
                          <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                            {candidate.name}
                          </Text>
                          {candidate.handle ? (
                            <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                              @{candidate.handle}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                      <View style={styles.rowTrailing}>
                        {alreadyInvited ? (
                          <Text style={[styles.invitedLabel, { color: colors.textTertiary }]}>
                            Invited
                          </Text>
                        ) : (
                          <Button
                            size="sm"
                            variant="soft"
                            loading={invitingUserId === candidate.id}
                            disabled={invitingUserId !== null}
                            onPress={() => inviteUser(candidate)}
                          >
                            Invite
                          </Button>
                        )}
                      </View>
                    </View>
                    {index < inviteCandidates.length - 1 && (
                      <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>

    <Toast data={toast} onHide={() => setToast(null)} />

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
        if (removeTarget) void removeMember(removeTarget.userId, removeTarget.name);
        setRemoveTarget(null);
      }}
    />
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
  inviteRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minWidth: 0,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  invitedLabel: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 4,
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
