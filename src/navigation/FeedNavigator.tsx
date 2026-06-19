import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { FeedScreen } from '../screens/FeedScreen';
import { FeedSearchScreen } from '../screens/FeedSearchScreen';
import { FeedPostDetailScreen } from '../screens/profile/FeedPostDetailScreen';
import { AdoptionHubScreen } from '../screens/AdoptionHubScreen';
import { RescueHubScreen } from '../screens/RescueHubScreen';
import type { FeedStackParamList } from './feedHubNavigation';

const Stack = createNativeStackNavigator<FeedStackParamList>();

export function FeedNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg, flex: 1 },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="FeedHome" component={FeedScreen} />
      <Stack.Screen name="Search" component={FeedSearchScreen} />
      <Stack.Screen name="FeedPostDetail" component={FeedPostDetailScreen} />
      <Stack.Screen name="AdoptionHub" component={AdoptionHubScreen} />
      <Stack.Screen name="RescueHub" component={RescueHubScreen} />
    </Stack.Navigator>
  );
}

export type { FeedStackParamList };
