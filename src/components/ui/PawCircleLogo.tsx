import React from 'react';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';

type PawCircleLogoProps = {
  size?: number;
  color?: string;
};

const CX = 24;
const CY = 24;

/** 120° arc — three copies rotated form one shared circle (neighbors in a ring). */
const ARC = 'M 24 7.5 A 16.5 16.5 0 0 1 38.3 32.5';

/** Brand paw paths (24×24 viewBox), scaled to sit inside the arc ring. */
const PAW_SCALE = 0.62;
const PAW_CENTER_Y = 12.6;

/**
 * Paw Circle mark — three strokes form a ring; a paw sits at the center.
 */
export function PawCircleLogo({ size = 36, color }: PawCircleLogoProps) {
  const { colors } = useTheme();
  const ink = color ?? colors.primary;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <G transform={`rotate(0 ${CX} ${CY})`}>
        <Path d={ARC} stroke={ink} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </G>
      <G transform={`rotate(120 ${CX} ${CY})`}>
        <Path d={ARC} stroke={ink} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </G>
      <G transform={`rotate(240 ${CX} ${CY})`}>
        <Path d={ARC} stroke={ink} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </G>
      <G transform={`translate(${CX} ${CY}) scale(${PAW_SCALE}) translate(-12 -${PAW_CENTER_Y})`}>
        <Ellipse cx="6.2" cy="9.4" rx="2.1" ry="2.7" transform="rotate(-18 6.2 9.4)" fill={ink} />
        <Ellipse cx="10" cy="6.4" rx="2.1" ry="2.8" fill={ink} />
        <Ellipse cx="14" cy="6.4" rx="2.1" ry="2.8" fill={ink} />
        <Ellipse cx="17.8" cy="9.4" rx="2.1" ry="2.7" transform="rotate(18 17.8 9.4)" fill={ink} />
        <Path
          d="M12 11.4c2.7 0 5 1.9 5 4.3 0 2-1.7 3.1-3.4 3.1-0.7 0-1.1-.3-1.6-.3s-.9.3-1.6.3C8.7 18.8 7 17.7 7 15.7c0-2.4 2.3-4.3 5-4.3Z"
          fill={ink}
        />
      </G>
    </Svg>
  );
}
