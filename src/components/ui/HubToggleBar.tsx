import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { FeedHubToggle, type HubToggleItem } from './FeedHubToggle';

export type { HubToggleItem };

type HubToggleBarProps = {
  items: HubToggleItem[];
  value: string;
  onChange: (id: string) => void;
  /** Hairline divider under the toggle row (default true). */
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function HubToggleBar({
  items,
  value,
  onChange,
  bordered = true,
  style,
}: HubToggleBarProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        bordered && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        style,
      ]}
    >
      <FeedHubToggle items={items} value={value} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
});
