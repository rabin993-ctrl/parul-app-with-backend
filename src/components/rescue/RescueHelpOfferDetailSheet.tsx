import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import {
  helpTypeLabel,
  type RescueHelpOffer,
} from '../../utils/rescueHelpOffers';
import { formatRelativeTime } from '../../utils/time';

type Props = {
  visible: boolean;
  onClose: () => void;
  offer: RescueHelpOffer | null;
  onAccept: (offer: RescueHelpOffer) => Promise<boolean>;
  onDecline: (offer: RescueHelpOffer) => Promise<void>;
  onOpenChat: (offer: RescueHelpOffer) => Promise<boolean>;
  onError?: (message: string) => void;
};

export function RescueHelpOfferDetailSheet({
  visible,
  onClose,
  offer,
  onAccept,
  onDecline,
  onOpenChat,
  onError,
}: Props) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState<'accept' | 'decline' | 'chat' | null>(null);

  const handleAccept = useCallback(async () => {
    if (!offer || busy) return;
    setBusy('accept');
    try {
      const ok = await onAccept(offer);
      if (ok) onClose();
    } finally {
      setBusy(null);
    }
  }, [offer, busy, onAccept, onClose]);

  const handleOpenChat = useCallback(async () => {
    if (!offer || busy) return;
    setBusy('chat');
    try {
      const ok = await onOpenChat(offer);
      if (!ok) onError?.('Could not open chat');
      else onClose();
    } finally {
      setBusy(null);
    }
  }, [offer, busy, onClose, onError, onOpenChat]);

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
          {isPending ? (
            <>
              <Button
                full
                onPress={handleAccept}
                loading={busy === 'accept'}
                disabled={!!busy && busy !== 'accept'}
              >
                Accept offer
              </Button>
              <Button
                variant="outline"
                full
                onPress={handleDecline}
                loading={busy === 'decline'}
                disabled={!!busy && busy !== 'decline'}
              >
                Decline
              </Button>
            </>
          ) : isAccepted ? (
            <Button
              full
              icon="comment"
              onPress={handleOpenChat}
              loading={busy === 'chat'}
              disabled={!!busy && busy !== 'chat'}
            >
              Open chat
            </Button>
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
  spinner: { marginTop: 4 },
});
