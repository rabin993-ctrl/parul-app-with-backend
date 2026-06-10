import React, {
  createContext, useCallback, useContext, useMemo, useState,
} from 'react';

type TabBarScrollContextValue = {
  /** True after the user scrolls — tab bar stays squeezed until hover or tab change. */
  scrollEngaged: boolean;
  reportScroll: () => void;
  clearScrollEngaged: () => void;
};

const TabBarScrollContext = createContext<TabBarScrollContextValue | null>(null);

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

/** Spread onto primary tab scroll views so the glass tab bar squeezes while scrolling (web). */
export function useTabBarScrollProps() {
  const ctx = useContext(TabBarScrollContext);

  const bump = useCallback(() => {
    ctx?.reportScroll();
  }, [ctx]);

  return {
    onScroll: bump,
    onScrollBeginDrag: bump,
    onScrollEndDrag: bump,
    onMomentumScrollEnd: bump,
    scrollEventThrottle: 16 as const,
  };
}
