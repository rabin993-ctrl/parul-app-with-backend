import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../icons/Icon';
import { useAdopterPublicFlag } from '../../hooks/useAdopterPublicFlags';
import { ADOPTION_FLAG_A11Y, type AdoptionUserFlag } from '../../utils/adoptionUserFlag';

function flagColor(flag: AdoptionUserFlag, colors: ReturnType<typeof useTheme>['colors']) {
  switch (flag) {
    case 'update_requested':
      return colors.warning;
    case 'recommended':
      return colors.success;
    case 'not_recommended':
      return colors.danger;
  }
}

export function AdoptionUserFlag({
  userId,
  flag: flagProp,
  size = 14,
}: {
  userId?: string;
  flag?: AdoptionUserFlag | null;
  size?: number;
}) {
  const { colors } = useTheme();
  const fetchedFlag = useAdopterPublicFlag(flagProp === undefined ? userId : undefined);
  const flag = flagProp !== undefined ? flagProp : fetchedFlag;

  if (!flag) return null;

  const color = flagColor(flag, colors);

  return (
    <View
      style={styles.wrap}
      accessibilityRole="image"
      accessibilityLabel={ADOPTION_FLAG_A11Y[flag]}
    >
      <Icon name="flag" size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
