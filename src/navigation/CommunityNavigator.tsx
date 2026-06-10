import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { CommunityFeedProvider } from '../context/CommunityFeedContext';
import { CommunityFeedScreen } from '../screens/community/CommunityFeedScreen';
import { CommunityPostDetailScreen } from '../screens/community/CommunityPostDetailScreen';
import { CommunityCreatePostScreen } from '../screens/community/CommunityCreatePostScreen';
import { CommunitySearchScreen } from '../screens/community/CommunitySearchScreen';
import { CommunityRulesScreen } from '../screens/community/CommunityRulesScreen';
import { CommunityHubScreen } from '../screens/community/CommunityHubScreen';
import type { CommunityCategory } from '../data/communityPosts';

export type CommunityStackParamList = {
  Feed: undefined;
  PostDetail: { postId: string };
  CreatePost: { category: CommunityCategory };
  Search: { category?: CommunityCategory | 'all' };
  Rules: undefined;
  Hub: undefined;
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
    <CommunityFeedProvider>
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
        <Stack.Screen name="Hub" component={CommunityHubScreen} />
      </Stack.Navigator>
    </CommunityFeedProvider>
  );
}
