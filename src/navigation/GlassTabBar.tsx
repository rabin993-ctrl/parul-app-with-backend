import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Animated, Easing } from 'react-native';
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
import { radius } from '../theme/tokens';
import { useHomeHub } from '../context/HomeHubContext';
import type { HomeSectionTab } from '../components/ui/HomeHubDropdown';
import { FEED_HOME_SCREEN, feedHubScreenForSection } from './feedHubNavigation';
import { navigateCirclesHub } from './circlesStackRouting';
import { navigateProfileHome } from './profileStackRouting';
import { usePawCircleTabBadgeCount } from '../hooks/useUnreadMessagesCount';
import { shouldHideTabBarForCirclesRoute } from './tabBarVisibility';

/** Tabs registered in the navigator but not shown in the glass bar. */
const HIDDEN_TAB_NAMES = new Set(['Community', 'Vet']);

const TAB_ICONS: Record<string, { name: string; fillWhenFocused?: boolean; usePawCircleLogo?: boolean; size?: number }> = {
  Feed: { name: 'home', fillWhenFocused: true },
  Circles: { name: 'circles', usePawCircleLogo: true },
  Profile: { name: 'user' },
};

const ADOPTION_HUB_ITEM = {
  kind: 'hub' as const,
  hub: 'adoption' as HomeSectionTab,
  label: 'Adoption',
  icon: 'paw-line',
  focusedIcon: 'paw',
  fillWhenFocused: true,
};

const RESCUE_HUB_ITEM = {
  kind: 'hub' as const,
  hub: 'rescue' as HomeSectionTab,
  label: 'Rescues',
  icon: 'shield',
  fillWhenFocused: true,
};

type BarItem =
  | { kind: 'route'; route: { key: string; name: string }; routeIndex: number }
  | { kind: 'hub'; hub: HomeSectionTab; label: string; icon: string; focusedIcon?: string; fillWhenFocused?: boolean };

const TAB_ICON_SIZE = 32;
const BAR_HEIGHT = 68;
const INDICATOR_WIDTH = 60;
const INDICATOR_HEIGHT = 52;
const ROW_H_PAD = 6;
const BAR_SCALE_NORMAL = 1;
const BAR_SCALE_SQUEEZED = 0.78;
const BAR_SQUEEZE_TIMING = {
  duration: 340,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};
const BAR_EXPAND_TIMING = {
  duration: 420,
  easing: Easing.bezier(0.22, 0.61, 0.36, 1),
};
const SQUEEZE_ENABLED = Platform.OS === 'web';

