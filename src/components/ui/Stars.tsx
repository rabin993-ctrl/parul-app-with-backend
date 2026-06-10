import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';

interface StarsProps {
  rating?: number;
  value?: number;
  size?: number;
}

export function Stars({ rating, value, size = 14 }: StarsProps) {
  rating = rating ?? value ?? 0;
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= rating;
        return (
          <Svg key={i} width={size} height={size} viewBox="0 0 24 24">
            <Polygon
              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              fill={filled ? colors.primary : 'none'}
              stroke={filled ? colors.primary : colors.borderStrong}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      })}
    </View>
  );
}
