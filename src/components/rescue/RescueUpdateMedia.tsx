import React from 'react';
import { View, Image, Pressable, StyleSheet, Platform } from 'react-native';
import { radius } from '../../theme/tokens';

export function RescueUpdateMedia({
  urls,
  onPressImage,
}: {
  urls: string[];
  onPressImage: (index: number) => void;
}) {
  const count = urls.length;
  if (count === 0) return null;

  if (count === 1) {
    return (
      <Pressable
        onPress={() => onPressImage(0)}
        style={({ pressed }) => [styles.single, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="View photo"
      >
        <Image source={{ uri: urls[0] }} style={styles.fill} resizeMode="cover" />
      </Pressable>
    );
  }

  if (count === 2) {
    return (
      <View style={styles.row}>
        {urls.map((uri, i) => (
          <Pressable
            key={`${i}-${uri}`}
            onPress={() => onPressImage(i)}
            style={({ pressed }) => [styles.half, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`View photo ${i + 1} of ${count}`}
          >
            <Image source={{ uri }} style={styles.fill} resizeMode="cover" />
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {urls.map((uri, i) => (
        <Pressable
          key={`${i}-${uri}`}
          onPress={() => onPressImage(i)}
          style={({ pressed }) => [styles.gridCell, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`View photo ${i + 1} of ${count}`}
        >
          <Image source={{ uri }} style={styles.fill} resizeMode="cover" />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  single: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  half: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gridCell: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  pressed: { opacity: 0.92 },
});
