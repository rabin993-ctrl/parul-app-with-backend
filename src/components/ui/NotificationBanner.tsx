import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../icons/Icon';
import type { BannerPayload } from '../../hooks/useInAppNotificationBanner';

interface NotificationBannerProps {
  banner: BannerPayload | null;
  onDismiss: () => void;
  onTap: () => void;
}

const SLIDE_DURATION = 280;
const AUTO_HIDE_DELAY = 4000;

export function NotificationBanner({ banner, onDismiss, onTap }: NotificationBannerProps) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: SLIDE_DURATION, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: SLIDE_DURATION, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  useEffect(() => {
    if (!banner) return;
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 72, friction: 12, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    timerRef.current = setTimeout(hide, AUTO_HIDE_DELAY);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [banner]);

  if (!banner) return null;

  const isDark = mode === 'dark';
  const top = Math.max(insets.top, 12);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { top, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="box-none"
    >
      <Pressable onPress={() => { hide(); onTap(); }} style={styles.pressable}>
        <View style={[styles.card, { borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.55)' }]}>
          <BlurView
            intensity={isDark ? 40 : 64}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? 'rgba(28,36,48,0.50)'
                  : 'rgba(255,255,255,0.20)',
              },
            ]}
          />

          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '25' }]}>
            <Icon name="bell" size={18} color={colors.primary} />
          </View>

          <View style={styles.text} pointerEvents="none">
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {banner.title}
            </Text>
            {banner.body ? (
              <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>
                {banner.body}
              </Text>
            ) : null}
          </View>

          <Pressable onPress={hide} style={styles.closeHit} hitSlop={8}>
            <Icon name="close" size={14} color={colors.textTertiary} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#1F2D3A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  pressable: { width: '100%' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  body: {
    fontSize: 13,
    lineHeight: 17,
  },
  closeHit: {
    padding: 4,
    flexShrink: 0,
  },
});
