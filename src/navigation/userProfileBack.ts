import { useCallback } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';

export type UserProfileReturnTo = 'Feed' | 'Hub' | 'Messages' | 'Profile';

/** Pop within the Circles stack, or return to the originating tab — avoids blank web back. */
export function useUserProfileBack(returnTo?: UserProfileReturnTo) {
  const navigation = useNavigation();

  return useCallback(() => {
    const state = navigation.getState();
    if (state && state.index > 0) {
      navigation.dispatch(StackActions.pop());
      return;
    }

    const tabNav = navigation.getParent();

    if (returnTo === 'Feed') {
      tabNav?.navigate('Feed' as never, { screen: 'FeedHome' } as never);
      return;
    }
    if (returnTo === 'Profile') {
      tabNav?.navigate('Profile' as never, { screen: 'Home' } as never);
      return;
    }
    if (returnTo === 'Hub' || returnTo === 'Messages') {
      navigation.navigate('Hub' as never);
      return;
    }

    if (state?.routeNames?.includes('Hub')) {
      navigation.navigate('Hub' as never);
      return;
    }

    if (navigation.canGoBack()) {
      navigation.dispatch(StackActions.pop());
    }
  }, [navigation, returnTo]);
}
