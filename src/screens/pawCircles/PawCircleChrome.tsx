import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { IconButton } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';

export function PawCirclePageHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={styles.pageHeader}>
      <IconButton
        name="chevronLeft"
        size={40}
        tone="soft"
        color={colors.textSecondary}
        onPress={onBack ?? (() => navigation.goBack())}
      />
      <Text style={[styles.pageHeaderTitle, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.pageHeaderSide}>{right ?? null}</View>
    </View>
  );
}

export function PawCircleHubHeader({
  showBack,
  onBack,
}: {
  showBack?: boolean;
  onBack?: () => void;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation();

  return (
    <View style={styles.hubHeader}>
      {showBack ? (
        <IconButton
          name="chevronLeft"
          size={40}
          tone="soft"
          color={colors.textSecondary}
          onPress={onBack ?? (() => navigation.goBack())}
        />
      ) : (
        <View style={styles.pageHeaderSide} />
      )}
      <View style={styles.hubHeaderCenter}>
        <Text style={[styles.hubHeaderTitle, { color: colors.text }]}>Paw Circle</Text>
      </View>
      <View style={styles.pageHeaderSide}>
        <IconButton name="bell" size={40} tone="soft" color={colors.textSecondary} count={2} />
      </View>
    </View>
  );
}

export function PawCircleSectionLabel({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{children}</Text>
  );
}

export function PawCircleHairline({ inset = 0, style }: { inset?: number; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.hairline,
        { backgroundColor: colors.border, marginLeft: inset },
        style,
      ]}
    />
  );
}

export function PawCircleActionPill({
  label,
  icon,
  tint,
  onPress,
  compact,
}: {
  label: string;
  icon: string;
  tint: string;
  onPress: () => void;
  compact?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionPill,
        compact && styles.actionPillCompact,
        { backgroundColor: tint + '14', opacity: pressed ? 0.72 : 1 },
        Platform.OS === 'web' && styles.actionPillWeb,
      ]}
    >
      <Icon name={icon} size={compact ? 15 : 17} color={tint} sw={2} />
      <Text style={[
        styles.actionPillLabel,
        compact && styles.actionPillLabelCompact,
        { color: colors.text },
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function CircleSettingsSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.settingsSection}>
      <View style={styles.settingsSectionHead}>
        <PawCircleSectionLabel>{title}</PawCircleSectionLabel>
        {action}
      </View>
      {children}
    </View>
  );
}

export function CircleSettingsRow({
  icon,
  label,
  hint,
  tint,
  onPress,
  trailing,
  showDivider,
  danger,
}: {
  icon: string;
  label: string;
  hint?: string;
  tint?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  showDivider?: boolean;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  const accent = danger ? colors.lost : (tint ?? colors.primary);

  const inner = (
    <View style={styles.settingsRow}>
      <View style={[styles.settingsIconWell, { backgroundColor: accent + '14' }]}>
        <Icon name={icon} size={18} color={accent} sw={2} />
      </View>
      <View style={styles.settingsRowBody}>
        <Text style={[styles.settingsRowLabel, { color: danger ? colors.lost : colors.text }]}>
          {label}
        </Text>
        {hint ? (
          <Text style={[styles.settingsRowHint, { color: colors.textTertiary }]}>{hint}</Text>
        ) : null}
      </View>
      <View style={styles.settingsRowTrailing}>{trailing}</View>
    </View>
  );

  return (
    <View>
      {onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [pressed && styles.settingsRowPressed]}
        >
          {inner}
        </Pressable>
      ) : (
        inner
      )}
      {showDivider ? <PawCircleHairline inset={56} /> : null}
    </View>
  );
}

export function PawCircleSearchField({
  value,
  onChangeText,
  placeholder,
  onClear,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  onClear?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.searchField, { backgroundColor: colors.primary + '10' }]}>
      <Icon name="search" size={20} color={colors.primary} sw={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        style={[styles.searchInput, { color: colors.text }]}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {value.length > 0 && onClear && (
        <Pressable onPress={onClear} hitSlop={8}>
          <Icon name="close" size={16} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

export const pawCircleStyles = StyleSheet.create({
  pageScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  detailScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xl2,
  },
  flatList: {
    gap: 0,
  },
  flatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 2,
    paddingVertical: spacing.sm + 3,
    minHeight: 52,
  },
});

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  pageHeaderTitle: {
    ...typography.title,
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    letterSpacing: -0.2,
  },
  pageHeaderSide: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  hubHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  hubHeaderTitle: {
    ...typography.heroName,
    fontSize: 20,
    letterSpacing: -0.35,
  },
  sectionLabel: {
    ...typography.sectionLabel,
    marginLeft: 2,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
  },
  actionPillWeb: { cursor: 'pointer' as const },
  actionPillLabel: {
    ...typography.label,
    fontSize: 14,
  },
  actionPillCompact: {
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    gap: 6,
  },
  actionPillLabelCompact: {
    fontSize: 12.5,
  },
  settingsSection: {
    gap: spacing.sm,
  },
  settingsSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 2,
    paddingVertical: spacing.sm + 3,
    minHeight: 58,
  },
  settingsRowPressed: { opacity: 0.68 },
  settingsIconWell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settingsRowBody: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  settingsRowLabel: {
    ...typography.label,
    fontSize: 15,
    letterSpacing: -0.15,
  },
  settingsRowHint: {
    ...typography.meta,
    lineHeight: 16,
  },
  settingsRowTrailing: {
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    ...Platform.select({
      web: { outlineStyle: 'none' } as object,
      default: {},
    }),
  },
});
