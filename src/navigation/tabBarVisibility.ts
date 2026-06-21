import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import type { ParamListBase, RouteProp } from '@react-navigation/native';

export const TAB_BAR_BASE_STYLE = {
  position: 'absolute' as const,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'transparent',
  borderTopWidth: 0,
  elevation: 0,
  shadowOpacity: 0,
};

export const CIRCLES_HIDE_TAB_BAR_ROUTES = [
  'CircleChat',
  'ChatThread',
  'CircleMembers',
  'CircleSettings',
  'CircleAdmin',
] as const;

type NestedRoute = Partial<Pick<RouteProp<ParamListBase>, 'name' | 'state'>>;

export function getNestedFocusedRouteName(
  route: NestedRoute | undefined,
  fallback = 'Hub',
): string {
  if (!route) return fallback;
  return getFocusedRouteNameFromRoute(route as RouteProp<ParamListBase>) ?? fallback;
}

export function shouldHideTabBarForCirclesRoute(route: NestedRoute | undefined): boolean {
  const routeName = getNestedFocusedRouteName(route);
  return (CIRCLES_HIDE_TAB_BAR_ROUTES as readonly string[]).includes(routeName);
}
