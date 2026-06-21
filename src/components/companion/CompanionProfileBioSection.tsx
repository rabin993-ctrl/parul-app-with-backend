import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { CompanionHealthMetaLine } from './CompanionDetailsCard';

export function CompanionProfileBioSection({
  companionName,
  bio,
  editing = false,
  onBioChange,
  vaccinated = false,
  neutered = false,
  gender,
}: {
  companionName: string;
  bio?: string;
  editing?: boolean;
  onBioChange?: (value: string) => void;
  vaccinated?: boolean;
  neutered?: boolean;
  gender?: string | null;
}) {
  const { colors } = useTheme();
  const text = bio?.trim();

  if (editing && onBioChange) {
    return (
      <View style={styles.section}>
        <TextInput
          value={bio ?? ''}
          onChangeText={onBioChange}
          placeholder={`Tell people about ${companionName}…`}
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[
            styles.bioInput,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 },
          ]}
        />
      </View>
    );
  }

  if (!text && !vaccinated && !neutered) return null;

  return (
    <View style={styles.section}>
      {text ? (
        <Text
          style={[styles.bio, { color: colors.textSecondary }]}
          numberOfLines={3}
        >
          {text}
        </Text>
      ) : null}
      <CompanionHealthMetaLine
        vaccinated={vaccinated}
        neutered={neutered}
        gender={gender}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 4,
    alignSelf: 'stretch',
  },
  bio: {
    fontSize: 13,
    lineHeight: 19,
  },
  bioInput: {
    fontSize: 13,
    lineHeight: 19,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
