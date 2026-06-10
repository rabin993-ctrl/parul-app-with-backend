import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { AdoptionFeedProvider } from '../context/AdoptionFeedContext';
import { AdoptionListingScreen } from '../screens/adoption/AdoptionListingScreen';
import { AdoptionDetailScreen } from '../screens/adoption/AdoptionDetailScreen';
import { AdoptionApplyScreen } from '../screens/adoption/AdoptionApplyScreen';
import { AdoptionConfirmationScreen } from '../screens/adoption/AdoptionConfirmationScreen';
import { AdoptionSearchScreen } from '../screens/adoption/AdoptionSearchScreen';
import { AdoptionCreatePostScreen } from '../screens/adoption/AdoptionCreatePostScreen';
import { AdoptionEditPostScreen } from '../screens/adoption/AdoptionEditPostScreen';
import { AdoptionManagePostScreen } from '../screens/adoption/AdoptionManagePostScreen';
import type { AdoptionFilters } from '../data/adoptionData';

export type AdoptionStackParamList = {
  Listing: undefined;
  Detail: { listingId: string };
  Apply: { listingId: string };
  Confirmation: { listingId: string; requestId: string };
  Search: { species?: AdoptionFilters['species'] };
  CreatePost: undefined;
  EditPost: { listingId: string };
  ManagePost: { listingId: string };
};

const Stack = createNativeStackNavigator<AdoptionStackParamList>();

export function AdoptionNavigator({
  embedded = false,
  scrollHeader,
}: {
  embedded?: boolean;
  scrollHeader?: React.ReactNode;
}) {
  const { colors } = useTheme();

  return (
    <AdoptionFeedProvider>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg, flex: 1 },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Listing">
          {() => (
            <AdoptionListingScreen embedded={embedded} scrollHeader={scrollHeader} />
          )}
        </Stack.Screen>
        <Stack.Screen name="Detail" component={AdoptionDetailScreen} />
        <Stack.Screen name="Apply" component={AdoptionApplyScreen} />
        <Stack.Screen name="Confirmation" component={AdoptionConfirmationScreen} />
        <Stack.Screen name="Search" component={AdoptionSearchScreen} />
        <Stack.Screen name="CreatePost" component={AdoptionCreatePostScreen} />
        <Stack.Screen name="EditPost" component={AdoptionEditPostScreen} />
        <Stack.Screen name="ManagePost" component={AdoptionManagePostScreen} />
      </Stack.Navigator>
    </AdoptionFeedProvider>
  );
}
