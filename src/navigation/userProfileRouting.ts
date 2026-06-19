type TabNavigation = {
  navigate: (name: string, params?: object) => void;
};

type NestedNavigation = TabNavigation & {
  getParent?: () => TabNavigation | undefined;
};

/** Open own profile home or another user's public profile from a tab navigator. */
export function navigateToUserProfile(
  navigation: TabNavigation,
  userId: string,
  currentUserId: string | undefined | null,
  options?: { returnTo?: 'Feed' | 'Hub' | 'Messages' | 'Profile' },
) {
  if (currentUserId && userId === currentUserId) {
    navigation.navigate('Profile', { screen: 'Home' });
    return;
  }
  navigation.navigate('Circles', {
    screen: 'UserProfile',
    params: { userId, ...(options?.returnTo ? { returnTo: options.returnTo } : {}) },
  });
}

/** Same as {@link navigateToUserProfile} from a nested stack (e.g. Profile tab). */
export function navigateToUserProfileFromNested(
  navigation: NestedNavigation,
  userId: string,
  currentUserId: string | undefined | null,
  options?: { returnTo?: 'Feed' | 'Hub' | 'Messages' | 'Profile' },
) {
  const tabNav = navigation.getParent?.() ?? navigation;
  navigateToUserProfile(tabNav, userId, currentUserId, {
    returnTo: options?.returnTo ?? 'Profile',
  });
}
