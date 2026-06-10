import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type GlossyPillProps = {
  borderRadius?: number;
  style?: object;
};

export function GlossyPill({ borderRadius = 22, style }: GlossyPillProps) {
  return (
    <View style={[styles.pill, { borderRadius }, style]}>
      <LinearGradient
        colors={['#FFFFFF', '#F8F4FC', '#F0EAF7']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.38)', 'rgba(124,92,191,0.07)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glossLine} />
      <View style={[styles.ring, { borderColor: 'rgba(124,92,191,0.16)', borderRadius }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    overflow: 'hidden',
    ...StyleSheet.absoluteFillObject,
  },
  glossLine: {
    position: 'absolute',
    top: 3,
    left: 10,
    right: 10,
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
});
