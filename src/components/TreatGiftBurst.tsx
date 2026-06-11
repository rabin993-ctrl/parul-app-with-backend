import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Icon } from './icons/Icon';
import { useTheme } from '../theme/ThemeContext';
import { getPetAvatarFrameSize, getPetInnerCircleSize } from './ui/PawPadShape';

interface TreatGiftBurstProps {
  trigger: number;
  avatarSize: number;
  frameWidth?: number;
  frameHeight?: number;
}

export function TreatGiftBurst({
  trigger,
  avatarSize,
  frameWidth,
  frameHeight,
}: TreatGiftBurstProps) {
  const { colors } = useTheme();
  const frame = getPetAvatarFrameSize(avatarSize);
  const width = frameWidth ?? frame.width;
  const height = frameHeight ?? frame.height;
  const innerSize = getPetInnerCircleSize(avatarSize);

  const boneY = useRef(new Animated.Value(height * 0.75)).current;
  const boneOpacity = useRef(new Animated.Value(0)).current;
  const boneScale = useRef(new Animated.Value(0.6)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  // Ring is sized around the inner (main) circle, not the outer frame.
  const ringSize = innerSize + 12;
  const ringLeft = (width - ringSize) / 2;
  // Main circle is bottom-anchored in the frame; centre it vertically.
  const ringTop = height - innerSize / 2 - ringSize / 2;

  useEffect(() => {
    if (trigger <= 0) return;

    const startY = height * 0.75;
    const endY = height * 0.08;
    boneY.setValue(startY);
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
        Animated.timing(boneY, { toValue: endY, duration: 520, useNativeDriver: true }),
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
  }, [trigger, height, boneY, boneOpacity, boneScale, ringScale, ringOpacity]);

  if (trigger <= 0) return null;

  return (
    <View style={[styles.overlay, { width, height }]} pointerEvents="none">
      <Animated.View style={[
        styles.ring,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          left: ringLeft,
          top: ringTop,
          borderColor: colors.accent,
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        },
      ]} />
      <Animated.View style={[
        styles.bone,
        {
          left: width / 2 - 11,
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
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
  },
  bone: {
    position: 'absolute',
    top: 0,
  },
});
