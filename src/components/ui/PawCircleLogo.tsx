import React from 'react';
import Svg, { G, Path } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';

type PawCircleLogoProps = {
  size?: number;
  color?: string;
};

const CX = 24;
const CY = 24;

/** 120° arc — three copies rotated form one shared circle (neighbors in a ring). */
const ARC = 'M 24 7.5 A 16.5 16.5 0 0 1 38.3 32.5';

/**
 * Paw Circle mark — three strokes, one circle. Each arc is a neighbor;
 * together they close the loop without a literal paw.
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
    </Svg>
  );
}
