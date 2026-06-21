import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows, spacing, typography } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { CircleAvatar } from '../ui/CircleAvatar';
import { ModalPresent } from '../ui/ModalScrim';
import { Icon } from '../icons/Icon';
import type { PawCircle } from '../../data/pawCircles';
import { shortCircleName } from '../../utils/destinationSearch';

export function CircleMentionJoinDialog({
  visible,
  circle,
  mode,
  loading,
  onJoin,
  onCancel,
  onDismiss,
}: {
  visible: boolean;
  circle: PawCircle | null;
  mode: 'join' | 'pending';
  loading?: boolean;
  onJoin: () => void;
  onCancel?: () => void;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();

  if (!circle) return null;

  const displayName = shortCircleName(circle.name);
  const isRequest = circle.privacy === 'request';
  const pending = mode === 'pending';

  const title = pending
    ? 'Request pending'
    : `Join ${displayName}?`;

  const body = pending
    ? `Your request to join ${displayName} is waiting for admin approval. You'll be notified when it's accepted.`
    : isRequest
      ? `${displayName} is a private circle. Send a join request and an admin will review it.`
      : `You're not a member of ${displayName} yet. Join to open the circle chat and see what everyone's talking about.`;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <ModalPresent onDismiss={onDismiss} style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.md },
          ]}
        >
          <View style={styles.header}>
            <CircleAvatar circle={circle} size={52} iconSize={24} label={circle.name} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.circleName, { color: colors.text }]} numberOfLines={2}>
                {circle.name}
              </Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                {circle.location} · {circle.memberCount} members
              </Text>
            </View>
          </View>

          {circle.tagline ? (
            <Text style={[styles.tagline, { color: colors.textSecondary }]} numberOfLines={2}>
              {circle.tagline}
            </Text>
          ) : null}

          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>

          {pending ? (
            <View style={[styles.statusPill, { backgroundColor: colors.warningBg, borderColor: colors.warning + '55' }]}>
              <Icon name="clock" size={14} color={colors.warning} />
              <Text style={[styles.statusText, { color: colors.warning }]}>Waiting for approval</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {pending ? (
              <>
                <Button variant="outline" full loading={loading} onPress={onCancel ?? onDismiss}>
                  Cancel request
                </Button>
                <Button variant="ghost" full onPress={onDismiss}>
                  OK
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" full onPress={onDismiss}>
                  Not now
                </Button>
                <Button variant="primary" full loading={loading} onPress={onJoin}>
                  {isRequest ? 'Request to join' : 'Join circle'}
                </Button>
              </>
            )}
          </View>
        </View>
      </ModalPresent>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 22,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  circleName: { ...typography.title, fontSize: 17 },
  meta: { fontSize: 13, marginTop: 2 },
  tagline: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.2, marginTop: 4 },
  body: { fontSize: 14, lineHeight: 21 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    marginTop: 2,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  actions: { gap: 8, marginTop: spacing.sm },
});
