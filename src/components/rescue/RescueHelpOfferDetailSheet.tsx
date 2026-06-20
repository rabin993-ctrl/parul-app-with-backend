import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import {
  helpTypeLabel,
  type RescueHelpOffer,
} from '../../utils/rescueHelpOffers';
import { formatRelativeTime } from '../../utils/time';
import { startDirectMessage } from '../../utils/startDirectMessage';
import type { ChatThread } from '../../context/AdoptionContext';

type Props = {
  visible: boolean;
  onClose: () => void;
  offer: RescueHelpOffer | null;
  onAccept: (offer: RescueHelpOffer) => Promise<void>;
  onDecline: (offer: RescueHelpOffer) => Promise<void>;
  onMessageStarted?: (thread: ChatThread) => void;
  onError?: (message: string) => void;
};

export function RescueHelpOfferDetailSheet({
  visible,
  onClose,
  offer,
  onAccept,
  onDecline,
  onMessageStarted,
  onError,
}: Props) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState<'message' | 'accept' | 'decline' | null>(null);

  const handleMessage = useCallback(async () => {
    if (!offer || busy) return;
    setBusy('message');
    try {
      const result = await startDirectMessage(offer.helperUserId);
      if ('error' in result) {
        onError?.(result.error);
        return;
      }
      onMessageStarted?.({
        id: result.threadId,
        participantId: offer.helperUserId,
        participantName: offer.helperName,
        participantHandle: offer.helperHandle,
        participantTint: colors.primary,
        preview: '',
        time: '',
        unread: 0,
      });
      onClose();
    } finally {
      setBusy(null);
    }
  }, [offer, busy, colors.primary, onClose, onError, onMessageStarted]);

  const handleAccept = useCallback(async () => {
    if (!offer || busy) return;
    setBusy('accept');
    try {
      await onAccept(offer);
      onClose();
    } finally {
      setBusy(null);
    }
  }, [offer, busy, onAccept, onClose]);

  const handleDecline = useCallback(() => {
    if (!offer || busy) return;
    Alert.alert(
      'Decline this offer?',
      'They can offer help again later if needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy('decline');
              try {
                await onDecline(offer);
                onClose();
              } finally {
                setBusy(null);
              }
            })();
          },
        },
      ],
    );
  }, [offer, busy, onDecline, onClose]);

  if (!offer) return null;

  const isAccepted = offer.status === 'accepted';
  const isPending = offer.status === 'offered' || offer.status === 'viewed';
  const displayName = offer.helperName ?? 'Community member';

  return (
    <Sheet visible={visible} onClose={onClose} title="Help offer">
      <View style={styles.body}>
        <View style={styles.header}>
          <Avatar
            user={{
              id: offer.helperUserId,
              name: displayName,
              handle: offer.helperHandle,
              tint: colors.primary,
            }}
            size={44}
          />
          <View style={styles.headerCopy}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {helpTypeLabel(offer.type)} · {formatRelativeTime(offer.createdAt)}
            </Text>
          </View>
          {isAccepted ? (
            <View style={[styles.statusPill, { backgroundColor: colors.successBg }]}>
              <Text style={[styles.statusText, { color: colors.success }]}>Accepted</Text>
            </View>
          ) : isPending ? (
            <View style={[styles.statusPill, { backgroundColor: colors.primary + '14' }]}>
              <Text style={[styles.statusText, { color: colors.primary }]}>New</Text>
            </View>
          ) : null}
        </View>

        {offer.message ? (
          <View style={[styles.messageCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Text style={[styles.message, { color: colors.text }]}>{offer.message}</Text>
          </View>
        ) : (
          <Text style={[styles.noMessage, { color: colors.textTertiary }]}>
            No message included.
          </Text>
        )}

        <View style={styles.actions}>
          <Button
            full
            icon="comment"
            onPress={handleMessage}
            loading={busy === 'message'}
            disabled={!!busy && busy !== 'message'}
          >
            Message
          </Button>
          {isPending ? (
            <View style={styles.secondaryRow}>
              <Button
                style={{ flex: 1 }}
                onPress={handleAccept}
                loading={busy === 'accept'}
                disabled={!!busy && busy !== 'accept'}
              >
                Accept help
              </Button>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={handleDecline}
                loading={busy === 'decline'}
                disabled={!!busy && busy !== 'decline'}
              >
                Decline
              </Button>
            </View>
          ) : isAccepted ? (
            <View style={[styles.acceptedNote, { backgroundColor: colors.successBg }]}>
              <Icon name="heart" size={14} color={colors.success} />
              <Text style={[styles.acceptedText, { color: colors.success }]}>
                You accepted this offer. Message them to coordinate.
              </Text>
            </View>
          ) : null}
        </View>

        {busy ? (
          <ActivityIndicator style={styles.spinner} color={colors.primary} />
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 12.5, fontWeight: '600' },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusText: { fontSize: 11.5, fontWeight: '700' },
  messageCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  message: { fontSize: 15, lineHeight: 22 },
  noMessage: { fontSize: 13.5, lineHeight: 19 },
  actions: { gap: 10, marginTop: 4 },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  acceptedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  acceptedText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  spinner: { marginTop: 4 },
});