function TabItem({
  label,
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
  label: string;
  highlighted: boolean;
  config: { name: string; focusedIcon?: string; fillWhenFocused?: boolean; usePawCircleLogo?: boolean; size?: number };
  colors: { primary: string; text: string; danger: string };
  onPress: () => void;
  onLongPress?: () => void;
  onHoverIn: () => void;
  onHoverOut: () => void;
  onBarEnter: () => void;
  onBarPressIn: () => void;
  onBarPressOut: () => void;
  badgeCount?: number;
}) {
  const [pressed, setPressed] = useState(false);
  const iconColor = highlighted ? colors.primary : colors.text;
  const iconName = highlighted && config.focusedIcon ? config.focusedIcon : config.name;
  const iconFill =
    highlighted && (config.fillWhenFocused || config.focusedIcon) ? iconColor : 'none';

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
      accessibilityLabel={label}
    >
      <View style={[
        config.usePawCircleLogo ? styles.tabIconWrapPaw : styles.tabIconWrap,
        { opacity: pressed ? 0.7 : 1 },
      ]}>
        {config.usePawCircleLogo ? (
          <PawCircleLogo size={TAB_ICON_SIZE} color={iconColor} />
        ) : (
          <Icon
            name={iconName}
            size={config.size ?? TAB_ICON_SIZE}
            color={iconColor}
            fill={iconFill}
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

export function GlassTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const scrollEngaged = useTabBarScrollEngaged();
  const { clearScrollEngaged } = useTabBarScrollControl();
  const scrollEngagedRef = useRef(scrollEngaged);
  const pawCircleBadgeCount = usePawCircleTabBadgeCount();
  const sheetOpen = useSheetOverlayOpen();
  const { resetToFeed, selectSection, homeTab } = useHomeHub();
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
    scaleAnim.current = Animated.timing(barScale, {
      toValue,
      duration: expanded ? BAR_EXPAND_TIMING.duration : BAR_SQUEEZE_TIMING.duration,
      easing: expanded ? BAR_EXPAND_TIMING.easing : BAR_SQUEEZE_TIMING.easing,
      useNativeDriver: true,
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

  const visibleTabs = useMemo(
    () =>
      state.routes
        .map((route, index) => ({ route, index }))
        .filter(({ route }) => !HIDDEN_TAB_NAMES.has(route.name)),
    [state.routes],
  );

  const barItems = useMemo(() => {
    const routeByName = new Map(
      visibleTabs.map(({ route, index: routeIndex }) => [route.name, { route, routeIndex }]),
    );
    const feed = routeByName.get('Feed');
    const circles = routeByName.get('Circles');
    const profile = routeByName.get('Profile');
    const items: BarItem[] = [];

    if (feed) items.push({ kind: 'route', ...feed });
    if (circles) items.push({ kind: 'route', ...circles });
    items.push(ADOPTION_HUB_ITEM);
    items.push(RESCUE_HUB_ITEM);
    if (profile) items.push({ kind: 'route', ...profile });

    return items;
  }, [visibleTabs]);

  const activeBarIndex = useMemo(() => {
    for (let i = 0; i < barItems.length; i++) {
      const item = barItems[i];
      if (item.kind === 'route' && item.route.name === 'Feed' && state.index === item.routeIndex) {
        if (homeTab === 'feed') return i;
        const adoptionIdx = barItems.findIndex(
          entry => entry.kind === 'hub' && entry.hub === 'adoption',
        );
        const rescueIdx = barItems.findIndex(
          entry => entry.kind === 'hub' && entry.hub === 'rescue',
        );
        if (homeTab === 'adoption' && adoptionIdx >= 0) return adoptionIdx;
        if (homeTab === 'rescue' && rescueIdx >= 0) return rescueIdx;
        return i;
      }
      if (item.kind === 'route' && state.index === item.routeIndex) {
        return i;
      }
    }
    return -1;
  }, [barItems, state.index, homeTab]);

  const tabCount = barItems.length;
  const targetIndex =
    hoveredIndex ?? (activeBarIndex >= 0 ? activeBarIndex : 0);
  const showIndicator = hoveredIndex !== null || activeBarIndex >= 0;
  const contentWidth = Math.max(rowWidth - ROW_H_PAD * 2, 0);
  const tabWidth = contentWidth > 0 && tabCount > 0 ? contentWidth / tabCount : 0;
  const targetX = ROW_H_PAD + tabWidth * targetIndex + (tabWidth - INDICATOR_WIDTH) / 2;

  useEffect(() => {
    if (rowWidth <= 0) return;
    Animated.spring(translateX, {
      toValue: targetX,
      useNativeDriver: true,
      tension: 68,
      friction: 13,
    }).start();
  }, [targetX, rowWidth, translateX]);

  const activeTabRoute = state.routes[state.index];
  const hideForCirclesChat = activeTabRoute.name === 'Circles'
    && shouldHideTabBarForCirclesRoute(activeTabRoute);

  if (sheetOpen || hideForCirclesChat) return null;

  const pillBorder = {
    borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.55)',
  };

  return (
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
            {rowWidth > 0 && showIndicator && (
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

            {barItems.map((item, barIndex) => {
              const highlighted =
                hoveredIndex === barIndex
                || (hoveredIndex === null && activeBarIndex === barIndex);

              if (item.kind === 'hub') {
                const config = {
                  name: item.icon,
                  focusedIcon: item.focusedIcon,
                  fillWhenFocused: item.fillWhenFocused,
                };

                return (
                  <TabItem
                    key={`hub-${item.hub}`}
                    label={item.label}
                    highlighted={highlighted}
                    config={config}
                    colors={colors}
                    onPress={() => {
                      onTabSelected();
                      selectSection(item.hub);
                      navigation.navigate('Feed', { screen: feedHubScreenForSection(item.hub) });
                    }}
                    onHoverIn={() => setHoveredIndex(barIndex)}
                    onHoverOut={() => setHoveredIndex(null)}
                    onBarEnter={onBarEnter}
                    onBarPressIn={onBarPressIn}
                    onBarPressOut={onBarPressOut}
                  />
                );
              }

              const { route, routeIndex } = item;
              const config = TAB_ICONS[route.name] ?? { name: 'home' };

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (event.defaultPrevented) return;

                onTabSelected();

                if (route.name === 'Feed') {
                  resetToFeed();
                  navigation.navigate('Feed', { screen: FEED_HOME_SCREEN });
                  return;
                }

                if (route.name === 'Circles') {
                  navigateCirclesHub(navigation);
                  return;
                }

                if (route.name === 'Profile') {
                  navigateProfileHome(navigation);
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
                  label={route.name}
                  highlighted={highlighted}
                  config={config}
                  colors={colors}
                  badgeCount={
                    route.name === 'Circles'
                      ? (pawCircleBadgeCount > 0 ? pawCircleBadgeCount : undefined)
                    : route.name === 'Profile'
                      ? (descriptors[route.key]?.options?.tabBarBadge as number | undefined) || undefined
                    : undefined
                  }
                  onPress={onPress}
                  onLongPress={onLongPress}
                  onHoverIn={() => setHoveredIndex(barIndex)}
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
    paddingHorizontal: ROW_H_PAD,
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
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  tabIconWrapPaw: {
    position: 'relative',
    width: TAB_ICON_SIZE + 4,
    height: TAB_ICON_SIZE + 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  tabBadge: {
    position: 'absolute',
    top: -2,
    right: -8,
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
