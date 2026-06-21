import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/tokens';
import { Sheet } from './ui/Sheet';
import { CircleAvatar } from './ui/CircleAvatar';
import { CirclePrivacyLockIcon } from '../screens/pawCircles/PawCircleChrome';
import { Icon } from './icons/Icon';
import { Button } from './ui/Button';
import type { InvitableCircleRow } from '../context/PawCircleContext';
import { usePawCircles } from '../context/PawCircleContext';

function statusLabel(status: InvitableCircleRow['status']): string | null {
  switch (status) {
    case 'already_member': return 'Already a member';
    case 'invite_sent': return 'Invite sent';
    case 'request_pending': return 'Request pending';
    default: return null;
  }
}

function confirmMessage(row: InvitableCircleRow, inviteeName: string): string {
  const circleName = row.circle.name;
  if (row.isAdmin || row.circle.privacy !== 'request') {
    return `Invite ${inviteeName} to ${circleName}?`;
  }
  return `Invite ${inviteeName} to ${circleName}? An admin will need to approve their membership.`;
}

function CirclePickerRow({
  row,
  onPress,
  sending,
}: {
  row: InvitableCircleRow;
  onPress: () => void;
  sending: boolean;
}) {
  const { colors } = useTheme();
  const disabled = row.status !== 'available' || sending;
  const status = statusLabel(row.status);
  const privacyLabel = row.circle.privacy === 'request' ? 'Request approval' : 'Open';
  const roleLabel = row.isAdmin ? 'Admin' : 'Member';

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: colors.border,
          opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
        },
      ]}
      accessibilityState={{ disabled }}
    >
      <CircleAvatar circle={row.circle} size={44} />
      <View style={styles.rowBody}>
        <View style={styles.rowNameWrap}>
          <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
            {row.circle.name}
          </Text>
          <CirclePrivacyLockIcon privacy={row.circle.privacy} size={13} />
        </View>
        <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {row.circle.location} · {row.circle.memberCount} members
        </Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: colors.surface2 }]}>
            <Text style={[styles.badgeText, { color: colors.textTertiary }]}>{privacyLabel}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.surface2 }]}>
            <Text style={[styles.badgeText, { color: colors.textTertiary }]}>{roleLabel}</Text>
          </View>
        </View>
        {status ? (
          <Text style={[styles.statusText, { color: colors.textTertiary }]}>{status}</Text>
        ) : null}
      </View>
      {!disabled && (
        <Icon name="chevronRight" size={16} color={colors.textTertiary} />
      )}
    </Pressable>
  );
}

export function AddToCircleSheet({
  visible,
  onClose,
  inviteeUserId,
  inviteeName,
  onInviteSent,
}: {
  visible: boolean;
  onClose: () => void;
  inviteeUserId: string;
  inviteeName: string;
  onInviteSent: (msg: string) => void;
}) {
  const { colors } = useTheme();
  const { fetchInvitableCircles, sendCircleInvite, joinedCircles } = usePawCircles();
  const [rows, setRows] = useState<InvitableCircleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchInvitableCircles(inviteeUserId);
      setRows(next);
    } finally {
      setLoading(false);
    }
  }, [fetchInvitableCircles, inviteeUserId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const handleSelect = (row: InvitableCircleRow) => {
    const message = confirmMessage(row, inviteeName);

    const send = async () => {
      setSendingId(row.circle.id);
      try {
        await sendCircleInvite(row.circle.id, inviteeUserId);
        onInviteSent(`Invite sent to ${inviteeName}`);
        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not send invite';
        if (msg.toLowerCase().includes('invite already sent')) {
          await load();
          onInviteSent('Invite already sent');
        } else {
          onInviteSent(msg);
        }
      } finally {
        setSendingId(null);
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

  const availableCount = rows.filter(r => r.status === 'available').length;
  const hasCircles = joinedCircles.length > 0;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Add to a Paw Circle"
      contentKey={`${rows.length}-${availableCount}-${inviteeUserId}`}
    >
      <View style={styles.body}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Invite {inviteeName} to one of your circles
        </Text>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : !hasCircles ? (
          <View style={styles.center}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No circles yet</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Join or create a Paw Circle first to invite members.
            </Text>
            <Button variant="outline" onPress={onClose} style={{ marginTop: spacing.md }}>
              Close
            </Button>
          </View>
        ) : rows.every(r => r.status === 'already_member') ? (
          <View style={styles.center}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {inviteeName} is in all your circles
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              They&apos;re already a member of every circle you belong to.
            </Text>
          </View>
        ) : availableCount === 0 ? (
          <View style={styles.list}>
            {rows.map(row => (
              <CirclePickerRow key={row.dbId} row={row} onPress={() => {}} sending={!!sendingId} />
            ))}
          </View>
        ) : (
          <View style={styles.list}>
            {rows.map(row => (
              <CirclePickerRow
                key={row.dbId}
                row={row}
                onPress={() => handleSelect(row)}
                sending={sendingId === row.circle.id}
              />
            ))}
          </View>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm, paddingHorizontal: 20, paddingBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  center: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 12 },
  list: { gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  rowNameWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  rowMeta: { fontSize: 13 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  statusText: { fontSize: 12, fontWeight: '600', marginTop: 2 },
});
