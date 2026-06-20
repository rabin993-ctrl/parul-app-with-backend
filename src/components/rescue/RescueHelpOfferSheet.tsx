import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { webFieldInputStyle } from '../../theme/webInput';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import {
  HELP_TYPES,
  helpTypeLabel,
  type HelpOfferType,
  type RescueHelpOffer,
} from '../../utils/rescueHelpOffers';

type Props = {
  visible: boolean;
  onClose: () => void;
  existingOffer: RescueHelpOffer | null;
  onSubmit: (type: HelpOfferType, message: string) => Promise<void>;
  onWithdraw: () => Promise<void>;
  onOpenChat?: () => Promise<void>;
  submitting?: boolean;
};

function isPendingOffer(offer: RescueHelpOffer | null): offer is RescueHelpOffer {
  return offer?.status === 'offered' || offer?.status === 'viewed';
}

export function RescueHelpOfferSheet({
  visible,
  onClose,
  existingOffer,
  onSubmit,
  onWithdraw,
  onOpenChat,
  submitting = false,
}: Props) {
  const { colors } = useTheme();
  const [type, setType] = useState<HelpOfferType>(existingOffer?.type ?? 'other');
  const [message, setMessage] = useState(existingOffer?.message ?? '');
  const [openingChat, setOpeningChat] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setType(existingOffer?.type ?? 'other');
      setMessage(existingOffer?.message ?? '');
    }
  }, [visible, existingOffer]);

  const isAccepted = existingOffer?.status === 'accepted';
  const isDeclined = existingOffer?.status === 'declined';
  const isPending = isPendingOffer(existingOffer);
  const showCompose = !existingOffer || isDeclined;

  const handleSubmit = async () => {
    await onSubmit(type, message);
  };

  const handleOpenChat = async () => {
    if (!onOpenChat || openingChat) return;
    setOpeningChat(true);
    try {
      await onOpenChat();
    } finally {
      setOpeningChat(false);
    }
  };

  const sheetTitle = isAccepted
    ? 'Help accepted'
    : isPending
      ? 'Your help offer'
      : isDeclined
        ? 'Offer declined'
        : 'Offer help';

  return (
    <Sheet visible={visible} onClose={onClose} title={sheetTitle}>
      <View style={styles.body}>
        {isAccepted && existingOffer ? (
          <>
            <Text style={[styles.statusLabel, { color: colors.success }]}>
              The poster accepted your help: open chat to coordinate.
            </Text>
            <Text style={[styles.fieldLabel, styles.firstFieldLabel, { color: colors.textSecondary }]}>
              HELP TYPE
            </Text>
            <Text style={[styles.sentValue, { color: colors.text }]}>
              {helpTypeLabel(existingOffer.type)}
            </Text>
            {existingOffer.message ? (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>MESSAGE</Text>
                <Text style={[styles.sentValue, { color: colors.text }]}>{existingOffer.message}</Text>
              </>
            ) : null}
            <View style={styles.actions}>
              <Button
                full
                icon="comment"
                onPress={handleOpenChat}
                loading={openingChat}
                disabled={openingChat}
              >
                Open chat
              </Button>
              <Button full variant="soft" onPress={onClose} disabled={openingChat}>
                Close
              </Button>
            </View>
          </>
        ) : isPending && existingOffer ? (
          <>
            <Text style={[styles.statusLabel, { color: colors.success }]}>
              Offer sent: the poster can reach out to you.
            </Text>
            <Text style={[styles.fieldLabel, styles.firstFieldLabel, { color: colors.textSecondary }]}>
              HELP TYPE
            </Text>
            <Text style={[styles.sentValue, { color: colors.text }]}>
              {helpTypeLabel(existingOffer.type)}
            </Text>
            {existingOffer.message ? (
              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>MESSAGE</Text>
                <Text style={[styles.sentValue, { color: colors.text }]}>{existingOffer.message}</Text>
              </>
            ) : null}
            <View style={styles.actions}>
              <View style={styles.footerRow}>
                <Button variant="soft" style={{ flex: 1 }} onPress={onClose} disabled={submitting}>
                  Close
                </Button>
                <Button variant="outline" style={{ flex: 1 }} onPress={onWithdraw} loading={submitting}>
                  Withdraw
                </Button>
              </View>
            </View>
          </>
        ) : isDeclined ? (
          <>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
              The poster passed on this offer. You can send a new one anytime.
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Let the poster know how you can help. They'll get a notification.
            </Text>
            <Text style={[styles.fieldLabel, styles.firstFieldLabel, { color: colors.textSecondary }]}>
              HOW CAN YOU HELP?
            </Text>
            <View style={styles.chipRow}>
              {HELP_TYPES.map(opt => {
                const on = type === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setType(opt.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: on ? colors.primary : colors.border,
                        backgroundColor: on ? colors.primary + '14' : colors.surface,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: on ? colors.text : colors.textSecondary }, on && { fontWeight: '700' }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>MESSAGE · OPTIONAL</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="e.g. I can drive to the vet on weekends"
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
              style={[
                styles.textBox,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 },
                webFieldInputStyle,
              ]}
            />
            <View style={styles.actions}>
              <Button full onPress={handleSubmit} loading={submitting} icon="heart">
                Send offer
              </Button>
            </View>
          </>
        ) : showCompose ? (
          <>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Let the poster know how you can help. They'll get a notification.
            </Text>
            <Text style={[styles.fieldLabel, styles.firstFieldLabel, { color: colors.textSecondary }]}>
              HOW CAN YOU HELP?
            </Text>
            <View style={styles.chipRow}>
              {HELP_TYPES.map(opt => {
                const on = type === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setType(opt.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: on ? colors.primary : colors.border,
                        backgroundColor: on ? colors.primary + '14' : colors.surface,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: on ? colors.text : colors.textSecondary }, on && { fontWeight: '700' }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>MESSAGE · OPTIONAL</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="e.g. I can drive to the vet on weekends"
              placeholderTextColor={colors.textTertiary}
              multiline
              textAlignVertical="top"
              style={[
                styles.textBox,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 },
                webFieldInputStyle,
              ]}
            />
            <View style={styles.actions}>
              <Button full onPress={handleSubmit} loading={submitting} icon="heart">
                Send offer
              </Button>
            </View>
          </>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 20, gap: 2 },
  hint: { fontSize: 13.5, lineHeight: 19, marginBottom: 6 },
  statusLabel: { fontSize: 13.5, fontWeight: '600', lineHeight: 19, marginBottom: 8 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  firstFieldLabel: { marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 2 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: 12.5, fontWeight: '600' },
  textBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 88,
    fontSize: 14.5,
    lineHeight: 21,
  },
  sentValue: { fontSize: 15, lineHeight: 22 },
  actions: { marginTop: 16 },
  footerRow: { flexDirection: 'row', gap: 10 },
});
