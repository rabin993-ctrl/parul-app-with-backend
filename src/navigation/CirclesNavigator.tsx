import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { CirclesScreen } from '../screens/CirclesScreen';
import { ExploreCirclesScreen } from '../screens/ExploreCirclesScreen';
import { CircleChatScreen } from '../screens/pawCircles/CircleChatScreen';
import { CircleMembersScreen } from '../screens/pawCircles/CircleMembersScreen';
import { CircleSettingsScreen } from '../screens/pawCircles/CircleSettingsScreen';
import { CircleAdminScreen } from '../screens/pawCircles/CircleAdminScreen';
import { UserProfileScreen } from '../screens/pawCircles/UserProfileScreen';
import { ChatThreadRouteScreen } from '../screens/pawCircles/ChatThreadRouteScreen';
import type { ChatThreadRouteParams } from './chatThreadRouting';
import { AdoptedDetailScreen } from '../screens/profile/AdoptedDetailScreen';
import { ProfileFollowingScreen } from '../screens/profile/ProfileFollowingScreen';
import { FeedPostDetailScreen } from '../screens/profile/FeedPostDetailScreen';
import type { PawCircleHubParams } from './pawCircleInboxRouting';
import type { FeedPostDetailParams } from './feedHubNavigation';

export type CirclesStackParamList = {
  Hub: PawCircleHubParams | undefined;
  Explore: undefined;
  CircleChat: { circleId: string; returnTo?: 'Feed' | 'Hub' };
  CircleMembers: { circleId: string };
  CircleSettings: { circleId: string };
  CircleAdmin: { circleId: string };
  UserProfile: { userId: string; returnTo?: 'Feed' | 'Hub' | 'Messages' | 'Profile' };
  UserFollowing: { userId: string };
  PublicAdoptedDetail: { recordId: string };
  FeedPostDetail: FeedPostDetailParams;
  ChatThread: ChatThreadRouteParams;
};

const Stack = createNativeStackNavigator<CirclesStackParamList>();

export function CirclesNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg, flex: 1 },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Hub" component={CirclesScreen} />
      <Stack.Screen name="Explore" component={ExploreCirclesScreen} />
      <Stack.Screen name="CircleChat" component={CircleChatScreen} />
      <Stack.Screen name="CircleMembers" component={CircleMembersScreen} />
      <Stack.Screen name="CircleSettings" component={CircleSettingsScreen} />
      <Stack.Screen name="CircleAdmin" component={CircleAdminScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="UserFollowing" component={ProfileFollowingScreen} />
      <Stack.Screen name="PublicAdoptedDetail" component={AdoptedDetailScreen} />
      <Stack.Screen name="FeedPostDetail" component={FeedPostDetailScreen} />
      <Stack.Screen name="ChatThread" component={ChatThreadRouteScreen} />
    </Stack.Navigator>
  );
}
