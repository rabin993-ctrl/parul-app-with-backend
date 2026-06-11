import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../icons/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';

interface PhotoSlotProps {
  height?: number;
  tint?: string;
  label?: string;
  icon?: string;
  borderRadius?: number;
  style?: ViewStyle;
  /** Solid thumbnail — no dashed placeholder border */
  filled?: boolean;
}

export function PhotoSlot({
  height = 190,
  tint,
  label = 'Photo',
  icon = 'image',
  borderRadius = radius.md,
  style,
  filled = false,
}: PhotoSlotProps) {
  const { colors } = useTheme();
  const iconSize = filled ? Math.round(height * 0.28) : 26;
  const borderStyle = filled
    ? { borderWidth: 0 }
    : { borderWidth: 1.5, borderStyle: 'dashed' as const, borderColor: colors.borderStrong };

  const inner = (
    <View style={[{
      height,
      borderRadius,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      backgroundColor: tint ? undefined : colors.surface2,
      ...borderStyle,
    }, style]}>
      <Icon name={icon} size={iconSize} color={filled && tint ? tint + '88' : colors.textTertiary} />
      {label ? <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textTertiary, letterSpacing: 0.3 }}>{label}</Text> : null}
    </View>
  );

  if (tint) {
    return (
      <LinearGradient
        colors={filled ? [tint + '55', tint + '28'] : [tint + '22', tint + '11']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ height, borderRadius, overflow: 'hidden' }, style]}
      >
        <View style={{
          flex: 1,
          borderRadius,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          ...borderStyle,
        }}>
          <Icon name={icon} size={iconSize} color={filled ? tint + '99' : colors.textTertiary} />
          {label ? <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textTertiary, letterSpacing: 0.3 }}>{label}</Text> : null}
        </View>
      </LinearGradient>
    );
  }

  return inner;
}
