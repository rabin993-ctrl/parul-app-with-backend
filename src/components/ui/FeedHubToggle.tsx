import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Animated, Easing,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { GlossyPill } from './GlossyPill';

export type HubToggleItem = { id: string; label: string };

type FeedHubToggleProps = {
  items: HubToggleItem[];
  value: string;
  onChange: (id: string) => void;
};

const SHELL_RADIUS = 14;
const THUMB_RADIUS = 10;

export function FeedHubToggle({ items, value, onChange }: FeedHubToggleProps) {
  const { colors, mode } = useTheme();
  const isDark = mode === 'dark';
  const [rowWidth, setRowWidth] = useState(0);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const translateX = useRef(new Animated.Value(0)).current;

  const activeIndex = Math.max(0, items.findIndex(i => i.id === value));
  const segmentW = rowWidth > 0 ? rowWidth / items.length : 0;
  const targetX = segmentW * activeIndex;

  const pillBorder = {
    borderColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.72)',
    borderTopColor: isDark ? 'rgba(255, 255, 255, 0.38)' : 'rgba(255, 255, 255, 0.95)',
    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.28)',
  };

  useEffect(() => {
    if (rowWidth <= 0) return;
    Animated.timing(translateX, {
      toValue: targetX,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [targetX, rowWidth, translateX]);

  return (
    <View style={[styles.shell, styles.shellShadow, pillBorder]}>
      <BlurView
        intensity={isDark ? 38 : 62}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? 'rgba(28, 36, 48, 0.42)'
              : 'rgba(255, 255, 255, 0.14)',
          },
        ]}
      />
      <LinearGradient
        colors={
          isDark
            ? ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)', 'transparent']
            : ['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.02)']
        }
        locations={[0, 0.38, 0.72]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topShine}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.35)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.85 }}
        style={styles.diagonalShine}
        pointerEvents="none"
      />
      <View
        pointerEvents="none"
        style={[
          styles.rimHighlight,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.82)' },
        ]}
      />

      <View
        style={styles.row}
        onLayout={e => setRowWidth(e.nativeEvent.layout.width)}
      >
        {rowWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.thumbWrap,
              { width: segmentW, transform: [{ translateX }] },
            ]}
          >
            <View style={styles.activePill}>
              <GlossyPill borderRadius={THUMB_RADIUS} />
            </View>
          </Animated.View>
        )}

        {items.map((item, index) => {
          const selected = value === item.id;
          const dimmed = pressedIndex !== null && pressedIndex !== index;
          return (
            <Pressable
              key={item.id}
              onPress={() => onChange(item.id)}
              onPressIn={() => setPressedIndex(index)}
              onPressOut={() => setPressedIndex(null)}
              style={[
                styles.segment,
                Platform.OS === 'web' && styles.segmentWeb,
                dimmed && styles.segmentDimmed,
              ]}
              accessibilityRole="tab"
              accessibilityState={selected ? { selected: true } : {}}
            >
              <Text
                style={[
                  styles.label,
                  { color: selected ? colors.primary : colors.text },
                  !selected && { opacity: 0.72 },
                  selected && styles.labelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignSelf: 'center',
    width: '72%',
    maxWidth: 268,
    borderRadius: SHELL_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 3,
  },
  shellShadow: Platform.select({
    ios: {
      shadowColor: '#1F2D3A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
    default: {
      boxShadow: [
        '0 6px 20px rgba(31, 45, 58, 0.1)',
        '0 1px 4px rgba(31, 45, 58, 0.06)',
      ].join(', '),
    },
  }),
  topShine: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  diagonalShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '55%',
    height: '75%',
    opacity: 0.45,
  },
  rimHighlight: {
    position: 'absolute',
    top: 1,
    left: 10,
    right: 10,
    height: 1,
    borderRadius: 1,
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    position: 'relative',
    minHeight: 22,
    zIndex: 1,
  },
  thumbWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  activePill: {
    flex: 1,
    borderRadius: THUMB_RADIUS,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 1,
    zIndex: 1,
  },
  segmentWeb: Platform.OS === 'web' ? { cursor: 'pointer' as const } : {},
  segmentDimmed: { opacity: 0.65 },
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: -0.05,
  },
  labelActive: {
    fontWeight: '700',
  },
});
