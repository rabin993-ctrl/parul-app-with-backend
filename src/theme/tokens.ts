import { Platform } from 'react-native';
import { fonts } from './fonts';

/** App-wide light palette — white canvas; profile screens use profileCanvasTheme separately. */
export const lightColors = {
  primary: '#7C5CBF',
  primaryDark: '#6344A8',
  primaryLight: '#9B7FD4',
  onPrimary: '#FFFFFF',
  accent: '#E07A6F',
  accentDark: '#C45F55',
  onAccent: '#FFFFFF',
  bg: '#FFFFFF',
  bgGradientStart: '#FFFFFF',
  bgGradientMid: '#FFFFFF',
  bgGradientEnd: '#FFFFFF',
  surface: '#FFFFFF',
  surface2: '#FFFFFF',
  border: '#E6DDF0',
  borderStrong: '#CEC2E0',
  text: '#1F1A2E',
  textSecondary: '#6B6280',
  textTertiary: '#9B94A8',
  shadow: 'rgba(100, 68, 168, 0.10)',
  lost: '#D94452',
  lostBg: '#FDF0F1',
  lostBorder: '#F5D0D3',
  success: '#3A9B72',
  successBg: '#EAF7F0',
  warning: '#C98E2A',
  warningBg: '#FDF6E8',
  danger: '#D94452',
  dangerBg: '#FDF0F1',
  info: '#7C5CBF',
  infoBg: '#F0EBFA',
  neutralBg: '#FFFFFF',
};

export const darkColors: typeof lightColors = {
  primary: '#A88FE8',
  primaryDark: '#8B6FD4',
  primaryLight: '#BBA3F0',
  onPrimary: '#FFFFFF',
  accent: '#F09488',
  accentDark: '#E07A6F',
  onAccent: '#FFFFFF',
  bg: '#14101C',
  bgGradientStart: '#0E0A14',
  bgGradientMid: '#161222',
  bgGradientEnd: '#1E1830',
  surface: '#221C32',
  surface2: '#2A243C',
  border: '#3A3250',
  borderStrong: '#4E4468',
  text: '#F0EBF8',
  textSecondary: '#A89CB8',
  textTertiary: '#7A708C',
  shadow: 'rgba(0, 0, 0, 0.38)',
  lost: '#F06B75',
  lostBg: '#2E1818',
  lostBorder: '#5A2828',
  success: '#4CB88A',
  successBg: '#122820',
  warning: '#E0A840',
  warningBg: '#2A2210',
  danger: '#F06B75',
  dangerBg: '#2E1818',
  info: '#A88FE8',
  infoBg: '#1E1830',
  neutralBg: '#2A243C',
};

export const lightGradients = {
  background: {
    colors: ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'] as const,
    locations: [0, 0.28, 0.62, 1] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  glow: {
    colors: ['transparent', 'transparent', 'transparent'] as const,
    locations: [0, 0.35, 0.7] as const,
    start: { x: 0.2, y: 0 },
    end: { x: 0.8, y: 0.55 },
  },
  /** Profile hero band — light mode only */
  profileHero: {
    colors: ['#EDE8F8', '#E4DCF2', '#F0EBFA'] as const,
    locations: [0, 0.52, 1] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  primary: {
    colors: ['#A88FE8', '#7C5CBF', '#6344A8'] as const,
    locations: [0, 0.5, 1] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

export const darkGradients = {
  background: {
    colors: ['#0E0A14', '#161222', '#1E1830', '#261E38'] as const,
    locations: [0, 0.3, 0.65, 1] as const,
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
  },
  glow: {
    colors: ['rgba(168,143,232,0.18)', 'rgba(240,148,136,0.08)', 'transparent'] as const,
    locations: [0, 0.4, 0.75] as const,
    start: { x: 0.2, y: 0 },
    end: { x: 0.8, y: 0.5 },
  },
  primary: {
    colors: ['#BBA3F0', '#A88FE8', '#8B6FD4'] as const,
    locations: [0, 0.5, 1] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

/** Neutral modal veil — avoids blur amplifying the gradient underneath */
export const modalScrim = {
  light: 'rgba(31, 26, 46, 0.52)',
  dark: 'rgba(0, 0, 0, 0.80)',
};

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xl2: 32,
  full: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xl2: 24,
  xl3: 32,
};

/** Typography scale aligned with FeedScreen (Source Sans 3) */
export const typography = {
  /** App top bar titles — Feed hub, Paw Circle, profile @handle, etc. */
  appHeaderTitle: { fontSize: 18, fontFamily: fonts.extrabold, letterSpacing: -0.2 },
  /** Screen / modal titles */
  navTitle: { fontSize: 18, fontFamily: fonts.extrabold, letterSpacing: -0.2 },
  /** Large profile / hero names */
  heroName: { fontSize: 20, fontFamily: fonts.extrabold, letterSpacing: -0.3 },
  /** Post author, companion names */
  title: { fontSize: 15.5, fontFamily: fonts.bold },
  /** Primary body copy (posts, descriptions) */
  body: { fontSize: 15.5, fontFamily: fonts.regular, lineHeight: 23 },
  /** Secondary body */
  bodySm: { fontSize: 14, fontFamily: fonts.regular, lineHeight: 21 },
  /** Chips, links, emphasis labels */
  label: { fontSize: 13.5, fontFamily: fonts.semibold },
  /** Action links */
  link: { fontSize: 13, fontFamily: fonts.bold },
  /** Supporting copy */
  small: { fontSize: 13, fontFamily: fonts.regular, lineHeight: 18 },
  /** Timestamps, handles */
  meta: { fontSize: 12, fontFamily: fonts.regular },
  /** Compact labels */
  caption: { fontSize: 12, fontFamily: fonts.semibold },
  /** Section eyebrows (POST TO, MY COMPANION) */
  sectionLabel: {
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  /** Stat numbers */
  stat: { fontSize: 18, fontFamily: fonts.extrabold, letterSpacing: -0.3 },
  statLabel: { fontSize: 11, fontFamily: fonts.semibold, lineHeight: 14 },
  /** Legacy aliases */
  page: { fontSize: 27, fontFamily: fonts.bold },
  section: { fontSize: 20, fontFamily: fonts.bold },
  card: { fontSize: 16, fontFamily: fonts.semibold },
};

/** Shared bottom-sheet and inline-drawer sizing */
/** iOS Safari auto-zooms focused inputs below 16px — use for mobile text fields. */
export const MOBILE_INPUT_FONT_SIZE = 16;

export const sheetLayout = {
  /** Default max height as a fraction of screen height */
  maxHeightRatio: 0.84,
  /** Min gap from top of screen when a sheet is fully expanded */
  topInset: 24,
  /** Inline dropdown drawers (e.g. adoption inbox) — not profile hero chrome */
  drawerMaxHeightRatio: 0.72,
  drawerMaxHeightCap: 520,
  /** Scrollable list regions inside sheets */
  listScrollMax: 420,
} as const;

export const shadows = {
  sm: Platform.select({
    ios: { shadowColor: '#4A3068', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 5 },
    android: { elevation: 2 },
  }),
  md: Platform.select({
    ios: { shadowColor: '#4A3068', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.13, shadowRadius: 12 },
    android: { elevation: 4 },
  }),
  lg: Platform.select({
    ios: { shadowColor: '#4A3068', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.17, shadowRadius: 20 },
    android: { elevation: 8 },
  }),
};
