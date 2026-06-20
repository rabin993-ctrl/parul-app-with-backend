import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { helpTypeLabel } from '../../utils/rescueHelpOffers';
import type { RescueHelpChatContext } from '../../utils/rescueHelpChat';

type Props = {
  context: RescueHelpChatContext;
  backgroundColor?: string;
  onViewCase: () => void;
};

export function RescueHelpChatBanner({ context, backgroundColor, onViewCase }: Props) {
  const { colors } = useTheme();
  const typeLabel = helpTypeLabel(context.helpType);

  return (
    <View style={[styles.wrap, { backgroundColor: backgroundColor ?? colors.bg, borderBottomColor: colors.border }]}>
      <View style={[styles.inner, { backgroundColor: colors.primary + '12' }]}>
        <Icon name="shield" size={16} color={colors.primary} />
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            Rescue help · {context.caseName}
          </Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
            {typeLabel}
          </Text>
        </View>
        <Pressable
          onPress={onViewCase}
          hitSlop={8}
          style={({ pressed }) => [styles.linkWrap, pressed && styles.pressed]}
          accessibilityRole="link"
          accessibilityLabel={`View case ${context.caseName}`}
        >
          <Text style={[styles.link, { color: colors.primary }]}>View case</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 13.5, fontWeight: '700' },
  sub: { fontSize: 12, fontWeight: '600' },
  linkWrap: { paddingVertical: 2, paddingHorizontal: 4 },
  link: { fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
