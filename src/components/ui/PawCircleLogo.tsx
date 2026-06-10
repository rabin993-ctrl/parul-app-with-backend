import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';

type PawCircleLogoProps = {
  size?: number;
};

/**
 * Paw Circle mark — a single-stroke community ring with a minimal paw at center.
 */
export function PawCircleLogo({ size = 36 }: PawCircleLogoProps) {
  const { colors } = useTheme();
  const ink = colors.primary;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Circle cx="24" cy="24" r="21" stroke={ink} strokeWidth="2" />
      <Circle cx="17.2" cy="20.2" r="2.1" fill={ink} />
      <Circle cx="21.4" cy="17.4" r="2.1" fill={ink} />
      <Circle cx="26.6" cy="17.4" r="2.1" fill={ink} />
      <Circle cx="30.8" cy="20.2" r="2.1" fill={ink} />
      <Path
        d="M24 22.8c2.9 0 5.4 2 5.4 4.6 0 2.2-1.9 3.4-3.6 3.4-.7 0-1.2-.3-1.8-.3s-1.1.3-1.8.3c-1.7 0-3.6-1.2-3.6-3.4 0-2.6 2.5-4.6 5.4-4.6Z"
        fill={ink}
      />
    </Svg>
  );
}
