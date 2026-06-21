import type { lightColors } from './tokens';

/** Soft neutral canvas — profile screens (owner + public + settings), light mode only. */
export const profileOwnerLightColors = {
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  surface2: '#F5F5F5',
  neutralBg: '#EFEFEF',
};

export const profileOwnerLightGradients = {
  background: {
    colors: ['#FFFFFF', '#FAFAFA', '#F6F6F6', '#F2F2F2'] as const,
    locations: [0, 0.28, 0.62, 1] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  glow: {
    colors: ['rgba(0,0,0,0.025)', 'rgba(0,0,0,0.012)', 'transparent'] as const,
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
