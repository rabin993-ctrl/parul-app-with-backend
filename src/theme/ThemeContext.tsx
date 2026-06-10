import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  lightColors,
  darkColors,
  lightGradients,
  darkGradients,
  modalScrim,
} from './tokens';
import {
  adaptGroupedListBg,
  adaptIconBg,
  adaptModalScrim,
  getPostTagStyle,
  type ThemeMode,
} from './adaptColor';
import type { PostTag } from '../data/mockData';

type Colors = typeof lightColors;

interface ThemeContextValue {
  mode: ThemeMode;
  colors: Colors;
  gradients: typeof lightGradients | typeof darkGradients;
  scrim: string;
  isDark: boolean;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  iconBg: (lightBg: string) => string;
  groupedBg: string;
  postTag: (tag: PostTag) => { label: string; bg: string; text: string };
}

const STORAGE_KEY = '@parul/theme-mode';

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  colors: lightColors,
  gradients: lightGradients,
  scrim: modalScrim.light,
  isDark: false,
  toggleTheme: () => {},
  setMode: () => {},
  iconBg: (light) => light,
  groupedBg: '#F2F2F7',
  postTag: (tag) => getPostTagStyle(tag, 'light'),
});

function readSystemPreference(): ThemeMode | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        if (!mounted) return;
        if (stored === 'light' || stored === 'dark') {
          setModeState(stored);
          return;
        }
        const system = readSystemPreference();
        if (system) setModeState(system);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  const colors = mode === 'light' ? lightColors : darkColors;
  const gradients = mode === 'light' ? lightGradients : darkGradients;
  const scrim = adaptModalScrim(mode);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    colors,
    gradients,
    scrim,
    isDark: mode === 'dark',
    toggleTheme,
    setMode,
    iconBg: (lightBg: string) => adaptIconBg(lightBg, mode),
    groupedBg: adaptGroupedListBg(mode),
    postTag: (tag: PostTag) => getPostTagStyle(tag, mode),
  }), [mode, colors, gradients, scrim, toggleTheme, setMode]);

  return (
    <ThemeContext.Provider value={value}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export function useTheme() {
  return useContext(ThemeContext);
}
