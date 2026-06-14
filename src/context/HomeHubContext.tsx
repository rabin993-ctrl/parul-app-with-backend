import React, { createContext, useCallback, useContext, useState } from 'react';
import type { HomeHubTab, HomeSectionTab } from '../components/ui/HomeHubDropdown';

type HomeHubContextValue = {
  homeTab: HomeHubTab;
  setHomeTab: (tab: HomeHubTab) => void;
  selectSection: (tab: HomeSectionTab) => void;
  resetToFeed: () => void;
};

const HomeHubContext = createContext<HomeHubContextValue | null>(null);

export function HomeHubProvider({ children }: { children: React.ReactNode }) {
  const [homeTab, setHomeTab] = useState<HomeHubTab>('feed');

  const resetToFeed = useCallback(() => setHomeTab('feed'), []);
  const selectSection = useCallback((tab: HomeSectionTab) => setHomeTab(tab), []);

  const value = React.useMemo(
    () => ({ homeTab, setHomeTab, selectSection, resetToFeed }),
    [homeTab, selectSection, resetToFeed],
  );

  return (
    <HomeHubContext.Provider value={value}>
      {children}
    </HomeHubContext.Provider>
  );
}

export function useHomeHub() {
  const ctx = useContext(HomeHubContext);
  if (!ctx) throw new Error('useHomeHub must be used within HomeHubProvider');
  return ctx;
}
