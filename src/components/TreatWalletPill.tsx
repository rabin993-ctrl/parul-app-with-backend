import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows, typography } from '../theme/tokens';
import { Icon } from './icons/Icon';
import { Button } from './ui/Button';
import { ModalPresent } from './ui/ModalScrim';
import { useTreatWallet } from '../context/TreatWalletContext';
import { TREAT_ALLOWANCE } from '../utils/treatWallet';
import { supabase } from '../lib/supabase';

function TreatsInfoModal({
  visible,
  onClose,
  remaining,
  daysUntilReset,
}: {
  visible: boolean;
  onClose: () => void;
  remaining: number;
  daysUntilReset: number;
}) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <ModalPresent onDismiss={onClose} style={modalStyles.overlay} animatedScale={false}>
        <View style={[modalStyles.card, { backgroundColor: colors.surface }, shadows.md]}>
          <View style={[modalStyles.iconWrap, { backgroundColor: colors.infoBg }]}>
            <Icon name="bone" size={22} color={colors.primary} />
          </View>
          <Text style={[modalStyles.title, { color: colors.text }]}>Treats</Text>
          <Text style={[modalStyles.body, { color: colors.textSecondary }]}>
            {`You get ${TREAT_ALLOWANCE} treats every 30 days to share with pets on Parul. Open a companion profile and tap Give Treat to send one. It is a small cheer for the pet and their person.`}
          </Text>
          <Text style={[modalStyles.body, { color: colors.textSecondary }]}>
            You can&apos;t give treats to your own companions. Your balance refills when the timer resets.
          </Text>
          <Text style={[modalStyles.meta, { color: colors.primary }]}>
            {remaining > 0
              ? `${remaining} left to give · resets in ${daysUntilReset}d`
              : `No treats left · resets in ${daysUntilReset}d`}
          </Text>
          <Button variant="primary" onPress={onClose} style={modalStyles.button}>
            Got it
          </Button>
        </View>
      </ModalPresent>
    </Modal>
  );
}

function formatTreatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

/** Profile stats bar cell — remaining treats in the third slot (Posts / Following / Treats). */
export function TreatWalletStatCell() {
  const { colors } = useTheme();
  const { remaining, daysUntilReset, ready } = useTreatWallet();
  const [infoOpen, setInfoOpen] = useState(false);

  if (!ready) return null;

  const empty = remaining <= 0;
  const a11yLabel = empty
    ? `No treats left. Learn about treats`
    : `${remaining} treats left. Learn about treats`;

  return (
    <>
      <Pressable
        onPress={() => setInfoOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={({ pressed }) => [
          statCellStyles.cell,
          pressed && { opacity: 0.72 },
          Platform.OS === 'web' && { cursor: 'pointer' as const },
        ]}
      >
        <Text style={[statCellStyles.value, { color: empty ? colors.textSecondary : colors.text }]}>
          {formatTreatCount(remaining)}
        </Text>
        <Text style={[statCellStyles.label, { color: colors.textTertiary }]} numberOfLines={1}>
          Treats left
        </Text>
      </Pressable>
      <TreatsInfoModal
        visible={infoOpen}
        onClose={() => setInfoOpen(false)}
        remaining={remaining}
        daysUntilReset={daysUntilReset}
      />
    </>
  );
}

/** Public profile stats bar — treats received by this user (not the viewer's wallet). */
export function ProfilePublicTreatsStatCell({ ownerId }: { ownerId: string }) {
  const { colors } = useTheme();
  const { getOwnerReceivedTreats } = useTreatWallet();
  const [received, setReceived] = useState<number | null>(null);
  const [showCount, setShowCount] = useState(true);
  const liveReceived = getOwnerReceivedTreats(ownerId);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [privacyRes, giftsRes] = await Promise.all([
        supabase
          .from('user_privacy_settings')
          .select('show_treats_on_profile')
          .eq('user_id', ownerId)
          .single(),
        supabase
          .from('treat_gifts')
          .select('amount')
          .eq('owner_id', ownerId),
      ]);

      if (cancelled) return;

      const visible = privacyRes.data?.show_treats_on_profile ?? true;
      setShowCount(visible);

      if (visible) {
        const total = (giftsRes.data ?? []).reduce(
          (sum, row) => sum + (row.amount ?? 0),
          0,
        );
        setReceived(total);
      } else {
        setReceived(null);
      }
    })();

    return () => { cancelled = true; };
  }, [ownerId]);

  const displayCount = showCount
    ? Math.max(received ?? 0, liveReceived)
    : null;

  return (
    <View
      style={statCellStyles.cell}
      accessibilityLabel={
        showCount
          ? `${displayCount ?? 0} treats received`
          : 'Treat count hidden'
      }
    >
      <Text
        style={[
          statCellStyles.value,
          { color: showCount ? colors.text : colors.textTertiary },
        ]}
      >
        {showCount ? formatTreatCount(displayCount ?? 0) : '—'}
      </Text>
      <Text style={[statCellStyles.label, { color: colors.textTertiary }]} numberOfLines={1}>
        Treats
      </Text>
    </View>
  );
}

