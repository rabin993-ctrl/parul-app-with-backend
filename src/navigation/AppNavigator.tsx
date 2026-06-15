import React, { useRef } from 'react';
import { Platform, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import { GlassTabBar } from './GlassTabBar';
import { FeedScreen } from '../screens/FeedScreen';
import { CommunityNavigator } from './CommunityNavigator';
import { CirclesNavigator } from './CirclesNavigator';
import { VetNavigator } from './VetNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { useNotificationDeepLink } from '../hooks/useNotificationDeepLink';
import { useInAppNotificationBanner } from '../hooks/useInAppNotificationBanner';
import { NotificationBanner } from '../components/ui/NotificationBanner';

const Tab = createBottomTabNavigator();

const linking = {
  prefixes: Platform.OS === 'web'
    ? [typeof window !== 'undefined' ? window.location.origin : '']
    : [],
  config: {
    screens: {
      Feed: '',
      Community: {
        path: 'community',
        screens: {
          Feed: '',
          PostDetail: 'post/:postId',
          CreatePost: 'create-post',
          Search: 'search',
          Rules: 'rules',
          Settings: 'settings',
          Saved: 'saved',
          Group: 'group/:communityId',
          Admin: 'admin/:communityId',
          GroupMembers: 'group-members/:communityId',
          Members: 'members',
          PendingRequests: 'pending',
          Discover: 'discover',
          Create: 'new',
        },
      },
      Circles: {
        path: 'circles',
        screens: {
          Hub: '',
          Explore: 'explore',
          CircleChat: 'chat/:circleId',
          CircleMembers: 'members/:circleId',
          CircleSettings: 'settings/:circleId',
          CircleAdmin: 'admin/:circleId',
          UserProfile: 'user/:userId',
          PublicAdoptedDetail: 'adopted/:recordId',
        },
      },
      Vet: {
        path: 'vet',
        screens: {
          Home: '',
          History: 'history',
          UrgentIssue: 'urgent',
          UrgentPet: 'urgent-pet/:issueId',
          UrgentDetails: 'urgent-details/:issueId/:petId',
          Matching: 'matching/:consultId',
          Assigned: 'assigned/:consultId',
          Browse: 'browse',
          VetProfile: 'vet-profile/:vetId',
          Payment: 'payment/:consultId',
          Status: 'status/:consultId',
          Chat: 'vet-chat/:consultId',
          Receipt: 'receipt/:consultId',
        },
      },
      Profile: {
        path: 'profile',
        screens: {
          Home: '',
          Notifications: 'notifications',
          Settings: 'settings',
          Posts: 'posts',
          Saved: 'saved',
          Activity: 'activity',
          Rescues: 'rescues',
          SuccessfulAdoptions: 'successful-adoptions',
          Adopted: 'adopted',
          ReviewsSafety: 'reviews',
          Privacy: 'privacy',
          BlockedUsers: 'blocked',
          RescueDetail: 'rescue/:caseId',
          AdoptionDetail: 'adoption/:showcaseId',
          AdoptedDetail: 'adopted-detail/:recordId',
          Companion: 'companion/:companionId',
        },
      },
    },
  },
};

export function AppNavigator() {
  const { colors, mode } = useTheme();
  const navigationRef = useRef<NavigationContainerRef<ParamListBase>>(null);
  useNotificationDeepLink(navigationRef);
  const { banner, clearBanner } = useInAppNotificationBanner();

  const navigateToNotifications = () => {
    const nav = navigationRef.current;
    if (!nav?.isReady()) return;
    nav.navigate('Profile', { screen: 'Notifications', initial: false });
  };

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
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
          <Tab.Screen name="Community" component={CommunityNavigator} />
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
