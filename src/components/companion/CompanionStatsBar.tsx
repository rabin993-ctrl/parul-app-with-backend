import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';

function formatCount(n: number): string {
  if (n >= 1000) {
    const v = n / 1000;
    return (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10).toString().replace(/\.0$/, '') + 'K';
  }
  return String(n);
}

export function CompanionStatsBar({
  followers,
  pawprints,
  treats,
  style,
}: {
  followers: number;
  pawprints: number;
  treats: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  const stats = [
    { label: 'Followers', value: formatCount(followers) },
    { label: 'Pawprints', value: formatCount(pawprints) },
    { label: 'Treats', value: formatCount(treats) },
  ];

  return (
    <View style={[styles.bar, style]}>
      {stats.map((stat, index) => (
        <React.Fragment key={stat.label}>
          {index > 0 ? (
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          ) : null}
          <View style={styles.cell}>
            <Text style={[styles.value, { color: colors.text }]}>{stat.value}</Text>
            <Text style={[styles.label, { color: colors.textTertiary }]} numberOfLines={1}>
              {stat.label}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    paddingVertical: 4,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 4,
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
