import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useSheetOverlayOpen } from '../context/SheetOverlayContext';
import { useTabBarScrollControl, useTabBarScrollEngaged } from '../context/TabBarScrollContext';
import { Icon } from '../components/icons/Icon';
import { PawCircleLogo } from '../components/ui/PawCircleLogo';
import { GlossyPill } from '../components/ui/GlossyPill';
import { ComingSoonModal } from '../components/ui/ComingSoonModal';
import { radius } from '../theme/tokens';
import { usePawCircles } from '../context/PawCircleContext';
import { useUnreadNotificationsCount } from '../hooks/useUnreadNotificationsCount';

const TAB_ICONS: Record<string, { name: string; fillWhenFocused?: boolean; usePawCircleLogo?: boolean }> = {
  Feed: { name: 'home', fillWhenFocused: true },
  Circles: { name: 'circles', usePawCircleLogo: true },
  Messages: { name: 'comment', fillWhenFocused: true },
  Vet: { name: 'medical', fillWhenFocused: true },
  Profile: { name: 'user' },
};

const BAR_HEIGHT = 58;
const INDICATOR_WIDTH = 54;
const INDICATOR_HEIGHT = 44;
const BAR_SCALE_NORMAL = 1;
const BAR_SCALE_SQUEEZED = 0.78;
const BAR_SQUEEZE_SPRING = { tension: 58, friction: 12 };
const BAR_EXPAND_SPRING = { tension: 72, friction: 13 };
const SQUEEZE_ENABLED = Platform.OS === 'web';

