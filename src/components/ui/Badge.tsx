import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../icons/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';

type Tone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  tone?: Tone;
  icon?: string;
  style?: any;
  children: React.ReactNode;
}

export function Badge({ tone = 'neutral', icon, style, children }: BadgeProps) {
  const { colors } = useTheme();

  const toneMap: Record<Tone, { bg: string; text: string }> = {
    neutral:  { bg: colors.neutralBg,  text: colors.textSecondary },
    primary:  { bg: colors.primary + '22', text: colors.primary },
    accent:   { bg: colors.accent + '22',  text: colors.accent },
    success:  { bg: colors.successBg,   text: colors.success },
    warning:  { bg: colors.warningBg,   text: colors.warning },
    danger:   { bg: colors.dangerBg,    text: colors.danger },
    info:     { bg: colors.infoBg,      text: colors.info },
  };

  const { bg, text } = toneMap[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      {icon && <Icon name={icon} size={11} color={text} />}
      <Text style={[styles.label, { color: text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});
