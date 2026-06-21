import type { ViewStyle } from 'react-native';

const UNREAD_STRIPE = 3;

/** Full-bleed unread row tint — grey inset in light mode, purple + stripe in dark mode. */
export function unreadListRowStyle(opts: {
  isUnread: boolean;
  listBleed: number;
  rowInset: number;
  isDark: boolean;
  groupedBg: string;
  colors: { infoBg: string; primary: string };
}): ViewStyle | null {
  const { isUnread, listBleed, rowInset, isDark, groupedBg, colors } = opts;
  if (!isUnread) return null;

  if (isDark) {
    return {
      marginHorizontal: -listBleed,
      paddingLeft: listBleed + rowInset - UNREAD_STRIPE,
      paddingRight: listBleed + rowInset,
      backgroundColor: colors.infoBg,
      borderLeftWidth: UNREAD_STRIPE,
      borderLeftColor: colors.primary,
    };
  }

  return {
    marginHorizontal: -listBleed,
    paddingHorizontal: listBleed + rowInset,
    backgroundColor: groupedBg,
  };
}
