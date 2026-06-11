import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../icons/Icon';
import type { RescueCase } from '../../data/profileData';
import { RESCUE_STATUS_META } from '../../data/profileData';

type Props = {
  item: RescueCase;
  onPress: () => void;
  showDivider?: boolean;
};

export function MyRescueCaseCard({ item, onPress, showDivider = true }: Props) {
  const { colors } = useTheme();
  const status = RESCUE_STATUS_META[item.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        showDivider && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
        { opacity: pressed ? 0.65 : 1 },
      ]}
    >
      <Icon
        name={item.icon}
        size={16}
        color={item.tint}
        fill={item.icon === 'paw' || item.icon === 'cat' || item.icon === 'dog' ? item.tint : 'none'}
      />
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={[styles.status, { color: status.tint }]} numberOfLines={1}>
        {status.shortLabel}
      </Text>
      <Icon name="chevronRight" size={13} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  name: { flex: 1, fontSize: 15, fontWeight: '600', minWidth: 0 },
  status: { fontSize: 12, fontWeight: '600' },
});
