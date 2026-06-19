import { useCallback } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';

/** Pop within the current stack — avoids web browser history bouncing between tabs. */
export function useFeedPostDetailBack(fallbackReturnTo?: string) {
  const navigation = useNavigation();

  return useCallback(() => {
    const state = navigation.getState();
    if (!state) return;

    if (state.index > 0) {
      navigation.dispatch(StackActions.pop());
      return;
    }

    const routeNames = state.routeNames as string[];

    if (routeNames.includes('Hub')) {
      navigation.navigate('Hub' as never);
      return;
    }
    if (routeNames.includes('FeedHome')) {
      navigation.navigate('FeedHome' as never);
      return;
    }
    if (fallbackReturnTo && routeNames.includes(fallbackReturnTo)) {
      navigation.navigate(fallbackReturnTo as never);
      return;
    }

    if (navigation.canGoBack()) {
      navigation.dispatch(StackActions.pop());
    }
  }, [navigation, fallbackReturnTo]);
}
