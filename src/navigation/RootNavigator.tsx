import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import { GlassTabBar } from './GlassTabBar';
import { FeedNavigator } from './FeedNavigator';
import { CommunityNavigator } from './CommunityNavigator';
import { CirclesNavigator } from './CirclesNavigator';
import { VetNavigator } from './VetNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { RootRescueCaseNavigator, type RootRescueCaseFlowParams } from './RootRescueCaseNavigator';
import { TAB_BAR_BASE_STYLE } from './tabBarVisibility';

export type RootStackParamList = {
  MainTabs: undefined;
  Notifications: undefined;
  RescueCaseFlow: RootRescueCaseFlowParams;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      tabBar={props => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: Platform.OS !== 'web',
        sceneStyle: { backgroundColor: colors.bg, flex: 1 },
        tabBarShowLabel: false,
        tabBarStyle: TAB_BAR_BASE_STYLE,
      }}
    >
      <Tab.Screen name="Feed" component={FeedNavigator} />
      <Tab.Screen name="Community" component={CommunityNavigator} />
      <Tab.Screen name="Circles" component={CirclesNavigator} />
      <Tab.Screen name="Vet" component={VetNavigator} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { colors } = useTheme();

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: colors.bg, flex: 1 },
        }}
      />
      <RootStack.Screen
        name="RescueCaseFlow"
        component={RootRescueCaseNavigator}
        options={{
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.bg, flex: 1 },
        }}
      />
    </RootStack.Navigator>
  );
}
