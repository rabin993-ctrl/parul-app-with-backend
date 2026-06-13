import React, { useRef } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import { GlassTabBar } from './GlassTabBar';
import { FeedScreen } from '../screens/FeedScreen';
import { CirclesNavigator } from './CirclesNavigator';
import { MessagesScreen } from '../screens/MessagesScreen';
import { VetNavigator } from './VetNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { useNotificationDeepLink } from '../hooks/useNotificationDeepLink';
import { useInAppNotificationBanner } from '../hooks/useInAppNotificationBanner';
import { NotificationBanner } from '../components/ui/NotificationBanner';

const Tab = createBottomTabNavigator();

export function AppNavigator() {
  const { colors, mode } = useTheme();
  const navigationRef = useRef<NavigationContainerRef<ParamListBase>>(null);
  useNotificationDeepLink(navigationRef);
  const { banner, clearBanner } = useInAppNotificationBanner();

  const navigateToNotifications = () => {
    const nav = navigationRef.current;
    if (!nav?.isReady()) return;
    nav.navigate('Profile', { screen: 'Notifications' });
  };

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        theme={{
          dark: mode === 'dark',
          colors: {
            primary: colors.primary,
            background: colors.bg,
            card: colors.bg,
            text: colors.text,
            border: colors.border,
            notification: colors.danger,
          },
          fonts: {
            regular: { fontFamily: 'System', fontWeight: '400' },
            medium: { fontFamily: 'System', fontWeight: '500' },
            bold: { fontFamily: 'System', fontWeight: '700' },
            heavy: { fontFamily: 'System', fontWeight: '800' },
          },
        }}
      >
        <Tab.Navigator
          tabBar={props => <GlassTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            lazy: true,
            freezeOnBlur: true,
            sceneStyle: { backgroundColor: colors.bg, flex: 1 },
            tabBarShowLabel: false,
            tabBarStyle: {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'transparent',
              borderTopWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
            },
          }}
        >
          <Tab.Screen name="Feed" component={FeedScreen} />
          <Tab.Screen name="Messages" component={MessagesScreen} />
          <Tab.Screen name="Circles" component={CirclesNavigator} />
          <Tab.Screen name="Vet" component={VetNavigator} />
          <Tab.Screen name="Profile" component={ProfileNavigator} />
        </Tab.Navigator>
      </NavigationContainer>

      <NotificationBanner
        banner={banner}
        onDismiss={clearBanner}
        onTap={navigateToNotifications}
      />
    </View>
  );
}
