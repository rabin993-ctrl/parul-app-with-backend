import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme/tokens';
import { Icon } from '../icons/Icon';

const webInputOutline = Platform.select({ web: { outlineStyle: 'none' } as object, default: {} });
const webBioInputExtra = Platform.select({ web: { resize: 'none' } as object, default: {} });

export function ProfileSettingsEditForm({
  name,
  handle,
  bio,
  location,
  locationPlaceholder = 'City or neighbourhood',
  onNameChange,
  onHandleChange,
  onBioChange,
  onLocationChange,
}: {
  name: string;
  handle: string;
  bio: string;
  location: string;
  locationPlaceholder?: string;
  onNameChange: (v: string) => void;
  onHandleChange: (v: string) => void;
  onBioChange: (v: string) => void;
  onLocationChange: (v: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.form}>
      <View style={styles.fieldBlock}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Name</Text>
        <View style={[styles.fieldShell, { borderBottomColor: colors.border }]}>
          <TextInput
            value={name}
            onChangeText={onNameChange}
            placeholder="Your name"
            placeholderTextColor={colors.textTertiary}
            autoFocus
            style={[styles.fieldInput, { color: colors.text }, webInputOutline]}
          />
        </View>
      </View>
      <View style={styles.fieldBlock}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Username</Text>
        <View style={[styles.fieldShell, { borderBottomColor: colors.border }]}>
          <TextInput
            value={`@${handle}`}
            onChangeText={text => onHandleChange(text.replace(/^@+/, ''))}
            placeholder="@username"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.fieldInput, { color: colors.text }, webInputOutline]}
          />
        </View>
      </View>
      <View style={styles.fieldBlock}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bio</Text>
        <View style={[styles.fieldShell, { borderBottomColor: colors.border }]}>
          <TextInput
            value={bio}
            onChangeText={onBioChange}
            placeholder="Write a short bio…"
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
            style={[
              styles.fieldInput,
              styles.bioInput,
              { color: colors.text },
              webInputOutline,
              webBioInputExtra,
            ]}
          />
        </View>
      </View>
      <View style={styles.fieldBlock}>
        <View style={styles.fieldLabelRow}>
          <Icon name="mapPin" size={12} color={colors.primary} sw={2.2} />
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Location</Text>
        </View>
        <View style={[styles.fieldShell, { borderBottomColor: colors.border }]}>
          <TextInput
            value={location}
            onChangeText={onLocationChange}
            placeholder={locationPlaceholder}
            placeholderTextColor={colors.textTertiary}
            style={[styles.fieldInput, { color: colors.text }, webInputOutline]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    alignSelf: 'stretch',
    width: '100%',
    gap: spacing.md,
  },
  fieldBlock: {
    alignItems: 'stretch',
    width: '100%',
  },
  fieldLabel: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'left',
    marginBottom: spacing.xs,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  fieldShell: {
    width: '100%',
    minHeight: 36,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.sm,
  },
  fieldInput: {
    paddingHorizontal: 0,
    paddingVertical: Platform.OS === 'web' ? 6 : 4,
    margin: 0,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    minHeight: 28,
    textAlign: 'left',
    width: '100%',
  },
  bioInput: {
    minHeight: 32,
  },
});
