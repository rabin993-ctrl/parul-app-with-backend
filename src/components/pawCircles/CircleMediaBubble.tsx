import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Linking, ActivityIndicator, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import {
  resolveCircleMediaSignedUrl,
  type CircleMediaKind,
} from '../../lib/circleChatMedia';
import { CircleVoiceBubble } from './CircleVoiceBubble';
import { ChatAttachmentCard } from '../chat/ChatAttachmentCard';
import { ChatPhotoViewer } from '../chat/ChatPhotoViewer';

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
  const photoWidth = Math.min(maxWidth, 280);

  return (
    <>
      <Pressable
        onPress={() => setViewerOpen(true)}
        disabled={loading || !uri}
        accessibilityRole="button"
        accessibilityLabel="View photo"
        style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
      >
        <View
          style={[
            styles.photoCard,
            {
              width: photoWidth,
              maxWidth: photoWidth,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <View style={styles.photoFrame}>
            {loading || !uri ? (
              <View style={[styles.photoLoading, { backgroundColor: colors.surface2 }]}>
                <ActivityIndicator color={colors.primary} />
              </View>
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
            <View style={styles.photoCaptionWrap}>
              <Text style={[styles.photoCaption, { color: colors.text }]}>{caption}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
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
    <ChatAttachmentCard label="File">
      <Pressable
        onPress={() => { void openFile(); }}
        style={({ pressed }) => [
          styles.fileRow,
          { opacity: pressed ? 0.82 : 1 },
        ]}
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
      </Pressable>
      {caption ? (
        <Text style={[styles.photoCaption, { color: colors.text }]}>{caption}</Text>
      ) : null}
    </ChatAttachmentCard>
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
  photoCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxSizing: 'border-box' as const },
      default: {},
    }),
  },
  photoFrame: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
  },
  photoLoading: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  photoCaptionWrap: {
    paddingHorizontal: spacing.md + 2,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.md + 2,
  },
  photoCaption: {
    ...typography.bodySm,
    lineHeight: 21,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 200,
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
