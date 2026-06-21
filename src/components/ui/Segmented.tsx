import React from 'react';
import { ScrollView, Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../icons/Icon';
import { radius } from '../../theme/tokens';

interface SegItem {
  id: string;
  label: string;
  icon?: string;
  dot?: boolean;
}

interface SegmentedProps {
  items?: SegItem[];
  options?: SegItem[];
  value: string;
  onChange: (id: string) => void;
  style?: any;
}

export function Segmented({ items, options, value, onChange, style }: SegmentedProps) {
  const resolvedItems = items ?? options ?? [];
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, style]}
    >
      {resolvedItems.map(item => {
        const active = item.id === value;
        return (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            style={[styles.pill, {
              backgroundColor: active ? colors.text : colors.surface,
              borderColor: active ? 'transparent' : colors.borderStrong,
            }]}
          >
            {item.icon && (
              <Icon name={item.icon} size={15} color={active ? colors.bg : colors.textSecondary} />
            )}
            <Text style={[styles.label, { color: active ? colors.bg : colors.textSecondary }]}>
              {item.label}
            </Text>
            {item.dot ? (
              <View style={[styles.dot, { backgroundColor: colors.warning }]} />
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  label: { fontSize: 13.5, fontWeight: '600' },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
