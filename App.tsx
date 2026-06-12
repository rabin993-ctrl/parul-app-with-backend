import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { TreatWalletProvider } from './src/context/TreatWalletContext';
import { PawCircleProvider } from './src/context/PawCircleContext';
import { FeedPostProvider, FeedPostOverlays } from './src/context/FeedPostContext';
import { CommunityFeedProvider } from './src/context/CommunityFeedContext';
import { CommunityGroupsProvider } from './src/context/CommunityGroupsContext';
import { AdoptionProvider } from './src/context/AdoptionContext';
import { AdoptionFeedProvider } from './src/context/AdoptionFeedContext';
import { CompanionProvider } from './src/context/CompanionContext';
import { UserPrivacyProvider } from './src/context/UserPrivacyContext';
import { CurrentUserProfileProvider } from './src/context/CurrentUserProfileContext';
import { SheetOverlayProvider } from './src/context/SheetOverlayContext';
import { TabBarScrollProvider } from './src/context/TabBarScrollContext';
import { DevResetProvider } from './src/context/DevResetContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { FontGate } from './src/components/FontGate';
import { WebInputFocusFix } from './src/components/WebInputFocusFix';
import { BlankInputAccessory } from './src/components/ui/BlankInputAccessory';

function AppInner() {
  const { mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <WebInputFocusFix />
      <BlankInputAccessory />
      <AppNavigator />
      <FeedPostOverlays />
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
                <CommunityGroupsProvider>
                  <CommunityFeedProvider>
                    <FeedPostProvider>
                      <AdoptionProvider>
                        <AdoptionFeedProvider>
                          <CompanionProvider>
                            <UserPrivacyProvider>
                              <CurrentUserProfileProvider>
                                <TabBarScrollProvider>
                                  <DevResetProvider>
                                    <AppInner />
                                  </DevResetProvider>
                                </TabBarScrollProvider>
                              </CurrentUserProfileProvider>
                            </UserPrivacyProvider>
                          </CompanionProvider>
                        </AdoptionFeedProvider>
                      </AdoptionProvider>
                    </FeedPostProvider>
                  </CommunityFeedProvider>
                </CommunityGroupsProvider>
              </SheetOverlayProvider>
            </TreatWalletProvider>
          </PawCircleProvider>
        </FontGate>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
