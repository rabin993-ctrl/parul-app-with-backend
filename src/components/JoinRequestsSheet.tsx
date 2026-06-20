import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { Icon } from './icons/Icon';
import { Sheet } from './ui/Sheet';
import {
  CircleJoinRequestProfile,
  joinRequestToAvatarUser,
  useHubCircleJoinRequests,
} from '../hooks/useCircleJoinRequests';
import { runJoinRequestAction, runJoinRequestActionsBatch } from '../lib/joinRequestActions';
import { usePawCircles } from '../context/PawCircleContext';
import { formatJoinRequestsTitle } from '../lib/groupChrome';
import { RelativeTime } from './ui/RelativeTime';

const REQUEST_ROW_H = 72;

export function JoinRequestActions({
  onApprove,
  onDecline,
}: {
  onApprove: () => void;
  onDecline: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.actions}>
      <Pressable
        onPress={onApprove}
        style={({ pressed }) => [
          styles.actionBtn,
          { backgroundColor: colors.primary + '18' },
          pressed && styles.actionPressed,
        ]}
        accessibilityLabel="Approve"
      >
        <Icon name="check" size={16} color={colors.primary} />
      </Pressable>
      <Pressable
        onPress={onDecline}
        style={({ pressed }) => [
          styles.actionBtn,
          { backgroundColor: colors.border },
          pressed && styles.actionPressed,
        ]}
        accessibilityLabel="Decline"
      >
        <Icon name="close" size={16} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

export function JoinRequestRow({
  request,
  onApprove,
  onDecline,
  onPressProfile,
  showDivider,
  showCircleName = false,
  layout = 'sheet',
}: {
  request: CircleJoinRequestProfile;
  onApprove: () => void;
  onDecline: () => void;
  onPressProfile?: () => void;
  showDivider?: boolean;
  /** When true, show which circle this request is for (hub inbox with multiple circles). */
  showCircleName?: boolean;
  /** `list` matches Members screen rows; `sheet` is the default padded sheet layout. */
  layout?: 'sheet' | 'list';
}) {
  const { colors } = useTheme();
  const avatarUser = joinRequestToAvatarUser(request);
  const circleLabel = showCircleName && request.circleName ? request.circleName : null;

  const invitedLine = request.invitedByName
    ? `Invited by ${request.invitedByName}`
    : null;
  const metaLine = invitedLine ?? request.note ?? `@${request.handle}`;
  const metaWithCircle = circleLabel ? `${circleLabel} · ${metaLine}` : metaLine;

  const profile = onPressProfile ? (
    <Pressable onPress={onPressProfile}>
      <Avatar user={avatarUser} size={40} />
    </Pressable>
  ) : (
    <Avatar user={avatarUser} size={40} />
  );

  const body = onPressProfile ? (
    <Pressable style={styles.rowBody} onPress={onPressProfile}>
      <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{request.name}</Text>
      <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={2}>
        {metaWithCircle}
      </Text>
      {request.time ? (
        <RelativeTime iso={request.time} style={[styles.rowTime, { color: colors.textTertiary }]} />
      ) : null}
    </Pressable>
  ) : (
    <View style={styles.rowBody}>
      <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{request.name}</Text>
      <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={2}>
        {metaWithCircle}
      </Text>
      {request.time ? (
        <RelativeTime iso={request.time} style={[styles.rowTime, { color: colors.textTertiary }]} />
      ) : null}
    </View>
  );

  return (
    <View>
      <View style={[styles.requestRow, layout === 'list' && styles.requestRowList]}>
        {profile}
        {body}
        <View style={styles.requestActionsWrap}>
          <JoinRequestActions onApprove={onApprove} onDecline={onDecline} />
        </View>
      </View>
      {showDivider && (
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
      )}
    </View>
  );
}

export function JoinRequestsSheet({
  visible,
  onClose,
  circleName,
  requests,
  loading = false,
  onApprove,
  onDecline,
  onAcceptAll,
}: {
  visible: boolean;
  onClose: () => void;
  circleName: string;
  requests: CircleJoinRequestProfile[];
  loading?: boolean;
  onApprove: (req: CircleJoinRequestProfile) => void;
  onDecline: (req: CircleJoinRequestProfile) => void;
  onAcceptAll: () => void;
}) {
  const { colors } = useTheme();
  const titleCount = loading ? '…' : String(requests.length);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={formatJoinRequestsTitle(titleCount, requests.length)}
      contentKey={`${requests.length}-${requests.map(r => r.userId).join(',')}`}
      footer={
        requests.length > 0 ? (
          <Button variant="primary" full onPress={onAcceptAll}>
            Accept all
          </Button>
        ) : undefined
      }
    >
      <View style={styles.body}>
        <Text style={[styles.sheetSub, { color: colors.textSecondary }]} numberOfLines={1}>
          {circleName}
        </Text>

        {loading ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Loading requests…</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No pending requests
            </Text>
          </View>
        ) : (
          <View style={[styles.listGroup, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            {requests.map((req, index) => (
              <JoinRequestRow
                key={req.id}
                request={req}
                onApprove={() => onApprove(req)}
                onDecline={() => onDecline(req)}
                showDivider={index < requests.length - 1}
              />
            ))}
          </View>
        )}
      </View>
    </Sheet>
  );
}

export function HubCircleJoinRequestsSheet({
  visible,
  onClose,
  circles,
  expectedCount,
}: {
  visible: boolean;
  onClose: () => void;
  circles: { id: string; dbId: string; name: string }[];
  expectedCount?: number;
}) {
  const { colors } = useTheme();
  const { refreshMembership, pendingIncomingJoinRows, dismissPendingJoinRequest } = usePawCircles();
  const { groups, loading, refresh, totalCount, dismissRequest } = useHubCircleJoinRequests(
    circles,
    visible,
    pendingIncomingJoinRows,
  );

  const displayCount = loading && totalCount === 0
    ? (expectedCount && expectedCount > 0 ? String(expectedCount) : '…')
    : String(totalCount);

  const resync = async () => {
    await Promise.all([refresh(), refreshMembership()]);
  };

  const dismissOne = (req: CircleJoinRequestProfile) => {
    dismissRequest(req.id);
    const dbId = req.circleDbId;
    if (dbId) dismissPendingJoinRequest(req.id, dbId);
  };

  const approveRequest = (req: CircleJoinRequestProfile) => {
    runJoinRequestAction('accept', req, () => dismissOne(req), resync);
  };

  const declineRequest = (req: CircleJoinRequestProfile) => {
    runJoinRequestAction('decline', req, () => dismissOne(req), resync);
  };

  const acceptAllForCircle = (group: typeof groups[number]) => {
    runJoinRequestActionsBatch(
      'accept',
      group.requests,
      () => {
        for (const req of group.requests) dismissOne(req);
      },
      resync,
    );
  };

  const pluralCount = loading && totalCount === 0 && expectedCount != null && expectedCount > 0
    ? expectedCount
    : totalCount;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={formatJoinRequestsTitle(displayCount, pluralCount)}
      contentKey={`hub-${totalCount}-${groups.map(g => `${g.circleId}:${g.requests.map(r => r.id).join(',')}`).join('|')}`}
      footer={undefined}
    >
      <View style={styles.body}>
        {loading && totalCount === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>Loading requests…</Text>
          </View>
        ) : totalCount === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No pending requests
            </Text>
          </View>
        ) : (
          groups.map(group => (
            <View key={group.circleDbId} style={styles.hubGroup}>
              <View style={styles.hubGroupHead}>
                <Text style={[styles.sheetSub, styles.hubGroupTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {group.circleName}
                </Text>
                {group.requests.length > 1 ? (
                  <Pressable
                    onPress={() => acceptAllForCircle(group)}
                    accessibilityRole="button"
                    accessibilityLabel={`Accept all requests for ${group.circleName}`}
                    style={({ pressed }) => [pressed && { opacity: 0.72 }]}
                  >
                    <Text style={[styles.hubAcceptAll, { color: colors.primary }]}>
                      Accept all
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={[styles.listGroup, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                {group.requests.map((req, index) => (
                  <JoinRequestRow
                    key={req.id}
                    request={req}
                    onApprove={() => approveRequest(req)}
                    onDecline={() => declineRequest(req)}
                    showDivider={index < group.requests.length - 1}
                    showCircleName={groups.length > 1}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </Sheet>
  );
}

const AVATAR_INSET = 68;

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  actionPressed: { opacity: 0.5, transform: [{ scale: 0.92 }] },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: REQUEST_ROW_H,
  },
  requestRowList: {
    paddingHorizontal: 0,
    paddingVertical: 11,
    minHeight: 60,
  },
  requestActionsWrap: {
    alignSelf: 'center',
    flexShrink: 0,
  },
  rowBody: { flex: 1, gap: 2, minWidth: 0, paddingRight: 4 },
  rowName: { fontSize: 16, fontWeight: '500', letterSpacing: -0.2 },
  rowMeta: { fontSize: 13, lineHeight: 18 },
  rowTime: { fontSize: 12, marginTop: 1 },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: AVATAR_INSET,
  },
  sheetSub: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 14,
    marginLeft: 2,
  },
  listGroup: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  hubGroup: {
    marginBottom: 20,
  },
  hubGroupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
    marginLeft: 2,
    marginRight: 2,
  },
  hubGroupTitle: {
    marginBottom: 0,
    flex: 1,
  },
  hubAcceptAll: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 0,
  },
});
