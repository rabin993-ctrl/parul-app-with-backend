import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAdopterUpdateRequested } from '../../hooks/useAdopterPublicFlags';
import { ADOPTION_OVERDUE_A11Y } from '../../utils/adoptionUserFlag';

export const ADOPTION_OVERDUE_RING_PAD = 2.5;

export function adoptionOverdueOuterSize(size: number, updateRequested: boolean): number {
  return updateRequested ? size + ADOPTION_OVERDUE_RING_PAD * 2 : size;
}

export function AdoptionOverdueRing({
  userId,
  size,
  updateRequested: updateRequestedProp,
  children,
}: {
  userId?: string;
  size: number;
  updateRequested?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const fetched = useAdopterUpdateRequested(
    updateRequestedProp === undefined ? userId : undefined,
  );
  const updateRequested = updateRequestedProp ?? fetched;

  if (!updateRequested) {
    return <>{children}</>;
  }

  const outer = adoptionOverdueOuterSize(size, true);

  return (
    <View
      style={[
        styles.ring,
        {
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderColor: colors.warning,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={ADOPTION_OVERDUE_A11Y}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: ADOPTION_OVERDUE_RING_PAD,
    flexShrink: 0,
  },
});
