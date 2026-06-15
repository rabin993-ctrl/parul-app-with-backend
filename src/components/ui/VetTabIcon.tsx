import React from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

type VetTabIconProps = {
  size?: number;
  color: string;
};

/** Vet tab mark — syringe + paw, transparent SVG aligned with other tab icons. */
export function VetTabIcon({ size = 24, color }: VetTabIconProps) {
  const sw = 1.8;
  const stroke = {
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="17.2" cy="5.2" r="1.55" {...stroke} />
      <Path d="M15.9 6.5 13.1 9.3" {...stroke} />
      <Path d="M13.1 9.3 7.8 14.6" {...stroke} />
      <Path d="M12.5 9.9 11.9 10.5" {...stroke} />
      <Path d="M11.8 10.6 11.2 11.2" {...stroke} />
      <Path d="M11.1 11.3 10.5 11.9" {...stroke} />
      <Path d="M7.8 14.6 5.2 17.2" {...stroke} />
      <Circle cx="14.7" cy="15.1" r="0.85" fill={color} />
      <Circle cx="16.4" cy="14.1" r="0.85" fill={color} />
      <Circle cx="18.1" cy="15.1" r="0.85" fill={color} />
      <Circle cx="16.4" cy="16.7" r="0.85" fill={color} />
      <Ellipse cx="16.4" cy="18.7" rx="2.15" ry="1.75" fill={color} />
    </Svg>
  );
}
