import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Icon } from '../icons/Icon';
import { CachedAvatarImage } from './CachedAvatarImage';
import { useTheme } from '../../theme/ThemeContext';
import type { PawCircle } from '../../data/pawCircles';

type CircleAvatarProps = {
  circle: Pick<PawCircle, 'icon' | 'tint' | 'iconBg' | 'avatarUrl' | 'avatarFallbackUrl' | 'avatarOriginalUrl'>;
  size: number;
  iconSize?: number;
  style?: ViewStyle;
  label?: string;
};

function circleIconFilled(icon: string) {
  return icon === 'paw' || icon === 'paw-line' || icon === 'cat' || icon === 'dog' || icon === 'adoption';
}

export function CircleAvatar({
  circle,
  size,
  iconSize,
  style,
  label = 'Circle photo',
}: CircleAvatarProps) {
  const { iconBg } = useTheme();
  const hasPhoto = !!(circle.avatarUrl || circle.avatarFallbackUrl || circle.avatarOriginalUrl);
  const [photoFailed, setPhotoFailed] = useState(false);
  const iSize = iconSize ?? Math.round(size * 0.42);

  useEffect(() => {
    setPhotoFailed(false);
  }, [circle.avatarUrl, circle.avatarFallbackUrl, circle.avatarOriginalUrl]);

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: iconBg(circle.iconBg),
        },
        style,
      ]}
    >
      {hasPhoto && !photoFailed ? (
        <CachedAvatarImage
          avatarUrl={circle.avatarUrl}
          avatarFallbackUrl={circle.avatarFallbackUrl}
          avatarOriginalUrl={circle.avatarOriginalUrl}
          width={size}
          height={size}
          borderRadius={size / 2}
          label={label}
          onFailed={() => setPhotoFailed(true)}
        />
      ) : (
        <Icon
          name={circle.icon}
          size={iSize}
          color={circle.tint}
          fill={circleIconFilled(circle.icon) ? circle.tint : 'none'}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
