import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { formatVoiceDuration } from '../../lib/circleChatMedia';

export function CircleVoiceBubble({
  durationMs,
  caption,
  bubbleBg,
  maxWidth,
}: {
  mediaUrl: string;
  durationMs?: number;
  caption?: string;
  bubbleBg: string;
  maxWidth: number;
}) {
  const { colors } = useTheme();
  const label = formatVoiceDuration(durationMs);

  return (
    <View style={[styles.mediaBubble, { backgroundColor: bubbleBg, maxWidth }]}>
      <View style={[styles.voiceRow, { backgroundColor: colors.surface2 }]}>
        <View style={[styles.voicePlay, { backgroundColor: colors.primary + '66' }]}>
          <Icon name="mic" size={16} color={colors.onPrimary} />
        </View>
        <Text style={[styles.voiceLabel, { color: colors.textSecondary }]}>
          Voice note
        </Text>
        <Text style={[styles.voiceTime, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      {caption ? (
        <Text style={[styles.caption, { color: colors.text }]}>{caption}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mediaBubble: {
    borderRadius: radius.xl,
    padding: spacing.sm,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  caption: { ...typography.bodySm, lineHeight: 21, paddingHorizontal: 2 },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minWidth: 220,
  },
  voicePlay: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  voiceLabel: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  voiceTime: { fontSize: 12.5, fontWeight: '600', minWidth: 36, textAlign: 'right' },
});
