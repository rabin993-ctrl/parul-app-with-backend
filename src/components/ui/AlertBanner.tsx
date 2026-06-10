import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../icons/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';

type AlertTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

interface AlertBannerProps {
  tone?: AlertTone;
  icon?: string;
  title?: string;
  body?: string;
  children?: React.ReactNode;
}

export function AlertBanner({ tone = 'info', icon = 'shield', title, body, children }: AlertBannerProps) {
  const { colors } = useTheme();

  const toneMap: Record<AlertTone, { bg: string; fg: string }> = {
    neutral: { bg: colors.neutralBg,   fg: colors.textSecondary },
    primary: { bg: colors.primary + '18', fg: colors.primary },
    accent:  { bg: colors.accent + '18',  fg: colors.accent },
    success: { bg: colors.successBg,    fg: colors.success },
    warning: { bg: colors.warningBg,    fg: colors.warning },
    danger:  { bg: colors.dangerBg,     fg: colors.danger },
    info:    { bg: colors.infoBg,       fg: colors.info },
  };

  const { bg, fg } = toneMap[tone];

  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor: fg + '22' }]}>
      <View style={{ marginTop: 1 }}>
        <Icon name={icon} size={20} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        {title && <Text style={[styles.title, { color: fg }]}>{title}</Text>}
        <Text style={[styles.body, { color: colors.textSecondary, marginTop: title ? 2 : 0 }]}>{body ?? children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 11,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  title: { fontSize: 13.5, fontWeight: '700' },
  body: { fontSize: 13.5, lineHeight: 19 },
});
