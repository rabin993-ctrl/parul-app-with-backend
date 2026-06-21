import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Linking, ActivityIndicator, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { ChatPhotoViewer } from '../chat/ChatPhotoViewer';
import {
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
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <>
      <View
        style={[
          styles.mediaBubble,
          styles.photoBubble,
          { backgroundColor: bubbleBg, maxWidth, width: maxWidth },
        ]}
      >
        <Pressable
          onPress={() => setViewerOpen(true)}
          disabled={loading || !uri}
          accessibilityRole="button"
          accessibilityLabel="View full photo"
          style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
        >
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
        </Pressable>
        {caption ? (
          <Text style={[styles.caption, styles.photoCaption, { color: colors.text }]}>
            {caption}
          </Text>
        ) : null}
      </View>
      <ChatPhotoViewer
        visible={viewerOpen}
        mediaUrl={mediaUrl}
        caption={caption}
        onClose={() => setViewerOpen(false)}
      />
    </>
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

  const open = async () => {
    const url = await resolveCircleMediaSignedUrl(mediaUrl);
    void Linking.openURL(url);
  };

  return (
    <Pressable
      onPress={() => { void open(); }}
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

export function CircleMediaBubble({
  mediaKind,
  name,
  size,
  mediaUrl,
  thumbUrl,
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
  photoBubble: {
    padding: 0,
    gap: 0,
    ...Platform.select({
      web: { boxSizing: 'border-box' as const },
      default: {},
    }),
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  caption: { ...typography.bodySm, lineHeight: 21, paddingHorizontal: 2 },
  photoCaption: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm + 2,
  },
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
});
