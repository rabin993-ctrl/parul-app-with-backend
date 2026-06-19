import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';

type GlossyPillProps = {
  borderRadius?: number;
  style?: object;
  /** Top hairline + layered shine — can read as a seam on small tab indicators. */
  showGloss?: boolean;
};

export function GlossyPill({ borderRadius = 22, style, showGloss = true }: GlossyPillProps) {
  const { isDark } = useTheme();

  const baseColors: [string, string, string] = isDark
    ? ['#3A3250', '#2A243C', '#221C32']
    : ['#FCFAFE', '#F5F0FA', '#EDE8F4'];

  const shineColors: [string, string, string] = isDark
    ? ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.05)', 'rgba(168,143,232,0.12)']
    : ['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.38)', 'rgba(124,92,191,0.07)'];

  const ringColor = isDark ? 'rgba(168,143,232,0.28)' : 'rgba(124,92,191,0.16)';
  const glossLine = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.82)';

  return (
    <View style={[styles.pill, { borderRadius }, style]}>
      <LinearGradient
        colors={baseColors}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {showGloss ? (
        <LinearGradient
          colors={shineColors}
          locations={[0, 0.45, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,255,255,0.1)', 'transparent']
              : ['rgba(255,255,255,0.55)', 'transparent']
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {showGloss ? <View style={[styles.glossLine, { backgroundColor: glossLine }]} /> : null}
      <View style={[styles.ring, { borderColor: ringColor, borderRadius }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    overflow: 'hidden',
    ...StyleSheet.absoluteFill,
  },
  glossLine: {
    position: 'absolute',
    top: 3,
    left: 10,
    right: 10,
    height: 1,
    borderRadius: 1,
  },
  ring: {
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
  },
});
