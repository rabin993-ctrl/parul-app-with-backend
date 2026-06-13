import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
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
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { useCompanions } from './src/context/CompanionContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthScreen } from './src/screens/auth/AuthScreen';
import { CompanionOnboardingScreen } from './src/screens/onboarding/CompanionOnboardingScreen';
import { FontGate } from './src/components/FontGate';
import { WebInputFocusFix } from './src/components/WebInputFocusFix';
import { BlankInputAccessory } from './src/components/ui/BlankInputAccessory';
import { usePushTokenRegistration } from './src/hooks/usePushTokenRegistration';

function AppInner() {
  const { mode, colors } = useTheme();
  const { initializing, session, user } = useAuth();
  const { companionsLoaded, getMyCompanions } = useCompanions();
  usePushTokenRegistration();

  const isAuthenticated = !!(session && user);
  const waitingForCompanions = isAuthenticated && !companionsLoaded;
  const needsOnboarding = isAuthenticated && companionsLoaded && getMyCompanions(user!.id).length === 0;

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <WebInputFocusFix />
      <BlankInputAccessory />
      {initializing || waitingForCompanions ? (
        <View style={[styles.center, { backgroundColor: colors.bg }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : isAuthenticated ? (
        needsOnboarding ? (
          <CompanionOnboardingScreen />
        ) : (
          <>
            <AppNavigator />
            <FeedPostOverlays />
          </>
        )
      ) : (
        <AuthScreen />
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <FontGate>
          <AuthProvider>
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
          </AuthProvider>
        </FontGate>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
