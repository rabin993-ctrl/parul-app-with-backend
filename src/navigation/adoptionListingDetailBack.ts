import { useCallback } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import type { AdoptionListingReturnTo } from './adoptionListingRouting';

/** Pop within the adoption stack, or return to the screen that opened this listing. */
export function useAdoptionListingDetailBack(returnTo?: AdoptionListingReturnTo) {
  const navigation = useNavigation();

  return useCallback(() => {
    const state = navigation.getState();
    if (state && state.index > 0) {
      navigation.dispatch(StackActions.pop());
      return;
    }

    if (returnTo) {
      const feedNav = navigation.getParent();
      const tabNav = feedNav?.getParent();
      tabNav?.navigate(
        returnTo.tab as never,
        { screen: returnTo.screen, params: returnTo.params } as never,
      );
      return;
    }

    if (navigation.canGoBack()) {
      navigation.dispatch(StackActions.pop());
      return;
    }

    const feedNav = navigation.getParent();
    feedNav?.navigate('AdoptionHub' as never, { screen: 'Listing' } as never);
  }, [navigation, returnTo]);
}
