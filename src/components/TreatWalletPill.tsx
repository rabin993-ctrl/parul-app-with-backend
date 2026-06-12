import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { Icon } from './icons/Icon';
import { useTreatWallet } from '../context/TreatWalletContext';

/** Muted one-liner for profile headers — remaining treats to give this period. */
export function TreatWalletHint({ align = 'center' }: { align?: 'center' | 'start' }) {
  const { colors } = useTheme();
  const { remaining, daysUntilReset, ready } = useTreatWallet();
  if (!ready) return null;

  const empty = remaining <= 0;
  const label = empty
    ? `No treats left · resets in ${daysUntilReset}d`
    : `${remaining} treats to give · resets in ${daysUntilReset}d`;

  return (
    <View style={[hintStyles.row, align === 'start' && hintStyles.rowStart]}>
      <Icon name="bone" size={11} color={colors.textTertiary} />
      <Text style={[hintStyles.text, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

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
  text: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: -0.1,
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
