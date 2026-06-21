import React from 'react';
import { Pressable, Text, View, StyleSheet, ActivityIndicator, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../icons/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { radius, lightGradients, darkGradients } from '../../theme/tokens';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'soft' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  icon?: string;
  iconNode?: React.ReactNode;
  iconRight?: string;
  full?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconNode,
  iconRight,
  full = false,
  loading = false,
  disabled = false,
  onPress,
  style,
  children,
}: ButtonProps) {
  const { colors, mode } = useTheme();
  const sizeMap = {
    sm: { paddingHorizontal: 14, paddingVertical: 7, fontSize: 13.5, iconSize: 13, gap: 5 },
    md: { paddingHorizontal: 18, paddingVertical: 10, fontSize: 15, iconSize: 15, gap: 6 },
    lg: { paddingHorizontal: 22, paddingVertical: 13, fontSize: 16, iconSize: 17, gap: 7 },
  };

  const variantStyle = getVariantStyle(variant, colors);
  const sz = sizeMap[size];
  const isPrimary = variant === 'primary';
  const gradients = mode === 'light' ? lightGradients : darkGradients;

  const content = loading
    ? <ActivityIndicator size="small" color={variantStyle.text} />
    : <>
        {iconNode ?? (icon && <Icon name={icon} size={sz.iconSize} color={variantStyle.text} />)}
        <Text style={{ fontSize: sz.fontSize, fontWeight: '600', color: variantStyle.text }}>{children}</Text>
        {iconRight && <Icon name={iconRight} size={sz.iconSize} color={variantStyle.text} />}
      </>;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        full && { flex: 1 },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[...gradients.primary.colors]}
          locations={[...gradients.primary.locations]}
          start={gradients.primary.start}
          end={gradients.primary.end}
          style={[
            styles.fill,
            {
              paddingHorizontal: sz.paddingHorizontal,
              paddingVertical: sz.paddingVertical,
              gap: sz.gap,
            },
          ]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.fill,
            {
              paddingHorizontal: sz.paddingHorizontal,
              paddingVertical: sz.paddingVertical,
              gap: sz.gap,
              backgroundColor: variantStyle.bg,
              borderColor: variantStyle.border,
              borderWidth: variantStyle.border ? 1 : 0,
            },
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

function getVariantStyle(variant: string, colors: ReturnType<typeof useTheme>['colors']) {
  switch (variant) {
    case 'primary':  return { bg: colors.primary,   border: undefined,              text: colors.onPrimary };
    case 'secondary': return { bg: colors.surface2,  border: undefined,              text: colors.text };
    case 'outline':  return { bg: 'transparent',    border: colors.borderStrong,    text: colors.text };
    case 'ghost':    return { bg: 'transparent',    border: undefined,              text: colors.textSecondary };
    case 'soft':     return { bg: colors.primary + '18', border: undefined,         text: colors.primary };
    case 'danger':   return { bg: colors.dangerBg,  border: undefined,              text: colors.danger };
    default:         return { bg: colors.primary,   border: undefined,              text: '#fff' };
  }
}

export function IconButton({
  name,
  size = 40,
  iconSize,
  tone = 'ghost',
  count,
  color,
  onPress,
  accessibilityLabel,
}: {
  name: string;
  size?: number;
  iconSize?: number;
  tone?: string;
  count?: number;
  color?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const { colors, isDark, groupedBg } = useTheme();
  const iSz = iconSize ?? Math.round(size * 0.45);
  const bgMap: Record<string, string> = {
    ghost:    'transparent',
    soft:     isDark ? 'transparent' : groupedBg,
    primary:  colors.primary + '18',
    accent:   colors.accent + '18',
    surface:  colors.surface,
  };
  const bg = bgMap[tone] ?? 'transparent';
  const iconColor = color ?? (tone === 'primary' ? colors.primary : tone === 'accent' ? colors.accent : colors.text);
  const isGhost = tone === 'ghost';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.iconBtn,
        {
          width: size,
          height: size,
          borderRadius: isGhost ? 0 : size / 2,
          backgroundColor: isGhost
            ? 'transparent'
            : (pressed && tone === 'soft' && isDark ? colors.surface2 : bg),
        },
        !isGhost && pressed && !(tone === 'soft' && isDark) && { opacity: 0.7 },
        isGhost && styles.iconBtnGhost,
        pressed && isGhost && { opacity: 0.55 },
      ]}
    >
      <Icon name={name} size={iSz} color={iconColor} />
      {count !== undefined && count > 0 && (
        <View style={[styles.countBadge, { backgroundColor: colors.danger }]}>
          <Text style={styles.countText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  fill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  iconBtnGhost: Platform.OS === 'web'
    ? {
        backgroundColor: 'transparent',
        padding: 0,
        borderWidth: 0,
        borderStyle: 'solid',
        boxSizing: 'border-box',
        outlineStyle: 'none',
        appearance: 'none',
        WebkitAppearance: 'none',
        boxShadow: 'none',
        cursor: 'pointer',
      } as const
    : {
        backgroundColor: 'transparent',
      },
  countBadge: {
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
  countText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});
