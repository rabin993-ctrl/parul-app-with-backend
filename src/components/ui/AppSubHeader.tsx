import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { Icon } from '../icons/Icon';

export const APP_HEADER_PADDING_H = 12;
export const APP_HEADER_PADDING_TOP = 8;
export const APP_HEADER_PADDING_BOTTOM = 4;
export const APP_HEADER_BACK_SIZE = 46;
export const APP_HEADER_TRAILING_SLOT = 46;
export const APP_CENTERED_HEADER_SIDE = 84;

/** Wrapper for @handle profile headers — matches companion full-profile top inset. */
export const PROFILE_HANDLE_HEADER_WRAP = {
  marginTop: -4,
} as const;

export const HUB_CENTERED_TITLE_STYLE = {
  fontSize: 22,
  letterSpacing: -0.35,
} as const;

export const HUB_USERNAME_TITLE_STYLE = {
  fontSize: 18,
  letterSpacing: -0.2,
} as const;

export function AppHeaderIconButton({
  name,
  onPress,
  count,
  color,
  iconSize = 22,
  size = APP_HEADER_TRAILING_SLOT,
  accessibilityLabel,
}: {
  name: string;
  onPress?: () => void;
  count?: number;
  color?: string;
  iconSize?: number;
  size?: number;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const iconColor = color ?? colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.headerIconWrap,
        { width: size, height: size },
        Platform.OS === 'web' && styles.backZoneWeb,
        pressed && styles.backZonePressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Icon name={name} size={iconSize} color={iconColor} sw={2.2} />
      {count !== undefined && count > 0 && (
        <View style={[styles.headerCountBadge, { backgroundColor: colors.danger }]}>
          <Text style={styles.headerCountText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function AppCenteredHeader({
  title,
  onBack,
  trailing,
  titleStyle,
  backAccessibilityLabel = 'Back',
  compact = false,
}: {
  title: string;
  onBack?: () => void;
  trailing?: React.ReactNode;
  titleStyle?: object;
  backAccessibilityLabel?: string;
  /** Tighter vertical padding — e.g. circle chat top bar. */
  compact?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.subHeader, compact && styles.subHeaderCompact]}>
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
            accessibilityLabel={backAccessibilityLabel}
          >
            <View style={styles.backIconWrap}>
              <Icon name="chevronLeft" size={22} color={colors.textSecondary} sw={2.2} />
            </View>
          </Pressable>
        ) : (
          <View style={styles.trailingSlot} />
        )}
      </View>
      <Text
        style={[styles.title, styles.centeredTitle, titleStyle, { color: colors.text }]}
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
    <AppHeaderIconButton
      name={rightIcon}
      count={rightCount}
      onPress={onRightPress}
      accessibilityLabel={rightAccessibilityLabel}
    />
  ) : (
    <View style={styles.trailingSlot} />
  ));

  const backButton = showBack ? (
    <Pressable
      onPress={handleBack}
      style={({ pressed }) => [
        styles.backZone,
        titleNode ? styles.backZoneWithTitleNode : null,
        Platform.OS === 'web' && styles.backZoneWeb,
        pressed && styles.backZonePressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title ? `Back from ${title}` : 'Back'}
    >
      <View style={styles.backIconWrap}>
        <Icon name="chevronLeft" size={22} color={colors.textSecondary} sw={2.2} />
      </View>
      {title && !titleNode ? (
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
    </Pressable>
  ) : null;

  if (titleNode && showBack) {
    return (
      <View style={styles.subHeader}>
        {backButton}
        <View style={styles.titleNodeWrapFlex}>{titleNode}</View>
        {trailingContent}
      </View>
    );
  }

  return (
    <View style={[styles.subHeader, !(title || titleNode) && styles.subHeaderBackOnly]}>
      {backButton}

      {(titleNode || (title && !showBack)) ? (
        <>
          {titleNode ? (
            <View style={styles.titleNodeWrap}>{titleNode}</View>
          ) : (
            <Text style={[styles.title, styles.titleStatic, { color: colors.text }]} numberOfLines={1}>
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
  subHeaderCompact: {
    paddingTop: 2,
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
  backZoneWithTitleNode: {
    flexShrink: 0,
    maxWidth: APP_HEADER_BACK_SIZE,
    paddingRight: 0,
  },
  backZoneWeb: {
    cursor: 'pointer' as const,
    zIndex: 3,
    position: 'relative' as const,
  },
  backZonePressed: { opacity: 0.72 },
  backIconWrap: {
    width: APP_HEADER_BACK_SIZE,
    height: APP_HEADER_BACK_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  headerCountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerCountText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
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
  titleNodeWrapFlex: {
    flex: 1,
    minWidth: 0,
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
