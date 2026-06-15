import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { TAB_BAR_MIN_BOTTOM, TAB_BAR_PILL_HEIGHT } from '../../navigation/tabBarInsets';

export function useAdoptionFabBottom(gap = 14): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_PILL_HEIGHT + Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM) + gap;
}

/** Floating call-to-action — always visible while browsing Adoption. */
export function AdoptionListFab({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const bottom = useAdoptionFabBottom();

  return (
    <View pointerEvents="box-none" style={[styles.fabWrap, { bottom }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="List a pet for adoption"
        style={({ pressed }) => [
          styles.fab,
          shadows.md,
          {
            backgroundColor: colors.primary,
            opacity: pressed ? 0.92 : 1,
          },
          Platform.OS === 'web' && styles.fabWeb,
        ]}
      >
        <View style={[styles.fabIconRing, { backgroundColor: colors.onPrimary + '22' }]}>
          <Icon name="plus" size={17} color={colors.onPrimary} sw={2.4} />
        </View>
        <Text style={[styles.fabText, { color: colors.onPrimary }]}>List a pet</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: 16,
    left: 16,
    alignItems: 'flex-end',
    zIndex: 20,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
  },
  fabWeb: { cursor: 'pointer' as const },
  fabIconRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
