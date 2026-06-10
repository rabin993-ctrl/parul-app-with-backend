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
}

export function PhotoSlot({
  height = 190,
  tint,
  label = 'Photo',
  icon = 'image',
  borderRadius = radius.md,
  style,
}: PhotoSlotProps) {
  const { colors } = useTheme();

  const inner = (
    <View style={[{
      height,
      borderRadius,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      backgroundColor: tint ? undefined : colors.surface2,
    }, style]}>
      <Icon name={icon} size={26} color={colors.textTertiary} />
      {label ? <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textTertiary, letterSpacing: 0.3 }}>{label}</Text> : null}
    </View>
  );

  if (tint) {
    return (
      <LinearGradient
        colors={[tint + '22', tint + '11']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ height, borderRadius, overflow: 'hidden' }, style]}
      >
        <View style={{
          flex: 1,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: colors.borderStrong,
          borderRadius,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
        }}>
          <Icon name={icon} size={26} color={colors.textTertiary} />
          {label ? <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textTertiary, letterSpacing: 0.3 }}>{label}</Text> : null}
        </View>
      </LinearGradient>
    );
  }

  return inner;
}
