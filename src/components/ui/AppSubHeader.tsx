import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../icons/Icon';
import { IconButton } from './Button';

export function AppSubHeader({
  title,
  titleNode,
  onBack,
  showBack = true,
  rightIcon,
  onRightPress,
  rightCount,
  rightAccessibilityLabel,
  trailing,
}: {
  title?: string;
  titleNode?: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  rightIcon?: string;
  onRightPress?: () => void;
  rightCount?: number;
  rightAccessibilityLabel?: string;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const handleBack = onBack ?? (() => navigation.goBack());

  return (
    <View style={[styles.subHeader, !(title || titleNode) && styles.subHeaderBackOnly]}>
      {showBack ? (
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backZone,
            Platform.OS === 'web' && styles.backZoneWeb,
            pressed && styles.backZonePressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={title ? `Back from ${title}` : 'Back'}
        >
          <View style={styles.backIconWrap}>
            <Icon name="chevronLeft" size={22} color={colors.primary} sw={2.2} />
          </View>
          {title ? (
            <Text style={[styles.title, { color: colors.primary }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </Pressable>
      ) : null}

      {(titleNode || (title && !showBack)) ? (
        <>
          {titleNode ? (
            <View style={styles.titleNodeWrap}>{titleNode}</View>
          ) : (
            <Text style={[styles.title, styles.titleStatic, { color: colors.primary }]} numberOfLines={1}>
              {title}
            </Text>
          )}
          <View style={styles.spacer} />
          {trailing ?? (rightIcon ? (
            <IconButton
              name={rightIcon}
              size={46}
              iconSize={22}
              tone="soft"
              color={colors.primary}
              count={rightCount}
              onPress={onRightPress}
              accessibilityLabel={rightAccessibilityLabel}
            />
          ) : (
            <View style={styles.trailingSlot} />
          ))}
        </>
      ) : showBack && title ? (
        <>
          <View style={styles.spacer} />
          {trailing ?? (rightIcon ? (
            <IconButton
              name={rightIcon}
              size={46}
              iconSize={22}
              tone="soft"
              color={colors.primary}
              count={rightCount}
              onPress={onRightPress}
              accessibilityLabel={rightAccessibilityLabel}
            />
          ) : (
            <View style={styles.trailingSlot} />
          ))}
        </>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  subHeaderBackOnly: {
    paddingBottom: 0,
  },
  backZone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 1,
    maxWidth: '78%',
    paddingVertical: 4,
    paddingRight: 8,
    marginLeft: -4,
  },
  backZoneWeb: { cursor: 'pointer' as const },
  backZonePressed: { opacity: 0.72 },
  backIconWrap: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  titleStatic: {
    flexShrink: 1,
    maxWidth: '72%',
    paddingVertical: 4,
    paddingRight: 4,
  },
  titleNodeWrap: {
    flexShrink: 1,
    paddingVertical: 2,
  },
  spacer: { flex: 1 },
  trailingSlot: { width: 46 },
});
