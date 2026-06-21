import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { TreatWalletProvider } from './src/context/TreatWalletContext';
import { PawCircleProvider } from './src/context/PawCircleContext';
import { CirclePreviewProvider } from './src/context/CirclePreviewContext';
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
import { HomeHubProvider } from './src/context/HomeHubContext';
import { NotificationCountProvider } from './src/context/NotificationCountContext';
import { NotificationRoutingBridge } from './src/navigation/NotificationRoutingBridge';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthScreen } from './src/screens/auth/AuthScreen';
import { SetNewPasswordScreen } from './src/screens/auth/SetNewPasswordScreen';
import { AuthConfirmErrorScreen } from './src/screens/auth/AuthConfirmErrorScreen';
import { FontGate } from './src/components/FontGate';
import { WebInputFocusFix } from './src/components/WebInputFocusFix';
import { BlankInputAccessory } from './src/components/ui/BlankInputAccessory';
import { usePushTokenRegistration } from './src/hooks/usePushTokenRegistration';
import { useUserLocationSync } from './src/hooks/useUserLocationSync';
import { useOnlinePresence } from './src/hooks/useOnlinePresence';
import { useAppTutorial } from './src/hooks/useAppTutorial';
import { AppTutorialCarousel } from './src/components/tutorial/AppTutorialCarousel';
import { ConfirmDialogHost } from './src/components/ui/ConfirmDialog';

function AppInner() {
  const { mode, colors } = useTheme();
  const { initializing, session, user, authConfirmPhase } = useAuth();
  const tutorial = useAppTutorial(user?.id);
  usePushTokenRegistration();
  useUserLocationSync();
  useOnlinePresence();

  const isAuthenticated = !!(session && user);
  const pendingRecovery = authConfirmPhase === 'recovery';
  const showTutorial = isAuthenticated
    && tutorial.enabled
    && tutorial.ready
    && !tutorial.completed;

  const handleTutorialComplete = () => {
    void tutorial.markComplete();
  };

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <WebInputFocusFix />
      <BlankInputAccessory />
      {initializing || authConfirmPhase === 'verifying' ? (
        <View style={[styles.center, { backgroundColor: colors.bg }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : authConfirmPhase === 'error' ? (
        <AuthConfirmErrorScreen />
      ) : pendingRecovery ? (
        <SetNewPasswordScreen />
      ) : showTutorial ? (
        <AppTutorialCarousel onComplete={handleTutorialComplete} />
      ) : isAuthenticated ? (
        <>
          <AppNavigator />
          <FeedPostOverlays />
          <ConfirmDialogHost />
        </>
      ) : (
        <AuthScreen />
      )}
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <ThemeProvider>
        <FontGate>
          <AuthProvider>
          {/* CurrentUserProfileProvider only needs AuthProvider above it, and
              FeedPostProvider consumes useCurrentUserProfile() — so it must wrap
              the whole social provider stack, not sit inside it. */}
          <CurrentUserProfileProvider>
          <PawCircleProvider>
            <CirclePreviewProvider>
            <TreatWalletProvider>
              <SheetOverlayProvider>
                <CommunityGroupsProvider>
                  <CommunityFeedProvider>
                    <FeedPostProvider>
                      <AdoptionProvider>
                        <AdoptionFeedProvider>
                          <CompanionProvider>
                            <UserPrivacyProvider>
                                <TabBarScrollProvider>
                                  <DevResetProvider>
                                    <HomeHubProvider>
                                      <NotificationCountProvider>
                                        <NotificationRoutingBridge />
                                        <AppInner />
                                      </NotificationCountProvider>
                                    </HomeHubProvider>
                                  </DevResetProvider>
                                </TabBarScrollProvider>
                            </UserPrivacyProvider>
                          </CompanionProvider>
                        </AdoptionFeedProvider>
                      </AdoptionProvider>
                    </FeedPostProvider>
                  </CommunityFeedProvider>
                </CommunityGroupsProvider>
              </SheetOverlayProvider>
            </TreatWalletProvider>
            </CirclePreviewProvider>
          </PawCircleProvider>
          </CurrentUserProfileProvider>
          </AuthProvider>
        </FontGate>
      </ThemeProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
