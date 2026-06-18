import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { IconButton } from './Button';

export const APP_HEADER_PADDING_H = 12;
export const APP_HEADER_PADDING_TOP = 8;
export const APP_HEADER_PADDING_BOTTOM = 4;
export const APP_HEADER_BACK_SIZE = 46;
export const APP_HEADER_TRAILING_SLOT = 46;
export const APP_CENTERED_HEADER_SIDE = 84;

export function AppCenteredHeader({
  title,
  onBack,
  trailing,
}: {
  title: string;
  onBack?: () => void;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.subHeader}>
      <View style={[styles.centeredSide, styles.centeredSideStart]}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.backZone,
              Platform.OS === 'web' && styles.backZoneWeb,
              pressed && styles.backZonePressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <View style={styles.backIconWrap}>
              <Icon name="chevronLeft" size={22} color={colors.primary} sw={2.2} />
            </View>
          </Pressable>
        ) : (
          <View style={styles.trailingSlot} />
        )}
      </View>
      <Text
        style={[styles.title, styles.centeredTitle, { color: colors.primary }]}
        numberOfLines={1}
      >
        {title}
      </Text>
      <View style={[styles.centeredSide, styles.centeredSideEnd]}>
        {trailing ?? <View style={styles.trailingSlot} />}
      </View>
    </View>
  );
}

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

  const trailingContent = trailing ?? (rightIcon ? (
    <IconButton
      name={rightIcon}
      size={APP_HEADER_TRAILING_SLOT}
      iconSize={22}
      tone="soft"
      color={colors.primary}
      count={rightCount}
      onPress={onRightPress}
      accessibilityLabel={rightAccessibilityLabel}
    />
  ) : (
    <View style={styles.trailingSlot} />
  ));

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
          {title && !titleNode ? (
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
          {trailingContent}
        </>
      ) : showBack && title ? (
        <>
          <View style={styles.spacer} />
          {trailingContent}
        </>
      ) : showBack && titleNode ? (
        <>
          <View style={styles.titleNodeWrap}>{titleNode}</View>
          <View style={styles.spacer} />
          {trailingContent}
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
    paddingHorizontal: APP_HEADER_PADDING_H,
    paddingTop: APP_HEADER_PADDING_TOP,
    paddingBottom: APP_HEADER_PADDING_BOTTOM,
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
    width: APP_HEADER_BACK_SIZE,
    height: APP_HEADER_BACK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.appHeaderTitle,
    flexShrink: 1,
  },
  titleStatic: {
    flexShrink: 1,
    maxWidth: '72%',
    paddingVertical: 4,
    paddingRight: 4,
  },
  centeredTitle: {
    flex: 1,
    textAlign: 'center',
    flexShrink: 1,
  },
  titleNodeWrap: {
    flexShrink: 1,
    paddingVertical: 2,
  },
  centeredSide: {
    width: APP_CENTERED_HEADER_SIDE,
    minHeight: APP_HEADER_BACK_SIZE,
    justifyContent: 'center',
    flexShrink: 0,
  },
  centeredSideStart: {
    alignItems: 'flex-start',
  },
  centeredSideEnd: {
    alignItems: 'flex-end',
  },
  spacer: { flex: 1 },
  trailingSlot: { width: APP_HEADER_TRAILING_SLOT },
});
