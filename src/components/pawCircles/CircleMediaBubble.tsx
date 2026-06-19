import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Linking, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import {
  formatVoiceDuration,
  resolveCircleMediaSignedUrl,
  type CircleMediaKind,
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

function CirclePhotoBubble({
  mediaUrl,
  thumbUrl,
  caption,
  bubbleBg,
  maxWidth,
}: {
  mediaUrl: string;
  thumbUrl?: string;
  caption?: string;
  bubbleBg: string;
  maxWidth: number;
}) {
  const { colors } = useTheme();
  const { uri, loading } = useSignedMediaUrl(thumbUrl ?? mediaUrl);

  return (
    <View style={[styles.mediaBubble, { backgroundColor: bubbleBg, maxWidth }]}>
      <View style={[styles.photoFrame, { backgroundColor: colors.surface2 }]}>
        {loading || !uri ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Image
            source={{ uri }}
            style={styles.photo}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}
      </View>
      {caption ? (
        <Text style={[styles.caption, { color: colors.text }]}>{caption}</Text>
      ) : null}
    </View>
  );
}

function CircleFileBubble({
  name,
  size,
  mediaUrl,
  caption,
  bubbleBg,
  maxWidth,
}: {
  name: string;
  size: string;
  mediaUrl: string;
  caption?: string;
  bubbleBg: string;
  maxWidth: number;
}) {
  const { colors } = useTheme();

  const openFile = async () => {
    const url = await resolveCircleMediaSignedUrl(mediaUrl);
    void Linking.openURL(url);
  };

  return (
    <Pressable
      onPress={() => { void openFile(); }}
      style={[styles.mediaBubble, styles.fileBubble, { backgroundColor: bubbleBg, maxWidth }]}
      accessibilityRole="button"
      accessibilityLabel={`Open file ${name}`}
    >
      <View style={[styles.fileIconWrap, { backgroundColor: colors.primary + '18' }]}>
        <Icon name="paperclip" size={18} color={colors.primary} />
      </View>
      <View style={styles.fileBody}>
        <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={2}>{name}</Text>
        {size ? (
          <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>{size}</Text>
        ) : null}
      </View>
      <Icon name="chevronRight" size={16} color={colors.textTertiary} />
      {caption ? (
        <Text style={[styles.caption, { color: colors.text, width: '100%' }]}>{caption}</Text>
      ) : null}
    </Pressable>
  );
}

function CircleVoiceBubble({
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

export function CircleMediaBubble({
  mediaKind,
  name,
  size,
  mediaUrl,
  thumbUrl,
  mime,
  durationMs,
  caption,
  bubbleBg,
  maxWidth,
}: {
  mediaKind: CircleMediaKind;
  name: string;
  size: string;
  mediaUrl: string;
  thumbUrl?: string;
  mime?: string;
  durationMs?: number;
  caption?: string;
  bubbleBg: string;
  maxWidth: number;
}) {
  if (mediaKind === 'photo') {
    return (
      <CirclePhotoBubble
        mediaUrl={mediaUrl}
        thumbUrl={thumbUrl}
        caption={caption}
        bubbleBg={bubbleBg}
        maxWidth={maxWidth}
      />
    );
  }
  if (mediaKind === 'audio') {
    return (
      <CircleVoiceBubble
        mediaUrl={mediaUrl}
        durationMs={durationMs}
        caption={caption}
        bubbleBg={bubbleBg}
        maxWidth={maxWidth}
      />
    );
  }
  return (
    <CircleFileBubble
      name={name}
      size={size}
      mediaUrl={mediaUrl}
      caption={caption}
      bubbleBg={bubbleBg}
      maxWidth={maxWidth}
    />
  );
}

const styles = StyleSheet.create({
  mediaBubble: {
    borderRadius: radius.xl,
    padding: spacing.sm,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  photoFrame: {
    width: 220,
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  caption: { ...typography.bodySm, lineHeight: 21, paddingHorizontal: 2 },
  fileBubble: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 220,
  },
  fileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileBody: { flex: 1, minWidth: 120, gap: 2 },
  fileName: { fontSize: 14.5, fontWeight: '700', lineHeight: 19 },
  fileMeta: { fontSize: 12.5 },
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
