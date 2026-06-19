import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import type { PickedAsset } from '../../hooks/useMediaPicker';
import type { PickedFile } from '../../hooks/useFilePicker';

export type ChatAttachmentDraft =
  | { kind: 'photo'; asset: PickedAsset }
  | { kind: 'file'; file: PickedFile };

export function ChatPendingAttachmentPreview({
  draft,
  onClear,
}: {
  draft: ChatAttachmentDraft;
  onClear: () => void;
}) {
  const { colors } = useTheme();

  if (draft.kind === 'photo') {
    return (
      <View style={styles.wrap}>
        <View style={[styles.photoFrame, { borderColor: colors.border }]}>
          <Image
            source={{ uri: draft.asset.uri }}
            style={styles.photo}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <Pressable
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel="Remove photo"
            style={styles.removeBtn}
            hitSlop={8}
          >
            <Icon name="close" size={14} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.fileChip, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
        <View style={[styles.fileIcon, { backgroundColor: colors.primary + '18' }]}>
          <Icon name="paperclip" size={16} color={colors.primary} />
        </View>
        <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
          {draft.file.name}
        </Text>
        <Pressable
          onPress={onClear}
          accessibilityRole="button"
          accessibilityLabel="Remove file"
          hitSlop={8}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Icon name="close" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  photoFrame: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    maxWidth: '100%',
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fileName: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '600',
  },
});
