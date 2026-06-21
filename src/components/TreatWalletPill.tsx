import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
export function TreatWalletStatCell({ compact = false, alignStart = false }: { compact?: boolean; alignStart?: boolean }) {
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
          compact && statCellStyles.cellCompact,
          compact && statCellStyles.cellCompactTreat,
          compact && alignStart && statCellStyles.cellCompactHeroAlign,
          alignStart && statCellStyles.cellStart,
          pressed && { opacity: 0.72 },
          Platform.OS === 'web' && { cursor: 'pointer' as const },
        ]}
      >
        <Text style={[
          statCellStyles.value,
          compact && statCellStyles.valueCompact,
          alignStart && statCellStyles.valueStart,
          { color: empty ? colors.textSecondary : colors.text },
        ]}>
          {formatTreatCount(remaining)}
        </Text>
        <Text style={[
          statCellStyles.label,
          compact && statCellStyles.labelCompact,
          alignStart && statCellStyles.labelStart,
          { color: colors.textTertiary },
        ]} numberOfLines={compact ? 2 : 1}>
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

/** Public user profile stats — how many treats this owner has left to give. */
export function ProfilePublicTreatsStatCell({
  ownerId,
  compact = false,
  alignStart = false,
}: {
  ownerId: string;
  compact?: boolean;
  alignStart?: boolean;
}) {
  const { colors } = useTheme();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [status, setStatus] = useState<'loading' | 'visible' | 'hidden' | 'error'>('loading');

  const load = useCallback(async () => {
    if (!ownerId) {
      setStatus('hidden');
      setRemaining(null);
      return;
    }

    setStatus('loading');

    const { data, error } = await supabase.rpc(
      'get_public_treat_wallets_remaining',
      { p_user_ids: [ownerId] },
    );

    if (error) {
      if (__DEV__) {
        console.warn('[ProfilePublicTreatsStatCell] RPC failed:', error.message);
      }
      setStatus('error');
      setRemaining(null);
      return;
    }

    const row = (data ?? []).find(r => r.user_id === ownerId);
    if (!row) {
      setStatus('hidden');
      setRemaining(null);
      return;
    }

    setStatus('visible');
    setRemaining(Math.max(0, row.remaining));
  }, [ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const showCount = status === 'visible' && remaining != null;

  return (
    <View
      style={[
        statCellStyles.cell,
        compact && statCellStyles.cellCompact,
        compact && statCellStyles.cellCompactTreat,
        compact && alignStart && statCellStyles.cellCompactHeroAlign,
        alignStart && statCellStyles.cellStart,
      ]}
      accessibilityLabel={
        showCount
          ? `${remaining} treats left to give`
          : 'Treat count hidden'
      }
    >
      <Text
        style={[
          statCellStyles.value,
          compact && statCellStyles.valueCompact,
          alignStart && statCellStyles.valueStart,
          { color: showCount ? colors.text : colors.textTertiary },
        ]}
      >
        {showCount ? formatTreatCount(remaining) : '—'}
      </Text>
      <Text style={[
        statCellStyles.label,
        compact && statCellStyles.labelCompact,
        alignStart && statCellStyles.labelStart,
        { color: colors.textTertiary },
      ]} numberOfLines={compact ? 2 : 1}>
        Treats left
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
  cellCompact: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 3,
    alignItems: 'center',
  },
  cellCompactTreat: {
    minWidth: 0,
  },
  cellCompactHeroAlign: {
    flex: 1,
    flexShrink: 0,
    minWidth: 44,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  cellStart: {
    alignItems: 'flex-start',
  },
  value: {
    ...typography.stat,
    fontSize: 20,
    letterSpacing: -0.35,
    fontWeight: '700',
  },
  valueCompact: {
    fontSize: 20,
    letterSpacing: -0.35,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  valueStart: {
    textAlign: 'left',
  },
  label: {
    ...typography.statLabel,
    fontSize: 12,
    letterSpacing: 0.15,
    textTransform: 'uppercase',
  },
  labelCompact: {
    fontSize: 12,
    letterSpacing: 0.1,
    lineHeight: 15,
    textAlign: 'center',
    alignSelf: 'stretch',
    textTransform: 'none',
  },
  labelStart: {
    textAlign: 'left',
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
