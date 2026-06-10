import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { Icon } from '../icons/Icon';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';

export type ToastTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface ToastData {
  msg: string;
  icon?: string;
  tone?: ToastTone;
}

interface ToastProps {
  data: ToastData | null;
  onHide: () => void;
}

export function Toast({ data, onHide }: ToastProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!data) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 12, duration: 280, useNativeDriver: true }),
      ]).start(() => onHide());
    }, 2000);
    return () => clearTimeout(t);
  }, [data]);

  if (!data) return null;

  const tone: ToastTone = data.tone ?? 'neutral';
  const accentColor: Record<ToastTone, string> = {
    success: colors.success,
    danger:  colors.danger,
    primary: colors.primary,
    accent:  colors.accent,
    warning: colors.warning,
    info:    colors.info,
    neutral: colors.textSecondary,
  };
  const dot = accentColor[tone];

  return (
    <Animated.View style={[styles.toast, { backgroundColor: colors.text, opacity, transform: [{ translateY }] }]}>
      <View style={[styles.dot, { backgroundColor: dot }]}>
        <Icon name={data.icon ?? 'check'} size={13} color="#fff" />
      </View>
      <Text style={[styles.msg, { color: colors.bg }]}>{data.msg}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 94,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 10,
    paddingRight: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    zIndex: 9999,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  msg: {
    fontSize: 14,
    fontWeight: '600',
  },
});
