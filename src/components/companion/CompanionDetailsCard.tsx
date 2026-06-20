import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import type { Companion } from '../../data/mockData';

function HealthBadge({
  label,
  active,
  editing = false,
  onPress,
}: {
  label: string;
  active: boolean;
  editing?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  const content = (
    <>
      {active ? (
        <Icon name="check" size={12} color={colors.success} sw={2} />
      ) : null}
      <Text
        style={[
          styles.healthLabel,
          { color: active ? colors.text : colors.textTertiary },
        ]}
      >
        {label}
      </Text>
    </>
  );

  if (editing && onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [
          styles.healthBadge,
          {
            backgroundColor: active ? colors.successBg : colors.surface2,
            borderColor: active ? colors.success + '40' : colors.border,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  if (!active && !editing) return null;

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
      {content}
    </View>
  );
}

type BadgeDraft = {
  vaccinated: boolean;
  neutered: boolean;
};

type BadgeKey = keyof BadgeDraft;

export function getSterilizationLabel(gender?: string | null): string {
  return gender === 'Female' ? 'Spayed' : 'Neutered';
}

/** Subtle inline health labels for hero (view mode). */
export function CompanionHealthMetaLine({
  vaccinated,
  neutered,
  gender,
}: BadgeDraft & { gender?: string | null }) {
  const { colors } = useTheme();
  const parts: string[] = [];
  if (vaccinated) parts.push('Vaccinated');
  if (neutered) parts.push(getSterilizationLabel(gender));
  if (parts.length === 0) return null;

  return (
    <Text style={[styles.healthMetaLine, { color: colors.textTertiary }]}>
      {parts.join(' · ')}
    </Text>
  );
}

/** Pressable health toggles for inline edit. */
export function CompanionHealthEditToggles({
  vaccinated,
  neutered,
  gender,
  onToggle,
}: BadgeDraft & { gender?: string | null; onToggle: (key: BadgeKey) => void }) {
  const sterilizationLabel = getSterilizationLabel(gender);
  return (
    <View style={styles.badgesRow}>
      <HealthBadge
        label="Vaccinated"
        active={vaccinated}
        editing
        onPress={() => onToggle('vaccinated')}
      />
      <HealthBadge
        label={sterilizationLabel}
        active={neutered}
        editing
        onPress={() => onToggle('neutered')}
      />
    </View>
  );
}

/** @deprecated Use CompanionHealthMetaLine / CompanionHealthEditToggles in hero. */
export function CompanionProfileBadges({
  companion,
  editing = false,
  draft,
  onToggle,
}: {
  companion: Companion;
  editing?: boolean;
  draft?: BadgeDraft;
  onToggle?: (key: BadgeKey) => void;
}) {
  const vaccinated = draft?.vaccinated ?? companion.vaccinated;
  const neutered = draft?.neutered ?? companion.neutered;
  const gender = companion.gender;
  const sterilizationLabel = getSterilizationLabel(gender);

  if (!editing) {
    if (!vaccinated && !neutered) return null;
    return (
      <View style={styles.badgesRow}>
        {vaccinated ? (
          <HealthBadge label="Vaccinated" active />
        ) : null}
        {neutered ? (
          <HealthBadge label={sterilizationLabel} active />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.badgesRow}>
      <HealthBadge
        label="Vaccinated"
        active={vaccinated}
        editing
        onPress={onToggle ? () => onToggle('vaccinated') : undefined}
      />
      <HealthBadge
        label={sterilizationLabel}
        active={neutered}
        editing
        onPress={onToggle ? () => onToggle('neutered') : undefined}
      />
    </View>
  );
}

export function CompanionMoodRow({
  companion,
  placement = 'body',
}: {
  companion: Companion;
  placement?: 'hero' | 'body';
}) {
  const { colors } = useTheme();
  const mood = companion.mood?.trim();
  if (!mood) return null;

  return (
    <View
      style={[
        placement === 'hero' ? styles.heroMoodPill : styles.moodPill,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
      accessibilityLabel={`Mood: ${mood}`}
    >
      <Icon name="moon" size={13} color={colors.textTertiary} />
      <Text
        style={[
          placement === 'hero' ? styles.heroMoodText : styles.moodText,
          { color: colors.textSecondary },
        ]}
        numberOfLines={2}
      >
        {mood}
      </Text>
    </View>
  );
}

/** @deprecated Use CompanionMoodRow */
export function CompanionDetailsCard({ companion }: { companion: Companion }) {
  return <CompanionMoodRow companion={companion} />;
}

const styles = StyleSheet.create({
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  healthLabel: { fontSize: 11.5, fontWeight: '600' },
  healthMetaLine: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
  heroMoodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    maxWidth: 132,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  moodText: { flexShrink: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  heroMoodText: { flexShrink: 1, fontSize: 12.5, lineHeight: 17, fontWeight: '500' },
});
