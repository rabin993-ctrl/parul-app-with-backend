import React, { useCallback } from 'react';
import {
  View, Text, Pressable, Image, StyleSheet, Alert, Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { useMediaPicker, type PickedAsset } from '../../hooks/useMediaPicker';

const DEFAULT_MAX_PHOTOS = 5;
const SLOT = 72;

export function AdoptionPhotoPicker({
  photos,
  onChange,
  label,
  required = false,
  maxPhotos = DEFAULT_MAX_PHOTOS,
  addPromptTitle = 'Add photo',
  addPromptMessage = 'Choose a photo',
  hint = 'Tap Add to attach photos. Tap a photo to remove it.',
  showRequiredHint = true,
}: {
  photos: PickedAsset[];
  onChange: (photos: PickedAsset[]) => void;
  label?: string;
  required?: boolean;
  maxPhotos?: number;
  addPromptTitle?: string;
  addPromptMessage?: string;
  hint?: string;
  showRequiredHint?: boolean;
}) {
  const { colors } = useTheme();
  const { pickImage, takePhoto } = useMediaPicker();
  const displayLabel = label ?? (
    required
      ? `PHOTOS (UP TO ${maxPhotos}) · REQUIRED`
      : `PHOTOS (UP TO ${maxPhotos})`
  );

  const addPhoto = useCallback(async (source: 'library' | 'camera') => {
    if (photos.length >= maxPhotos) return;
    const asset = source === 'camera' ? await takePhoto() : await pickImage();
    if (asset) onChange([...photos, asset]);
  }, [photos, maxPhotos, pickImage, takePhoto, onChange]);

  const openAdd = useCallback(() => {
    if (photos.length >= maxPhotos) return;
    if (Platform.OS === 'web') {
      void addPhoto('library');
      return;
    }
    Alert.alert(addPromptTitle, addPromptMessage, [
      { text: 'Photo library', onPress: () => { void addPhoto('library'); } },
      { text: 'Take photo', onPress: () => { void addPhoto('camera'); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [addPhoto, addPromptMessage, addPromptTitle, maxPhotos, photos.length]);

  const removeAt = useCallback((index: number) => {
    onChange(photos.filter((_, i) => i !== index));
  }, [photos, onChange]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{displayLabel}</Text>
      <View style={styles.row}>
        {Array.from({ length: maxPhotos }).map((_, i) => {
          const photo = photos[i];
          if (photo) {
            return (
              <Pressable
                key={i}
                onPress={() => removeAt(i)}
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${i + 1}`}
                style={({ pressed }) => [
                  styles.slot,
                  styles.filled,
                  { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Image source={{ uri: photo.uri }} style={styles.image} resizeMode="cover" />
                <View style={[styles.removeBadge, { backgroundColor: colors.bg }]}>
                  <Icon name="close" size={12} color={colors.textSecondary} sw={2.2} />
                </View>
              </Pressable>
            );
          }
          if (i === photos.length) {
            return (
              <Pressable
                key={i}
                onPress={openAdd}
                accessibilityRole="button"
                accessibilityLabel="Add photo"
                style={({ pressed }) => [
                  styles.slot,
                  styles.add,
                  { borderColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Icon name="image" size={22} color={colors.primary} />
                <Text style={[styles.addText, { color: colors.primary }]}>Add</Text>
              </Pressable>
            );
          }
          return (
            <View
              key={i}
              style={[styles.slot, styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}
            />
          );
        })}
      </View>
      {hint ? (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>{hint}</Text>
      ) : null}
      {required && showRequiredHint && photos.length === 0 ? (
        <Text style={[styles.requiredHint, { color: colors.warning }]}>
          Add at least one photo.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    width: SLOT,
    height: SLOT,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  filled: { borderWidth: 1 },
  add: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  empty: { borderWidth: 1, borderStyle: 'dashed', opacity: 0.45 },
  image: { width: '100%', height: '100%' },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontSize: 11, fontWeight: '700' },
  hint: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  requiredHint: { fontSize: 11.5, fontWeight: '600', marginTop: 6 },
});
