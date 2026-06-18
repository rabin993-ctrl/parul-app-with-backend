import React, {
  createContext, useCallback, useContext, useMemo, useRef, useState,
} from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

type TabBarScrollContextValue = {
  /** True while the user is scrolling down — tab bar squeezes until scroll-up or hover. */
  scrollEngaged: boolean;
  reportScroll: () => void;
  clearScrollEngaged: () => void;
};

const TabBarScrollContext = createContext<TabBarScrollContextValue | null>(null);

const SCROLL_DELTA_THRESHOLD = 2;
const TOP_OFFSET_THRESHOLD = 4;

export function TabBarScrollProvider({ children }: { children: React.ReactNode }) {
  const [scrollEngaged, setScrollEngaged] = useState(false);

  const reportScroll = useCallback(() => {
    setScrollEngaged(true);
  }, []);

  const clearScrollEngaged = useCallback(() => {
    setScrollEngaged(false);
  }, []);

  const value = useMemo(
    () => ({ scrollEngaged, reportScroll, clearScrollEngaged }),
    [scrollEngaged, reportScroll, clearScrollEngaged],
  );

  return (
    <TabBarScrollContext.Provider value={value}>
      {children}
    </TabBarScrollContext.Provider>
  );
}

export function useTabBarScrollEngaged(): boolean {
  return useContext(TabBarScrollContext)?.scrollEngaged ?? false;
}

export function useTabBarScrollControl() {
  const ctx = useContext(TabBarScrollContext);
  return {
    clearScrollEngaged: ctx?.clearScrollEngaged ?? (() => {}),
  };
}

/** Spread onto primary tab scroll views so the glass tab bar squeezes on scroll-down (web). */
export function useTabBarScrollProps() {
  const ctx = useContext(TabBarScrollContext);
  const lastY = useRef(0);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!ctx) return;

    const y = e.nativeEvent.contentOffset.y;

    if (y <= TOP_OFFSET_THRESHOLD) {
      lastY.current = y;
      ctx.clearScrollEngaged();
      return;
    }

    const dy = y - lastY.current;
    lastY.current = y;

    if (Math.abs(dy) < SCROLL_DELTA_THRESHOLD) return;

    if (dy > 0) {
      ctx.reportScroll();
    } else {
      ctx.clearScrollEngaged();
    }
  }, [ctx]);

  return {
    onScroll: handleScroll,
    scrollEventThrottle: 16 as const,
  };
}
