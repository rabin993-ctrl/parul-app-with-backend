import React, { createContext, useContext, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { lightColors, darkColors } from './tokens';

type Colors = typeof lightColors;
type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: Colors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  colors: lightColors,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const colors = mode === 'light' ? lightColors : darkColors;
  const toggleTheme = () => setMode(m => (m === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ mode, colors, toggleTheme }}>
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
