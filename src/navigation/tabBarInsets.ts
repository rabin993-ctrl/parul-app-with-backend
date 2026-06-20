import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of the floating glass tab bar pill */
export const TAB_BAR_PILL_HEIGHT = 68;

/** Minimum padding below the tab bar pill (matches GlassTabBar wrapper) */
export const TAB_BAR_MIN_BOTTOM = 10;

/** Extra breathing room above the tab bar when scrolling to the end */
export const TAB_BAR_SCROLL_EXTRA = 24;

/** Static fallback when hooks aren't available */
export const TAB_BAR_SCROLL_PADDING =
  TAB_BAR_PILL_HEIGHT + TAB_BAR_MIN_BOTTOM + TAB_BAR_SCROLL_EXTRA;

export function useTabBarScrollPadding(extra = TAB_BAR_SCROLL_EXTRA): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_PILL_HEIGHT + Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM) + extra;
}
