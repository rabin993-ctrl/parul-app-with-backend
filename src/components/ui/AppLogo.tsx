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
        <View style={styles.textCol}>
          <Text style={[styles.name, { color: colors.text }]}>Parul</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Connecting Paws
          </Text>
        </View>
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
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textCol: { gap: 1, justifyContent: 'center' },
  name: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 24,
  },
  tagline: {
    fontSize: 9.5,
    fontWeight: '500',
    letterSpacing: 1,
    lineHeight: 12,
    textTransform: 'uppercase',
  },
});
