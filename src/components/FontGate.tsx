import React from 'react';
import { useFonts } from '@expo-google-fonts/source-sans-3';
import { FONT_ASSETS } from '../theme/fonts';

/** Loads Source Sans 3 in the background — never blocks the UI. */
export function FontGate({ children }: { children: React.ReactNode }) {
  useFonts(FONT_ASSETS);
  return <>{children}</>;
}