function TabItem({
  route,
  highlighted,
  config,
  colors,
  onPress,
  onLongPress,
  onHoverIn,
  onHoverOut,
  onBarEnter,
  onBarPressIn,
  onBarPressOut,
  badgeCount,
}: {
  route: { key: string; name: string };
  highlighted: boolean;
  config: { name: string; fillWhenFocused?: boolean; usePawCircleLogo?: boolean };
  colors: { primary: string; text: string; danger: string };
  onPress: () => void;
  onLongPress: () => void;
  onHoverIn: () => void;
  onHoverOut: () => void;
  onBarEnter: () => void;
  onBarPressIn: () => void;
  onBarPressOut: () => void;
  badgeCount?: number;
}) {
  const [pressed, setPressed] = useState(false);
  const iconColor = highlighted ? colors.primary : colors.text;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onHoverIn={() => {
        onBarEnter();
        onHoverIn();
      }}
      onHoverOut={onHoverOut}
      onPressIn={() => {
        onBarPressIn();
        setPressed(true);
      }}
      onPressOut={() => {
        onBarPressOut();
        setPressed(false);
      }}
      style={[styles.tab, Platform.OS === 'web' && styles.tabWebHover]}
      accessibilityRole="button"
      accessibilityState={highlighted ? { selected: true } : {}}
      accessibilityLabel={route.name}
    >
      <View style={[styles.tabIconWrap, { opacity: pressed ? 0.7 : 1 }]}>
        {config.usePawCircleLogo ? (
          <PawCircleLogo size={24} color={iconColor} />
        ) : (
          <Icon
            name={config.name}
            size={24}
            color={iconColor}
            fill={highlighted && config.fillWhenFocused ? iconColor : 'none'}
          />
        )}
        {badgeCount !== undefined && badgeCount > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: colors.danger }]}>
            <Text style={styles.tabBadgeText}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const [vetComingSoonOpen, setVetComingSoonOpen] = useState(false);
  const { pendingIncomingRequestCount } = usePawCircles();
  const sheetOpen = useSheetOverlayOpen();
  const scrollEngaged = useTabBarScrollEngaged();
  const { clearScrollEngaged } = useTabBarScrollControl();
  const scrollEngagedRef = useRef(scrollEngaged);
  const unreadNotifCount = useUnreadNotificationsCount();
  const isDark = mode === 'dark';
  const [rowWidth, setRowWidth] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const translateX = useRef(new Animated.Value(0)).current;
  const barScale = useRef(new Animated.Value(BAR_SCALE_NORMAL)).current;
  const scaleAnim = useRef<Animated.CompositeAnimation | null>(null);
  const barHovering = useRef(false);
  const barPressing = useRef(false);

  useEffect(() => {
    scrollEngagedRef.current = scrollEngaged;
  }, [scrollEngaged]);

  const syncBarScale = useCallback(() => {
    if (!SQUEEZE_ENABLED) return;
    const expanded = barHovering.current || barPressing.current;
    const engaged = scrollEngagedRef.current;
    const toValue = expanded
      ? BAR_SCALE_NORMAL
      : engaged
        ? BAR_SCALE_SQUEEZED
        : BAR_SCALE_NORMAL;
    scaleAnim.current?.stop();
    scaleAnim.current = Animated.spring(barScale, {
      toValue,
      useNativeDriver: true,
      ...(expanded ? BAR_EXPAND_SPRING : BAR_SQUEEZE_SPRING),
    });
    scaleAnim.current.start();
  }, [barScale]);

  useEffect(() => {
    syncBarScale();
  }, [scrollEngaged, syncBarScale]);

  const onBarEnter = useCallback(() => {
    if (!SQUEEZE_ENABLED) return;
    barHovering.current = true;
    syncBarScale();
  }, [syncBarScale]);

  const onBarLeave = useCallback(() => {
    if (!SQUEEZE_ENABLED) return;
    barHovering.current = false;
    barPressing.current = false;
    syncBarScale();
  }, [syncBarScale]);

  const onBarPressIn = useCallback(() => {
    if (!SQUEEZE_ENABLED) return;
    barPressing.current = true;
    syncBarScale();
  }, [syncBarScale]);

  const onBarPressOut = useCallback(() => {
    if (!SQUEEZE_ENABLED) return;
    barPressing.current = false;
    syncBarScale();
  }, [syncBarScale]);

  const onTabSelected = useCallback(() => {
    if (!SQUEEZE_ENABLED) return;
    scrollEngagedRef.current = false;
    clearScrollEngaged();
    barHovering.current = false;
    barPressing.current = false;
    syncBarScale();
  }, [clearScrollEngaged, syncBarScale]);

  const tabCount = state.routes.length;
  const targetIndex = hoveredIndex ?? state.index;
  const tabWidth = rowWidth > 0 ? rowWidth / tabCount : 0;
  const targetX = tabWidth * targetIndex + (tabWidth - INDICATOR_WIDTH) / 2;

  useEffect(() => {
    if (rowWidth <= 0) return;
    Animated.spring(translateX, {
      toValue: targetX,
      useNativeDriver: true,
      tension: 68,
      friction: 13,
    }).start();
  }, [targetX, rowWidth, translateX]);

  if (sheetOpen) return null;

  const pillBorder = {
    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.55)',
  };

  return (
    <>
    <ComingSoonModal
      visible={vetComingSoonOpen}
      onClose={() => setVetComingSoonOpen(false)}
      icon="medical"
      body="Vet consults and online care are on the way. Check back soon."
    />
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      <Pressable
        style={styles.pillSlot}
        onHoverIn={onBarEnter}
        onHoverOut={onBarLeave}
        accessibilityRole="none"
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View
          style={[
            styles.pill,
            styles.pillShadow,
            styles.pillScaled,
            pillBorder,
            { transform: [{ scale: barScale }] },
          ]}
        >
          <BlurView
            intensity={isDark ? 38 : 62}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />

          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: isDark
                  ? 'rgba(28, 36, 48, 0.42)'
                  : 'rgba(255, 255, 255, 0.14)',
              },
            ]}
          />

          <LinearGradient
            colors={
              isDark
                ? ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)', 'transparent']
                : ['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.02)']
            }
            locations={[0, 0.38, 0.72]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.topShine}
            pointerEvents="none"
          />

          <LinearGradient
            colors={['rgba(255,255,255,0.35)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.85 }}
            style={styles.diagonalShine}
            pointerEvents="none"
          />

          <View
            style={styles.row}
            onLayout={e => setRowWidth(e.nativeEvent.layout.width)}
          >
            {rowWidth > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.indicatorWrap,
                  { transform: [{ translateX }] },
                ]}
              >
                <View style={styles.activePill}>
                  <GlossyPill borderRadius={22} showGloss={false} />
                </View>
              </Animated.View>
            )}

            {state.routes.map((route, index) => {
              const focused = state.index === index;
              const highlighted = focused || hoveredIndex === index;
              const config = TAB_ICONS[route.name] ?? { name: 'home' };

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (event.defaultPrevented) return;

                onTabSelected();

                if (route.name === 'Circles') {
                  navigation.navigate('Circles', { screen: 'Hub' });
                  return;
                }

                if (route.name === 'Vet') {
                  setVetComingSoonOpen(true);
                  return;
                }

                navigation.navigate(route.name);
              };

              const onLongPress = () => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              };

              return (
                <TabItem
                  key={route.key}
                  route={route}
                  highlighted={highlighted}
                  config={config}
                  colors={colors}
                  badgeCount={
                    route.name === 'Circles' ? pendingIncomingRequestCount
                    : route.name === 'Profile' ? unreadNotifCount
                    : undefined
                  }
                  onPress={onPress}
                  onLongPress={onLongPress}
                  onHoverIn={() => setHoveredIndex(index)}
                  onHoverOut={() => setHoveredIndex(null)}
                  onBarEnter={onBarEnter}
                  onBarPressIn={onBarPressIn}
                  onBarPressOut={onBarPressOut}
                />
              );
            })}
          </View>
        </Animated.View>
      </Pressable>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 18,
    zIndex: 100,
    ...Platform.select({
      android: { elevation: 100 },
      default: {},
    }),
  },
  pillSlot: {
    width: '100%',
    height: BAR_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(Platform.OS === 'web' ? ({ cursor: 'default' } as any) : {}),
  },
  pillScaled: Platform.select({
    web: { transformOrigin: 'bottom center' } as object,
    default: {},
  }),
  pill: {
    width: '100%',
    height: BAR_HEIGHT,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
  },
  pillShadow: Platform.select({
    ios: {
      shadowColor: '#1F2D3A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 18,
    },
    android: { elevation: 8 },
    default: {
      boxShadow: [
        '0 10px 36px rgba(31, 45, 58, 0.14)',
        '0 2px 8px rgba(31, 45, 58, 0.07)',
        'inset 0 -1px 0 rgba(255, 255, 255, 0.12)',
      ].join(', '),
    },
  }),
  topShine: {
    ...StyleSheet.absoluteFill,
    opacity: 0.9,
  },
  diagonalShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '55%',
    height: '75%',
    opacity: 0.45,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    position: 'relative',
  },
  indicatorWrap: {
    position: 'absolute',
    top: (BAR_HEIGHT - INDICATOR_HEIGHT) / 2,
    left: 0,
    width: INDICATOR_WIDTH,
    height: INDICATOR_HEIGHT,
    zIndex: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 1,
  },
  tabIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  tabWebHover: Platform.OS === 'web'
    ? { cursor: 'pointer' as const }
    : {},
  activePill: {
    width: INDICATOR_WIDTH,
    height: INDICATOR_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
  },
});
