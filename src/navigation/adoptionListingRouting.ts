type TabNavigation = {
  navigate: (name: string, params?: object) => void;
};

type NestedNavigation = TabNavigation & {
  getParent?: () => TabNavigation | undefined;
};

/** Open an adoption listing detail from any nested navigator. */
export function navigateToAdoptionListing(
  navigation: TabNavigation,
  listingId: string,
) {
  navigation.navigate('Feed', {
    screen: 'AdoptionHub',
    params: {
      screen: 'Detail',
      params: { listingId },
    },
  });
}

export function navigateToAdoptionListingFromNested(
  navigation: NestedNavigation,
  listingId: string,
) {
  const tabNav = navigation.getParent?.() ?? navigation;
  navigateToAdoptionListing(tabNav, listingId);
}
