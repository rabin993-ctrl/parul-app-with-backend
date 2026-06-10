import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Animated, Easing,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { GlossyPill } from './GlossyPill';

export type SegmentItem = { id: string; label: string };

type SlidingSegmentControlProps = {
  items: SegmentItem[];
  value: string;
  onChange: (id: string) => void;
};

export function SlidingSegmentControl({ items, value, onChange }: SlidingSegmentControlProps) {
  const { colors } = useTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const translateX = useRef(new Animated.Value(0)).current;

  const activeIndex = Math.max(0, items.findIndex(i => i.id === value));
  const targetIndex = hoveredIndex ?? activeIndex;
  const segmentW = rowWidth > 0 ? rowWidth / items.length : 0;
  const targetX = segmentW * targetIndex;

  useEffect(() => {
    if (rowWidth <= 0) return;
    Animated.timing(translateX, {
      toValue: targetX,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [targetX, rowWidth, translateX]);

  return (
    <View style={[styles.track, { backgroundColor: colors.bg }]}>
      <View
        style={styles.row}
        onLayout={e => setRowWidth(e.nativeEvent.layout.width)}
      >
        {rowWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicatorWrap,
              { width: segmentW, transform: [{ translateX }] },
            ]}
          >
            <GlossyPill borderRadius={radius.sm - 1} />
          </Animated.View>
        )}

        {items.map((item, index) => {
          const highlighted = value === item.id || hoveredIndex === index;
          return (
            <Pressable
              key={item.id}
              onPress={() => onChange(item.id)}
              onHoverIn={() => setHoveredIndex(index)}
              onHoverOut={() => setHoveredIndex(null)}
              style={[styles.segment, Platform.OS === 'web' && styles.segmentWeb]}
              accessibilityRole="button"
              accessibilityState={value === item.id ? { selected: true } : {}}
            >
              <Text style={[styles.label, { color: highlighted ? colors.primary : colors.textSecondary }]}>
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
  track: {
    padding: 3,
    borderRadius: radius.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    minHeight: 29,
  },
  indicatorWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    zIndex: 1,
  },
  segmentWeb: Platform.OS === 'web' ? { cursor: 'pointer' as const } : {},
  label: { fontSize: 12.5, fontWeight: '700' },
});
