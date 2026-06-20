import { CommonActions } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/** Open profile home — switch to the tab and reset the nested stack to Home only. */
export function navigateProfileHome(
  tabNavigation: Pick<NavigationProp<ParamListBase>, 'dispatch' | 'getState' | 'navigate'>,
) {
  const state = tabNavigation.getState();
  if (!state?.routes) {
    tabNavigation.navigate('Profile', { screen: 'Home' });
    return;
  }

  const profileIndex = state.routes.findIndex(route => route.name === 'Profile');
  if (profileIndex < 0) {
    tabNavigation.navigate('Profile', { screen: 'Home' });
    return;
  }

  const routes = state.routes.map(route => {
    if (route.name !== 'Profile') return route;
    return {
      ...route,
      state: {
        routes: [{ name: 'Home' }],
        index: 0,
      },
    };
  });

  tabNavigation.dispatch(
    CommonActions.reset({
      ...state,
      routes,
      index: profileIndex,
    }),
  );
}
