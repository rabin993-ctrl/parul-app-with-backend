import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { TreatWalletProvider } from './src/context/TreatWalletContext';
import { PawCircleProvider } from './src/context/PawCircleContext';
import { FeedPostProvider } from './src/context/FeedPostContext';
import { AdoptionProvider } from './src/context/AdoptionContext';
import { SheetOverlayProvider } from './src/context/SheetOverlayContext';
import { TabBarScrollProvider } from './src/context/TabBarScrollContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { FontGate } from './src/components/FontGate';

function AppInner() {
  const { mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <FontGate>
          <PawCircleProvider>
            <TreatWalletProvider>
              <SheetOverlayProvider>
                <FeedPostProvider>
                  <AdoptionProvider>
                    <TabBarScrollProvider>
                      <AppInner />
                    </TabBarScrollProvider>
                  </AdoptionProvider>
                </FeedPostProvider>
              </SheetOverlayProvider>
            </TreatWalletProvider>
          </PawCircleProvider>
        </FontGate>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