/** Muted one-liner for profile headers — remaining treats to give this period. */
export function TreatWalletHint({
  align = 'center',
  compact = false,
}: {
  align?: 'center' | 'start';
  /** Inline footer row — no flex stretch on label text */
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const { remaining, daysUntilReset, ready } = useTreatWallet();
  const [infoOpen, setInfoOpen] = useState(false);

  if (!ready) return null;

  const empty = remaining <= 0;
  const label = compact
    ? (empty ? 'No treats left' : `${remaining} treats left`)
    : empty
      ? `No treats left · resets in ${daysUntilReset}d`
      : `${remaining} treats to give · resets in ${daysUntilReset}d`;
  const tone = empty ? colors.textTertiary : colors.primary;

  return (
    <>
      <Pressable
        onPress={() => setInfoOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}. Learn about treats`}
        style={({ pressed }) => [
          hintStyles.row,
          align === 'start' && hintStyles.rowStart,
          compact && hintStyles.rowCompact,
          pressed && { opacity: 0.72 },
          Platform.OS === 'web' && { cursor: 'pointer' as const },
        ]}
      >
        <Icon name="bone" size={compact ? 10 : 11} color={tone} />
        <Text
          numberOfLines={compact ? 1 : undefined}
          style={[
            compact ? hintStyles.textCompact : hintStyles.text,
            { color: tone },
          ]}
        >
          {label}
        </Text>
      </Pressable>
      <TreatsInfoModal
        visible={infoOpen}
        onClose={() => setInfoOpen(false)}
        remaining={remaining}
        daysUntilReset={daysUntilReset}
      />
    </>
  );
}

const statCellStyles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  value: {
    ...typography.stat,
    fontSize: 20,
    letterSpacing: -0.35,
    fontWeight: '700',
  },
  label: {
    ...typography.statLabel,
    fontSize: 12,
    letterSpacing: 0.15,
    textTransform: 'uppercase',
  },
});

const hintStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rowStart: {
    justifyContent: 'flex-start',
  },
  rowCompact: {
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  textCompact: {
    flexShrink: 0,
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 17,
    letterSpacing: -0.1,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.xl,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  meta: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  button: {
    marginTop: 4,
  },
});

export function TreatWalletPill() {
  const { colors } = useTheme();
  const { remaining, daysUntilReset } = useTreatWallet();
  const empty = remaining <= 0;

  return (
    <View style={[
      styles.pill,
      {
        backgroundColor: empty ? colors.neutralBg : colors.infoBg,
        borderColor: colors.border,
      },
    ]}>
      <Icon name="bone" size={14} color={empty ? colors.textTertiary : colors.primary} />
      <Text style={[styles.text, { color: empty ? colors.textTertiary : colors.text }]}>
        {empty ? 'None left to give' : `${remaining} to give`}
      </Text>
      <Text style={[styles.dot, { color: colors.borderStrong }]}>·</Text>
      <Text style={[styles.meta, { color: colors.textTertiary }]}>
        resets in {daysUntilReset}d
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: 12.5, fontWeight: '600' },
  dot: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 12, fontWeight: '500' },
});
