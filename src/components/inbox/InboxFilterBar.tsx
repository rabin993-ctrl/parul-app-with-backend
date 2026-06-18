import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, Easing, Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { PawCircleInboxFilter } from '../../navigation/pawCircleInboxRouting';

const INDICATOR_H = 2.5;
const INDICATOR_INSET = 4;

export type InboxFilterOption = {
  id: PawCircleInboxFilter;
  label: string;
  dot?: boolean;
};

export function InboxFilterBar({
  value,
  onChange,
  options,
}: {
  value: PawCircleInboxFilter;
  onChange: (id: PawCircleInboxFilter) => void;
  options: InboxFilterOption[];
}) {
  const { colors } = useTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const activeIndex = Math.max(0, options.findIndex(o => o.id === value));
  const segmentW = rowWidth > 0 ? rowWidth / options.length : 0;
  const indicatorW = Math.max(0, segmentW - INDICATOR_INSET * 2);
  const targetX = segmentW * activeIndex + INDICATOR_INSET;

  useEffect(() => {
    if (rowWidth <= 0) return;
    Animated.timing(translateX, {
      toValue: targetX,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [targetX, rowWidth, translateX]);

  return (
    <View
      style={styles.track}
      onLayout={e => setRowWidth(e.nativeEvent.layout.width)}
    >
      {rowWidth > 0 && indicatorW > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              width: indicatorW,
              backgroundColor: colors.primary,
              transform: [{ translateX }],
            },
          ]}
        />
      )}
      {options.map(option => {
        const active = value === option.id;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[styles.tab, Platform.OS === 'web' && styles.tabWeb]}
            accessibilityRole="tab"
            accessibilityState={active ? { selected: true } : {}}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: active ? colors.text : colors.textTertiary },
                active && styles.tabLabelActive,
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
            {option.dot ? (
              <View style={[styles.dot, { backgroundColor: colors.warning }]} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: INDICATOR_H,
    borderRadius: INDICATOR_H / 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  tabWeb: { cursor: 'pointer' as const },
  tabLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
