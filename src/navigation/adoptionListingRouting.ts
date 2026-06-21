type TabNavigation = {
  navigate: (name: string, params?: object) => void;
  getState?: () => {
    type?: string;
    index: number;
    routes: { name: string; state?: unknown; params?: object }[];
  };
};

type NestedNavigation = TabNavigation & {
  getParent?: () => NestedNavigation | undefined;
};

export type AdoptionListingReturnTo = {
  tab: 'Feed' | 'Profile' | 'Circles' | 'Community' | 'Vet';
  screen: string;
  params?: Record<string, unknown>;
};

function getTabNavigator(navigation: NestedNavigation): TabNavigation | undefined {
  let nav: NestedNavigation | undefined = navigation;
  while (nav) {
    const state = nav.getState?.();
    if (state?.type === 'tab') return nav;
    nav = nav.getParent?.();
  }
  return undefined;
}

/** Remember where the user was before opening an adoption listing detail cross-tab. */
export function captureAdoptionListingReturnTo(
  navigation: NestedNavigation,
): AdoptionListingReturnTo | undefined {
  const stackState = navigation.getState?.();
  if (!stackState) return undefined;

  const currentRoute = stackState.routes[stackState.index ?? 0];
  if (!currentRoute?.name) return undefined;

  const tabNav = getTabNavigator(navigation);
  if (!tabNav) return undefined;

  const tabState = tabNav.getState?.();
  if (!tabState) return undefined;

  const tabRoute = tabState.routes[tabState.index ?? 0];
  if (!tabRoute?.name) return undefined;

  if (tabRoute.name === 'Feed') {
    const feedState = tabRoute.state as {
      routes?: { name: string; state?: { routes?: { name: string }[]; index?: number } }[];
      index?: number;
    } | undefined;
    const feedRoute = feedState?.routes?.[feedState.index ?? 0];
    if (feedRoute?.name === 'AdoptionHub') {
      const adoptionState = feedRoute.state;
      const adoptionRoute = adoptionState?.routes?.[adoptionState.index ?? 0];
      if (adoptionRoute?.name === 'Listing') {
        return undefined;
      }
    }
  }

  return {
    tab: tabRoute.name as AdoptionListingReturnTo['tab'],
    screen: currentRoute.name,
    params: currentRoute.params as Record<string, unknown> | undefined,
  };
}

/** Open an adoption listing detail from any nested navigator. */
export function navigateToAdoptionListing(
  navigation: TabNavigation,
  listingId: string,
  returnTo?: AdoptionListingReturnTo,
) {
  navigation.navigate('Feed', {
    screen: 'AdoptionHub',
    params: {
      screen: 'Detail',
      params: {
        listingId,
        ...(returnTo ? { returnTo } : {}),
      },
    },
  });
}

export function navigateToAdoptionListingFromNested(
  navigation: NestedNavigation,
  listingId: string,
) {
  const tabNav = navigation.getParent?.() ?? navigation;
  const returnTo = captureAdoptionListingReturnTo(navigation);
  navigateToAdoptionListing(tabNav, listingId, returnTo);
}
