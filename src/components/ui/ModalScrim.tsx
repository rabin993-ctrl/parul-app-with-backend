import React, { useEffect, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const ENTER_MS = 260;

type ModalScrimProps = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Sheet dismiss fade — skips built-in enter animation when set. */
  animatedStyle?: Animated.WithAnimatedObject<ViewStyle>;
  /** Shared enter fade from ModalPresent. */
  presentOpacity?: Animated.Value;
  accessibilityLabel?: string;
};

function ScrimLayer() {
  const { scrim } = useTheme();
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} />;
}

export function ModalScrim({
  onPress,
  style,
  animatedStyle,
  presentOpacity,
  accessibilityLabel = 'Dismiss',
}: ModalScrimProps) {
  const enterOpacity = useRef(new Animated.Value(animatedStyle ? 1 : 0)).current;

  useEffect(() => {
    if (animatedStyle || presentOpacity) return;
    enterOpacity.setValue(0);
    Animated.timing(enterOpacity, {
      toValue: 1,
      duration: ENTER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animatedStyle, presentOpacity, enterOpacity]);

  const opacity = presentOpacity ?? (animatedStyle ? undefined : enterOpacity);
  const layerOpacityStyle = opacity ? { opacity } : animatedStyle;
  const layers = <ScrimLayer />;

  return (
    <>
      {layerOpacityStyle ? (
        <Animated.View style={[StyleSheet.absoluteFill, layerOpacityStyle, style]}>
          {layers}
        </Animated.View>
      ) : animatedStyle ? (
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle, style]}>
          {layers}
        </Animated.View>
      ) : (
        <View style={[StyleSheet.absoluteFill, style]}>
          {layers}
        </View>
      )}
      {onPress ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        />
      ) : null}
    </>
  );
}

export function useModalEnterAnimation(active = true) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (!active) return;
    opacity.setValue(0);
    scale.setValue(0.96);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, opacity, scale]);

  return { opacity, scale };
}

/** Dim scrim + synchronized fade/scale for popup content. */
export function ModalPresent({
  onDismiss,
  children,
  style,
  accessibilityLabel,
  animatedScale = true,
}: {
  onDismiss?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Subtle zoom-in for centered popups; off for anchored menus. */
  animatedScale?: boolean;
}) {
  const { opacity, scale } = useModalEnterAnimation(true);

  return (
    <>
      <ModalScrim
        onPress={onDismiss}
        presentOpacity={opacity}
        accessibilityLabel={accessibilityLabel}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          style,
          { opacity, transform: animatedScale ? [{ scale }] : undefined },
        ]}
        pointerEvents="box-none"
      >
        {children}
      </Animated.View>
    </>
  );
}
