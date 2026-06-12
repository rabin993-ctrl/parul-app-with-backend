import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const LOGO = require('../../../assets/logo.png');

type AppLogoProps = {
  size?: number;
  showWordmark?: boolean;
};

export function AppLogo({ size = 44, showWordmark = false }: AppLogoProps) {
  const { colors } = useTheme();

  if (showWordmark) {
    return (
      <View style={styles.wrap}>
        <Image
          source={LOGO}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
        <Text style={[styles.name, { color: colors.text }]}>Parul</Text>
      </View>
    );
  }

  return (
    <Image
      source={LOGO}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 24,
    marginLeft: -2,
  },
});
