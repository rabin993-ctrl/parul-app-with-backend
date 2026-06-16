import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../icons/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { getMockPhotoUri, getMockPhotoFallbackUri } from '../../data/mockImages';

interface PhotoSlotProps {
  height?: number;
  tint?: string;
  label?: string;
  icon?: string;
  borderRadius?: number;
  style?: ViewStyle;
  /** Solid thumbnail — no dashed placeholder border */
  filled?: boolean;
  /** Direct image URL */
  uri?: string;
  /** Stable key for deterministic mock photo (post id, listing id, etc.) */
  imageKey?: string;
  imageIndex?: number;
  resizeMode?: 'cover' | 'contain';
}

export function PhotoSlot({
  height = 190,
  tint,
  label = 'Photo',
  icon = 'image',
  borderRadius = radius.md,
  style,
  filled = false,
  uri,
  imageKey,
  imageIndex = 0,
  resizeMode = 'cover',
}: PhotoSlotProps) {
  const { colors } = useTheme();
  const key = imageKey ?? `slot-${tint ?? 'default'}-${height}-${label}`;
  const primaryUri = uri ?? getMockPhotoUri(key, imageIndex);
  const fallbackUri = useMemo(
    () => getMockPhotoFallbackUri(key, imageIndex),
    [key, imageIndex],
  );
  const [activeUri, setActiveUri] = useState(primaryUri);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    setActiveUri(primaryUri);
    setUsedFallback(false);
  }, [primaryUri]);

  const showImage = Boolean(activeUri);

  if (showImage) {
    const frameStyle = StyleSheet.flatten([
      {
        height,
        borderRadius,
        overflow: 'hidden' as const,
        width: '100%' as const,
        alignSelf: 'stretch' as const,
        backgroundColor: colors.surface2,
      },
      style,
    ]);

    return (
      <View style={frameStyle}>
        <Image
          source={{ uri: activeUri }}
          style={styles.image}
          resizeMode={resizeMode}
          accessibilityLabel={label || 'Photo'}
          onError={() => {
            if (!usedFallback && fallbackUri !== activeUri) {
              setUsedFallback(true);
              setActiveUri(fallbackUri);
            }
          }}
        />
      </View>
    );
  }

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
        style={[{ height, borderRadius, overflow: 'hidden', width: '100%' }, style]}
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

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
    flex: 1,
  },
});
