import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';

type ChatAttachmentCardProps = {
  label: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Photo attachments fill the card width with no inner inset. */
  flushMedia?: boolean;
  maxWidth?: number;
};

/** Bordered white card shell for shared posts, photos, and files in chat. */
export function ChatAttachmentCard({
  label,
  children,
  footer,
  onPress,
  accessibilityLabel,
  flushMedia = false,
  maxWidth,
}: ChatAttachmentCardProps) {
  const { colors } = useTheme();
  const cardPad = spacing.md + 2;

  const body = (
    <View
      style={[
        styles.card,
        flushMedia && styles.cardFlushMedia,
        {
          borderColor: colors.border,
          backgroundColor: colors.surface,
          maxWidth,
          width: maxWidth,
        },
      ]}
    >
      <Text style={[styles.label, flushMedia && { marginBottom: spacing.sm + 2 }, { color: colors.textTertiary }]}>
        {label}
      </Text>
      <View
        style={[
          styles.content,
          flushMedia && { marginHorizontal: -cardPad, gap: 0 },
        ]}
      >
        {children}
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
    >
      {body}
    </Pressable>
  );
}

export function ChatAttachmentOpenLink({
  label,
  tint,
}: {
  label: string;
  tint: string;
}) {
  return (
    <View style={styles.openRow}>
      <Text style={[styles.openLabel, { color: tint }]}>{label}</Text>
      <Text style={[styles.openChevron, { color: tint }]}>{'›'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md + 2,
    gap: spacing.sm + 2,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxSizing: 'border-box' as const },
      default: {},
    }),
  },
  label: {
    ...typography.sectionLabel,
    fontSize: 10,
    letterSpacing: 0.9,
  },
  cardFlushMedia: {
    paddingBottom: 0,
  },
  content: {
    gap: spacing.sm + 2,
  },
  footer: {
    alignItems: 'flex-end',
    paddingTop: 2,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  openChevron: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: -1,
  },
});
