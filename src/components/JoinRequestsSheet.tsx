import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { Avatar } from './ui/Avatar';
import { Button } from './ui/Button';
import { Icon } from './icons/Icon';
import { Sheet } from './ui/Sheet';
import { CircleJoinRequest } from '../data/pawCircleChat';
import { users } from '../data/mockData';

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
}: {
  request: CircleJoinRequest;
  onApprove: () => void;
  onDecline: () => void;
  onPressProfile?: () => void;
  showDivider?: boolean;
}) {
  const { colors } = useTheme();
  const u = users[request.userId];
  if (!u) return null;

  const profile = onPressProfile ? (
    <Pressable onPress={onPressProfile}>
      <Avatar user={u} size={40} />
    </Pressable>
  ) : (
    <Avatar user={u} size={40} />
  );

  const body = onPressProfile ? (
    <Pressable style={styles.rowBody} onPress={onPressProfile}>
      <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{u.name}</Text>
      <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={2}>
        {request.note || `@${u.handle}`}
      </Text>
      {request.time ? (
        <Text style={[styles.rowTime, { color: colors.textTertiary }]}>{request.time}</Text>
      ) : null}
    </Pressable>
  ) : (
    <View style={styles.rowBody}>
      <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{u.name}</Text>
      <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={2}>
        {request.note || `@${u.handle}`}
      </Text>
      {request.time ? (
        <Text style={[styles.rowTime, { color: colors.textTertiary }]}>{request.time}</Text>
      ) : null}
    </View>
  );

  return (
    <View>
      <View style={styles.requestRow}>
        {profile}
        {body}
        <JoinRequestActions onApprove={onApprove} onDecline={onDecline} />
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
  onApprove,
  onDecline,
  onAcceptAll,
}: {
  visible: boolean;
  onClose: () => void;
  circleName: string;
  requests: CircleJoinRequest[];
  onApprove: (userId: string) => void;
  onDecline: (userId: string) => void;
  onAcceptAll: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`${requests.length} join ${requests.length === 1 ? 'request' : 'requests'}`}
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

        {requests.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No pending requests
            </Text>
          </View>
        ) : (
          <View style={[styles.listGroup, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            {requests.map((req, index) => (
              <JoinRequestRow
                key={req.userId}
                request={req}
                onApprove={() => onApprove(req.userId)}
                onDecline={() => onDecline(req.userId)}
                showDivider={index < requests.length - 1}
              />
            ))}
          </View>
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
  actionPressed: { opacity: 0.65 },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: REQUEST_ROW_H,
  },
  rowBody: { flex: 1, gap: 3, minWidth: 0, paddingRight: 4 },
  rowName: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
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
});
