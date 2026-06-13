import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../icons/Icon';
import { PhotoSlot } from './PhotoSlot';

/** Tappable media tile that always shows a mock photo preview. */
export function MockMediaTile({
  imageKey,
  imageIndex = 0,
  filled,
  icon,
  label,
  onPress,
  size = 'square',
  showPlay = false,
}: {
  imageKey: string;
  imageIndex?: number;
  filled?: boolean;
  icon?: string;
  label: string;
  onPress: () => void;
  size?: 'square' | 'wide';
  showPlay?: boolean;
}) {
  const { colors } = useTheme();
  const isWide = size === 'wide';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        isWide ? styles.videoTile : styles.photoTile,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[isWide ? styles.videoTileInner : styles.photoTileInner, styles.tileFrame]}>
        <PhotoSlot
          height={isWide ? 88 : 96}
          imageKey={imageKey}
          imageIndex={imageIndex}
          label=""
          borderRadius={12}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.overlay, { backgroundColor: filled ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.28)' }]}>
          {filled ? (
            <View style={[styles.filledBadge, { backgroundColor: colors.success }]}>
              <Icon name="check" size={12} color={colors.onPrimary} />
            </View>
          ) : (
            <Icon name={icon ?? 'image'} size={isWide ? 22 : 20} color="#fff" />
          )}
          {showPlay && filled && (
            <View style={[styles.playCircle, { backgroundColor: colors.primary }]}>
              <Icon name="play-square" size={18} color={colors.onPrimary} />
            </View>
          )}
          <Text style={styles.tileLabel} numberOfLines={2}>{label}</Text>
          {filled ? (
            <Text style={styles.tileHint}>Tap to remove</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  photoTile: { width: 96, height: 96 },
  videoTile: { flex: 1, minHeight: 88 },
  photoTileInner: { width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' },
  videoTileInner: { width: '100%', minHeight: 88, borderRadius: 12, overflow: 'hidden' },
  tileFrame: { position: 'relative' },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 8,
  },
  filledBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tileHint: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
});
