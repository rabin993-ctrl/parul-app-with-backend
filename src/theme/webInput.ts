import { Platform } from 'react-native';

/** Suppress browser default focus ring on RN Web text inputs */
export const webNoOutline = Platform.select({
  web: { outlineStyle: 'none', outlineWidth: 0 } as object,
  default: {},
});

/** Ensure sheet / scroll-view inputs receive taps on RN Web */
export const webInputTouch = Platform.select({
  web: { touchAction: 'auto', cursor: 'text' } as object,
  default: {},
});

export const webFieldInputStyle = Platform.select({
  web: {
    outlineStyle: 'none',
    outlineWidth: 0,
    touchAction: 'auto',
    cursor: 'text',
  } as object,
  default: {},
});
