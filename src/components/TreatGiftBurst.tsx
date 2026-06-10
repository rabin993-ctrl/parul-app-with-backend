import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Icon } from './icons/Icon';
import { useTheme } from '../theme/ThemeContext';

interface TreatGiftBurstProps {
  trigger: number;
  avatarSize: number;
}

export function TreatGiftBurst({ trigger, avatarSize }: TreatGiftBurstProps) {
  const { colors } = useTheme();
  const boneY = useRef(new Animated.Value(72)).current;
  const boneOpacity = useRef(new Animated.Value(0)).current;
  const boneScale = useRef(new Animated.Value(0.6)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger <= 0) return;

    boneY.setValue(72);
    boneOpacity.setValue(0);
    boneScale.setValue(0.6);
    ringScale.setValue(1);
    ringOpacity.setValue(0);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(boneOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(boneScale, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(boneY, { toValue: 8, duration: 520, useNativeDriver: true }),
        Animated.timing(boneOpacity, { toValue: 0, duration: 520, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(ringScale, { toValue: 1.12, duration: 200, useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 1, duration: 220, useNativeDriver: true }),
        ]),
        Animated.timing(ringOpacity, { toValue: 0, duration: 400, delay: 200, useNativeDriver: true }),
      ]),
    ]).start();
  }, [trigger, boneY, boneOpacity, boneScale, ringScale, ringOpacity]);

  if (trigger <= 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[
        styles.ring,
        {
          width: avatarSize + 12,
          height: avatarSize + 12,
          borderRadius: (avatarSize + 12) / 2,
          left: 0,
          top: 0,
          borderColor: colors.accent,
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        },
      ]} />
      <Animated.View style={[
        styles.bone,
        {
          left: avatarSize * 0.35,
          opacity: boneOpacity,
          transform: [{ translateY: boneY }, { scale: boneScale }],
        },
      ]}>
        <Icon name="bone" size={22} color={colors.accent} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
  },
  bone: {
    position: 'absolute',
    top: 0,
  },
});
