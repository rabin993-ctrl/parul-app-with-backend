import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { CommunityFeedScreen } from '../screens/community/CommunityFeedScreen';
import { CommunityPostDetailScreen } from '../screens/community/CommunityPostDetailScreen';
import { CommunityCreatePostScreen } from '../screens/community/CommunityCreatePostScreen';
import { CommunitySearchScreen } from '../screens/community/CommunitySearchScreen';
import { CommunityRulesScreen } from '../screens/community/CommunityRulesScreen';
import { CommunitySettingsScreen } from '../screens/community/CommunitySettingsScreen';
import { CommunityGroupScreen } from '../screens/community/CommunityGroupScreen';
import { CommunityAdminScreen } from '../screens/community/CommunityAdminScreen';
import { CommunityMembersScreen } from '../screens/community/CommunityMembersScreen';
import { CommunitySavedScreen } from '../screens/community/CommunitySavedScreen';
import { CommunityDiscoverScreen } from '../screens/community/CommunityDiscoverScreen';
import { CommunityCreateScreen } from '../screens/community/CommunityCreateScreen';
import { CommunityPendingRequestsScreen } from '../screens/community/CommunityPendingRequestsScreen';
import { CommunityGroupMembersScreen } from '../screens/community/CommunityGroupMembersScreen';
import type { CommunityCategory, CommunityFeedFilter } from '../data/communityPosts';

export type CommunityStackParamList = {
  Feed: undefined;
  PostDetail: { postId: string };
  CreatePost: { category: CommunityCategory };
  Search: { filter?: CommunityFeedFilter };
  Rules: undefined;
  Settings: undefined;
  Saved: undefined;
  Group: { communityId: string };
  Admin: { communityId: string };
  GroupMembers: { communityId: string };
  Members: undefined;
  PendingRequests: undefined;
  Discover: undefined;
  Create: undefined;
};

const Stack = createNativeStackNavigator<CommunityStackParamList>();

export function CommunityNavigator({
  embedded = false,
  scrollHeader,
}: {
  embedded?: boolean;
  scrollHeader?: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg, flex: 1 },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Feed">
        {() => (
          <CommunityFeedScreen embedded={embedded} scrollHeader={scrollHeader} />
        )}
      </Stack.Screen>
      <Stack.Screen name="PostDetail" component={CommunityPostDetailScreen} />
      <Stack.Screen name="CreatePost" component={CommunityCreatePostScreen} />
      <Stack.Screen name="Search" component={CommunitySearchScreen} />
      <Stack.Screen name="Rules" component={CommunityRulesScreen} />
      <Stack.Screen name="Settings" component={CommunitySettingsScreen} />
      <Stack.Screen name="Saved" component={CommunitySavedScreen} />
      <Stack.Screen name="Group" component={CommunityGroupScreen} />
      <Stack.Screen name="Admin" component={CommunityAdminScreen} />
      <Stack.Screen name="GroupMembers" component={CommunityGroupMembersScreen} />
      <Stack.Screen name="Members" component={CommunityMembersScreen} />
      <Stack.Screen name="PendingRequests" component={CommunityPendingRequestsScreen} />
      <Stack.Screen name="Discover" component={CommunityDiscoverScreen} />
      <Stack.Screen name="Create" component={CommunityCreateScreen} />
    </Stack.Navigator>
  );
}
