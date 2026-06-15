import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import { GlassTabBar } from './GlassTabBar';
import { FeedScreen } from '../screens/FeedScreen';
import { CommunityNavigator } from './CommunityNavigator';
import { CirclesNavigator } from './CirclesNavigator';
import { VetNavigator } from './VetNavigator';
import { ProfileNavigator } from './ProfileNavigator';
import { NotificationsScreen } from '../screens/NotificationsScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  Notifications: undefined;
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
    </RootStack.Navigator>
  );
}
