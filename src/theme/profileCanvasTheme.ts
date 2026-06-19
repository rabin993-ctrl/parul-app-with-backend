import type { lightColors } from './tokens';

/** Layered lavender canvas — profile screens (owner + public + settings), light mode only. */
export const profileOwnerLightColors = {
  bg: '#F3EEF9',
  surface: '#FFFFFF',
  surface2: '#F7F4FC',
  neutralBg: '#EDE6F5',
};

export const profileOwnerLightGradients = {
  background: {
    colors: ['#FAF8FD', '#F3EEF9', '#EBE4F5', '#E4DAF0'] as const,
    locations: [0, 0.28, 0.62, 1] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  glow: {
    colors: ['rgba(124,92,191,0.10)', 'rgba(224,122,111,0.05)', 'transparent'] as const,
    locations: [0, 0.35, 0.72] as const,
    start: { x: 0.2, y: 0 },
    end: { x: 0.8, y: 0.55 },
  },
};

export function profileOwnerScreenBg(
  isDark: boolean,
  colors: typeof lightColors,
): string {
  return isDark ? colors.bg : profileOwnerLightColors.bg;
}
