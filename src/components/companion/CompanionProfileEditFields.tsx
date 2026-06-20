import React from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { CompanionHealthEditToggles } from './CompanionDetailsCard';
import type { CompanionProfileDraft } from '../../hooks/useCompanionProfileEdit';

const GENDER_OPTIONS = ['Male', 'Female'] as const;

type Props = {
  draft: CompanionProfileDraft;
  onChange: (patch: Partial<CompanionProfileDraft>) => void;
  onToggleHealth: (key: 'vaccinated' | 'neutered') => void;
};

export function CompanionProfileEditFields({
  draft,
  onChange,
  onToggleHealth,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.genderRow}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>Gender</Text>
        <View style={styles.chipRow}>
          {GENDER_OPTIONS.map(option => {
            const active = draft.gender === option;
            return (
              <Pressable
                key={option}
                onPress={() => onChange({ gender: active ? '' : option })}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? colors.infoBg : colors.surface2,
                    borderColor: active ? colors.primary + '40' : colors.border,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: active ? colors.primary : colors.textSecondary }]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.healthRow}>
        <Text style={[styles.label, { color: colors.textTertiary }]}>Health</Text>
        <CompanionHealthEditToggles
          vaccinated={draft.vaccinated}
          neutered={draft.neutered}
          gender={draft.gender}
          onToggle={onToggleHealth}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  genderRow: { gap: 6 },
  healthRow: { gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  chipText: { fontSize: 13, fontWeight: '600' },
});
