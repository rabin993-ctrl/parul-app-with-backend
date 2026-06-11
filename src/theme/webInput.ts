import { Platform } from 'react-native';

/** Suppress browser default focus ring on RN Web text inputs */
export const webNoOutline = Platform.select({
  web: { outlineStyle: 'none', outlineWidth: 0 } as object,
  default: {},
});
