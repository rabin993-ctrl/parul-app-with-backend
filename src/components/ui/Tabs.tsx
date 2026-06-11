import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, Animated, Easing,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

const INDICATOR_INSET = 8;
const INDICATOR_H = 3;

export function Tabs({ tabs, active, onChange }: TabsProps) {
  const { colors } = useTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const activeIndex = Math.max(0, tabs.findIndex(t => t.id === active));
  const segmentW = rowWidth > 0 ? rowWidth / tabs.length : 0;
  const indicatorW = Math.max(0, segmentW - INDICATOR_INSET * 2);
  const targetX = segmentW * activeIndex + INDICATOR_INSET;

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
    <View
      style={styles.row}
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

      {tabs.map(t => {
        const on = t.id === active;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            style={[styles.tab, Platform.OS === 'web' && styles.tabWeb]}
            accessibilityRole="tab"
            accessibilityState={on ? { selected: true } : {}}
          >
            <Text
              style={[
                styles.label,
                {
                  color: on ? colors.text : colors.textTertiary,
                  fontWeight: on ? '700' : '600',
                },
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: INDICATOR_H,
    borderRadius: INDICATOR_H,
  },
  tab: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 10 + INDICATOR_H,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tabWeb: Platform.OS === 'web' ? { cursor: 'pointer' as const } : {},
  label: {
    fontSize: 11.5,
    letterSpacing: -0.1,
  },
});
