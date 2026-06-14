import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { IconButton } from './Button';

export function AppSubHeader({
  title,
  titleNode,
  onBack,
  showBack = true,
  rightIcon,
  onRightPress,
  rightCount,
  trailing,
}: {
  title?: string;
  titleNode?: React.ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  rightIcon?: string;
  onRightPress?: () => void;
  rightCount?: number;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const handleBack = onBack ?? (() => navigation.goBack());

  return (
    <View style={[styles.subHeader, !(title || titleNode) && styles.subHeaderBackOnly]}>
      {showBack ? (
        <IconButton
          name="chevronLeft"
          size={40}
          tone="soft"
          color={colors.primary}
          onPress={handleBack}
        />
      ) : null}

      {(titleNode || title) ? (
        <>
          {titleNode ? (
            <View style={styles.titleNodeWrap}>{titleNode}</View>
          ) : showBack ? (
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                styles.titlePress,
                Platform.OS === 'web' && styles.titlePressWeb,
                pressed && styles.titlePressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Back from ${title}`}
            >
              <Text style={[styles.title, { color: colors.primary }]} numberOfLines={1}>
                {title}
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.title, styles.titleStatic, { color: colors.primary }]} numberOfLines={1}>
              {title}
            </Text>
          )}
          <View style={styles.spacer} />
          {trailing ?? (rightIcon ? (
            <IconButton
              name={rightIcon}
              size={40}
              tone="soft"
              color={colors.primary}
              count={rightCount}
              onPress={onRightPress}
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
  titlePress: {
    flexShrink: 1,
    maxWidth: '72%',
    paddingVertical: 4,
    paddingRight: 4,
  },
  titlePressWeb: { cursor: 'pointer' as const },
  titlePressed: { opacity: 0.72 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
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
  trailingSlot: { width: 40 },
});
