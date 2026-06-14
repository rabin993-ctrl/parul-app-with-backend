import React from 'react';
import { Image, Platform } from 'react-native';

const VET_TAB_ICON = require('../../../assets/vet-tab-icon.png');

type VetTabIconProps = {
  size?: number;
  color: string;
};

/** Vet tab mark — authored PNG. Web skips tint (style/prop tint fills the whole box). */
export function VetTabIcon({ size = 24, color }: VetTabIconProps) {
  if (Platform.OS === 'web') {
    return (
      <Image
        source={VET_TAB_ICON}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }

  return (
    <Image
      source={VET_TAB_ICON}
      style={{ width: size, height: size }}
      resizeMode="contain"
      tintColor={color}
    />
  );
}
