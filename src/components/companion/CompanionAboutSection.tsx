import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import type { Companion } from '../../data/mockData';

function MetaChip({ label, tint }: { label: string; tint: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: tint + '14', borderColor: tint + '30' }]}>
      <Text style={[styles.chipText, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

function HealthBadge({
  icon,
  label,
  active,
}: {
  icon: string;
  label: string;
  active: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.healthBadge,
        {
          backgroundColor: active ? colors.successBg : colors.surface2,
          borderColor: active ? colors.success + '40' : colors.border,
        },
      ]}
    >
      <Icon
        name={icon}
        size={14}
        color={active ? colors.success : colors.textTertiary}
        sw={2}
      />
      <Text
        style={[
          styles.healthLabel,
          { color: active ? colors.text : colors.textTertiary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function CompanionAboutSection({ companion }: { companion: Companion }) {
  const { colors } = useTheme();
  const tint = companion.tint;

  const meta: string[] = [];
  if (companion.breed && companion.breed !== '—') meta.push(companion.breed);
  if (companion.age && companion.age !== '—') meta.push(companion.age);
  if (companion.gender && companion.gender !== '—') meta.push(companion.gender);

  const traits = companion.traits ?? [];
  const hasHealth = companion.vaccinated || companion.neutered || companion.microchipped;
  const hasAbout = !!companion.about?.trim();
  const hasMeta = meta.length > 0 || traits.length > 0 || hasHealth || hasAbout;

  if (!hasMeta) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.eyebrow, typography.sectionLabel, { color: colors.textTertiary }]}>
        About
      </Text>

      {hasAbout ? (
        <Text style={[styles.about, { color: colors.textSecondary }]}>{companion.about}</Text>
      ) : null}

      {meta.length > 0 ? (
        <View style={styles.chipRow}>
          {meta.map(item => (
            <MetaChip key={item} label={item} tint={tint} />
          ))}
        </View>
      ) : null}

      {traits.length > 0 ? (
        <View style={styles.chipRow}>
          {traits.map(trait => (
            <MetaChip key={trait} label={trait} tint={tint} />
          ))}
        </View>
      ) : null}

      {hasHealth ? (
        <View style={styles.healthRow}>
          <HealthBadge icon="check" label="Vaccinated" active={companion.vaccinated} />
          <HealthBadge icon="check" label="Neutered" active={companion.neutered} />
          <HealthBadge icon="check" label="Microchipped" active={companion.microchipped} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  eyebrow: { marginBottom: 2 },
  about: { fontSize: 14, lineHeight: 20 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  healthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  healthLabel: { fontSize: 12, fontWeight: '600' },
});
