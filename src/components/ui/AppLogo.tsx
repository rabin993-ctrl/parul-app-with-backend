import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const LOGO = require('../../../assets/logo.png');

type AppLogoProps = {
  size?: number;
  showWordmark?: boolean;
  onPress?: () => void;
};

export function AppLogo({ size = 44, showWordmark = false, onPress }: AppLogoProps) {
  const { colors } = useTheme();

  const content = showWordmark ? (
    <View style={styles.wrap}>
      <Image
        source={LOGO}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
      <Text style={[styles.name, { color: colors.text }]}>Parul</Text>
    </View>
  ) : (
    <Image
      source={LOGO}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go to feed"
      style={({ pressed }) => [
        pressed && styles.pressed,
        Platform.OS === 'web' && styles.pressableWeb,
      ]}
    >
      {content}
    </Pressable>
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
    marginTop: 2,
  },
  pressed: { opacity: 0.72 },
  pressableWeb: { cursor: 'pointer' as const },
});
