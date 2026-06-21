import type { PostTag } from '../data/mockData';
import { lightColors, darkColors, modalScrim } from './tokens';

export type ThemeMode = 'light' | 'dark';

/** Pastel chip backgrounds — light values are unchanged; dark uses muted equivalents */
const ICON_BG_DARK: Record<string, string> = {
  '#EDE8F8': '#2E2844',
  '#E8E0F4': '#2A2340',
  '#F0EBFA': '#2A2340',
  '#EDE9F4': '#2A243C',
  '#FDF4E4': '#3A3020',
  '#FFE8E8': '#3A2428',
  '#FFE8CC': '#3A3024',
  '#FFD4D4': '#3A2228',
  '#D6F5E8': '#1E342C',
  '#EDE8FC': '#2C2644',
  '#D6F5EE': '#1E342E',
  '#E8F0FA': '#243040',
  '#FCE4F0': '#3A2438',
  '#FDF0F1': '#3A2428',
  '#FDF6E8': '#3A3020',
  '#EFF1F5': '#1C1628',
  '#F2F2F7': '#2A243C',
  '#FFE566': '#4A4428',
  '#FFE0B8': '#4A3824',
  '#FFE8C8': '#4A3828',
};

const POST_TAGS_LIGHT: Record<PostTag, { label: string; bg: string; text: string }> = {
  discussion: { label: 'Discussion', bg: '#FFE566', text: '#2B2620' },
  adoption: { label: 'Adoption', bg: '#FFE0B8', text: '#8A5A00' },
  'lost-found': { label: 'Lost / Found', bg: '#FFD4D4', text: '#A83232' },
  rescue: { label: 'Rescue', bg: '#FFE8C8', text: '#8A5A00' },
  'paw-posting': { label: 'Paw Posting', bg: '#FDF4E4', text: '#B87820' },
  meme: { label: 'Meme', bg: '#EDE8FC', text: '#7A5AE0' },
};

const POST_TAGS_DARK: Record<PostTag, { label: string; bg: string; text: string }> = {
  discussion: { label: 'Discussion', bg: '#4A4428', text: '#F5E8A8' },
  adoption: { label: 'Adoption', bg: '#4A3824', text: '#F5D4A0' },
  'lost-found': { label: 'Lost / Found', bg: '#4A2830', text: '#F5A8A8' },
  rescue: { label: 'Rescue', bg: '#4A3828', text: '#F5D4A0' },
  'paw-posting': { label: 'Paw Posting', bg: '#3A3020', text: '#F5D4A0' },
  meme: { label: 'Meme', bg: '#2E2848', text: '#C4B5FD' },
};

export function adaptIconBg(lightBg: string, mode: ThemeMode): string {
  if (mode === 'light') return lightBg;
  return ICON_BG_DARK[lightBg] ?? darkColors.surface2;
}

export function adaptGroupedListBg(mode: ThemeMode): string {
  return mode === 'light' ? '#F2F2F7' : darkColors.surface2;
}

export function adaptModalScrim(mode: ThemeMode): string {
  return mode === 'dark' ? modalScrim.dark : modalScrim.light;
}

export function getPostTagStyle(tag: PostTag, mode: ThemeMode) {
  return mode === 'light' ? POST_TAGS_LIGHT[tag] : POST_TAGS_DARK[tag];
}

export function getThemeColors(mode: ThemeMode) {
  return mode === 'light' ? lightColors : darkColors;
}
