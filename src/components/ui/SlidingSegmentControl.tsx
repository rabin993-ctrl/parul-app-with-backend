import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Animated, Easing,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { GlossyPill } from './GlossyPill';

export type SegmentItem = {
  id: string;
  label: string;
  icon?: string;
  iconFillWhenActive?: boolean;
  badge?: number | 'dot';
  badgeUrgent?: boolean;
};

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
          const selected = value === item.id;
          const highlighted = selected || hoveredIndex === index;
          const tone = highlighted ? colors.primary : colors.textSecondary;
          const badgeTone = item.badgeUrgent ? colors.warning : colors.primary;
          const badgeLabel = typeof item.badge === 'number'
            ? (item.badge > 99 ? '99+' : String(item.badge))
            : null;

          return (
            <Pressable
              key={item.id}
              onPress={() => onChange(item.id)}
              onHoverIn={() => setHoveredIndex(index)}
              onHoverOut={() => setHoveredIndex(null)}
              style={[styles.segment, Platform.OS === 'web' && styles.segmentWeb]}
              accessibilityRole="button"
              accessibilityState={selected ? { selected: true } : {}}
            >
              {item.icon ? (
                <Icon
                  name={item.icon}
                  size={13}
                  color={tone}
                  fill={item.iconFillWhenActive && highlighted ? tone : 'none'}
                />
              ) : null}
              <Text style={[styles.label, { color: tone }]} numberOfLines={1}>
                {item.label}
              </Text>
              {item.badge === 'dot' ? (
                <View style={[styles.badgeDot, { backgroundColor: badgeTone }]} />
              ) : null}
              {badgeLabel ? (
                <View style={[styles.badgeCount, { backgroundColor: badgeTone }]}>
                  <Text style={styles.badgeCountText}>{badgeLabel}</Text>
                </View>
              ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 4,
    zIndex: 1,
    minWidth: 0,
  },
  segmentWeb: Platform.OS === 'web' ? { cursor: 'pointer' as const } : {},
  label: { fontSize: 12.5, fontWeight: '700', flexShrink: 1 },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  badgeCount: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  badgeCountText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '700',
    lineHeight: 11,
  },
});
