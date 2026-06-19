import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import {
  formatVoiceDuration,
  resolveCircleMediaSignedUrl,
} from '../../lib/circleChatMedia';

function useSignedMediaUrl(storedUrl: string) {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void resolveCircleMediaSignedUrl(storedUrl).then(next => {
      if (cancelled) return;
      setUri(next);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setUri(storedUrl);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [storedUrl]);

  return { uri, loading };
}

export function CircleVoiceBubble({
  mediaUrl,
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
  const { uri, loading } = useSignedMediaUrl(mediaUrl);
  const player = useAudioPlayer(uri, { downloadFirst: true });
  const status = useAudioPlayerStatus(player);
  const label = useMemo(
    () => formatVoiceDuration(status.duration > 0 ? status.duration * 1000 : durationMs),
    [durationMs, status.duration],
  );

  const toggle = () => {
    if (!uri || loading) return;
    if (status.playing) player.pause();
    else player.play();
  };

  return (
    <View style={[styles.mediaBubble, { backgroundColor: bubbleBg, maxWidth }]}>
      <Pressable
        onPress={toggle}
        disabled={loading || !uri}
        style={[styles.voiceRow, { backgroundColor: colors.surface2 }]}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice note' : 'Play voice note'}
      >
        <View style={[styles.voicePlay, { backgroundColor: colors.primary }]}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Icon
              name={status.playing ? 'pause' : 'play-square'}
              size={16}
              color={colors.onPrimary}
              fill={status.playing ? 'none' : colors.onPrimary}
            />
          )}
        </View>
        <View style={styles.voiceWave}>
          {[0.35, 0.7, 1, 0.55, 0.85, 0.45, 0.95, 0.6].map((h, i) => (
            <View
              key={i}
              style={[
                styles.voiceBar,
                {
                  height: 8 + h * 14,
                  backgroundColor: colors.primary + (status.playing ? 'CC' : '66'),
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.voiceTime, { color: colors.textSecondary }]}>{label}</Text>
      </Pressable>
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
  voiceWave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 24,
  },
  voiceBar: {
    width: 3,
    borderRadius: 2,
  },
  voiceTime: { fontSize: 12.5, fontWeight: '600', minWidth: 36, textAlign: 'right' },
});
