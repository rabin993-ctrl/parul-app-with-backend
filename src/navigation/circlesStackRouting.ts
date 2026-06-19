import { CommonActions } from '@react-navigation/native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/** Open Paw Circles hub — switch to the tab and reset the nested stack to Hub only. */
export function navigateCirclesHub(tabNavigation: NavigationProp<ParamListBase>) {
  const state = tabNavigation.getState();
  if (!state?.routes) {
    tabNavigation.navigate('Circles', { screen: 'Hub' });
    return;
  }

  const circlesIndex = state.routes.findIndex(route => route.name === 'Circles');
  if (circlesIndex < 0) {
    tabNavigation.navigate('Circles', { screen: 'Hub' });
    return;
  }

  const routes = state.routes.map(route => {
    if (route.name !== 'Circles') return route;
    return {
      ...route,
      state: {
        routes: [{ name: 'Hub' }],
        index: 0,
      },
    };
  });

  tabNavigation.dispatch(
    CommonActions.reset({
      ...state,
      routes,
      index: circlesIndex,
    }),
  );
}

/** Reset the Circles stack to Hub without changing the active tab (e.g. after jumping to Feed). */
export function resetCirclesStackToHub(tabNavigation: NavigationProp<ParamListBase>) {
  const state = tabNavigation.getState();
  if (!state?.routes) return;

  const circlesIndex = state.routes.findIndex(route => route.name === 'Circles');
  if (circlesIndex < 0) return;

  const circlesRoute = state.routes[circlesIndex];
  const stackRoutes = circlesRoute.state?.routes ?? [];
  if (stackRoutes.length === 1 && stackRoutes[0]?.name === 'Hub') return;

  const routes = state.routes.map((route, index) => {
    if (index !== circlesIndex) return route;
    return {
      ...route,
      state: {
        routes: [{ name: 'Hub' }],
        index: 0,
      },
    };
  });

  tabNavigation.dispatch(
    CommonActions.reset({
      ...state,
      routes,
      index: state.index,
    }),
  );
}

/** Tab navigator from a screen nested under Circles → stack → tabs. */
export function circlesTabNavigation(
  navigation: NavigationProp<ParamListBase>,
): NavigationProp<ParamListBase> | undefined {
  let nav: NavigationProp<ParamListBase> | undefined = navigation;
  for (let depth = 0; depth < 4 && nav; depth += 1) {
    const routes = nav.getState()?.routes;
    if (routes?.some(route => route.name === 'Circles' || route.name === 'Feed')) {
      return nav;
    }
    nav = nav.getParent() ?? undefined;
  }
  return undefined;
}
