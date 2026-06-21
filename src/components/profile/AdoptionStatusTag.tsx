import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { chatSublineAccentColor, type ChatSublineTone } from '../../utils/chatThreadMeta';

function tagColors(tone: ChatSublineTone | 'danger', colors: ReturnType<typeof useTheme>['colors']) {
  if (tone === 'danger') {
    return { bg: colors.dangerBg, text: colors.danger };
  }
  const text = chatSublineAccentColor(tone, colors);
  switch (tone) {
    case 'warning': return { bg: colors.warningBg, text };
    case 'success': return { bg: colors.successBg, text };
    case 'primary': return { bg: colors.infoBg, text };
    default: return { bg: colors.surface2, text };
  }
}

export function AdoptionStatusTag({ label, tone }: { label: string; tone: ChatSublineTone | 'danger' }) {
  const { colors } = useTheme();
  const tag = tagColors(tone, colors);
  return (
    <View style={[styles.tag, { backgroundColor: tag.bg }]}>
      <Text style={[styles.tagText, { color: tag.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
    maxWidth: 140,
  },
  tagText: {
    ...typography.caption,
    fontSize: 11.5,
    fontWeight: '700',
  },
});
