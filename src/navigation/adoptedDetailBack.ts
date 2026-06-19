import { useCallback } from 'react';
import { StackActions, useNavigation, useRoute } from '@react-navigation/native';

/** Pop within the current stack — avoids web browser history jumping to Feed. */
export function useAdoptedDetailBack() {
  const navigation = useNavigation();
  const route = useRoute();

  return useCallback(() => {
    const state = navigation.getState();

    if (state.index > 0) {
      navigation.dispatch(StackActions.pop());
      return;
    }

    if (route.name === 'PublicAdoptedDetail') {
      navigation.navigate('Hub' as never);
      return;
    }

    if (route.name === 'AdoptedDetail') {
      if (state.routeNames.includes('Home')) {
        navigation.navigate('Home' as never);
        return;
      }
      if (state.routeNames.includes('Listing')) {
        navigation.navigate('Listing' as never);
        return;
      }
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, route.name]);
}
