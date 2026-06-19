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

/** Shared duration for scrim + sheet/popup enter/exit. */
export const MODAL_OVERLAY_MS = 260;
const ENTER_MS = MODAL_OVERLAY_MS;

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
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]}
    />
  );
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

  if (onPress) {
    const dismissPressable = (
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {layers}
      </Pressable>
    );

    if (animatedStyle) {
      return (
        <Animated.View
          style={[StyleSheet.absoluteFill, animatedStyle, style]}
          pointerEvents="box-none"
        >
          {dismissPressable}
        </Animated.View>
      );
    }

    if (presentOpacity || layerOpacityStyle) {
      return (
        <Animated.View
          style={[StyleSheet.absoluteFill, layerOpacityStyle, style]}
          pointerEvents="box-none"
        >
          {dismissPressable}
        </Animated.View>
      );
    }

    return (
      <Pressable
        style={[StyleSheet.absoluteFill, style]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {layers}
      </Pressable>
    );
  }

  return (
    <>
      {layerOpacityStyle ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, layerOpacityStyle, style]}>
          {layers}
        </Animated.View>
      ) : animatedStyle ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, animatedStyle, style]}>
          {layers}
        </Animated.View>
      ) : (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
          {layers}
        </View>
      )}
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
  scrimStyle,
  accessibilityLabel,
  animatedScale = true,
}: {
  onDismiss?: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scrimStyle?: StyleProp<ViewStyle>;
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
        style={scrimStyle}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity, transform: animatedScale ? [{ scale }] : undefined },
        ]}
        pointerEvents="box-none"
      >
        <View style={[StyleSheet.absoluteFill, style]} pointerEvents="box-none">
          {children}
        </View>
      </Animated.View>
    </>
  );
}
