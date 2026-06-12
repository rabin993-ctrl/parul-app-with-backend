import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { AdoptionListingScreen } from '../screens/adoption/AdoptionListingScreen';
import { AdoptionDetailScreen } from '../screens/adoption/AdoptionDetailScreen';
import { AdoptionApplyScreen } from '../screens/adoption/AdoptionApplyScreen';
import { AdoptionConfirmationScreen } from '../screens/adoption/AdoptionConfirmationScreen';
import { AdoptionSearchScreen } from '../screens/adoption/AdoptionSearchScreen';
import { AdoptionCreatePostScreen } from '../screens/adoption/AdoptionCreatePostScreen';
import { AdoptionEditPostScreen } from '../screens/adoption/AdoptionEditPostScreen';
import { AdoptionManagePostScreen } from '../screens/adoption/AdoptionManagePostScreen';
import { AdoptedDetailScreen } from '../screens/profile/AdoptedDetailScreen';
import type { AdoptionFilters } from '../data/adoptionData';
import type { AdoptionHubTab } from '../components/adoption/AdoptionChrome';

export type AdoptionStackParamList = {
  Listing: undefined;
  Detail: { listingId: string };
  Apply: { listingId: string };
  Confirmation: { listingId: string; requestId: string };
  Search: { species?: AdoptionFilters['species'] };
  CreatePost: undefined;
  EditPost: { listingId: string };
  ManagePost: { listingId: string };
  AdoptedDetail: { recordId: string; openOwnerPost?: boolean };
};

const Stack = createNativeStackNavigator<AdoptionStackParamList>();

export function AdoptionNavigator({
  embedded = false,
  scrollHeader,
  hubTab,
  onHubTabChange,
  hubBarPinned = false,
  species,
  onSpeciesChange,
}: {
  embedded?: boolean;
  scrollHeader?: React.ReactNode;
  hubTab?: AdoptionHubTab;
  onHubTabChange?: (tab: AdoptionHubTab) => void;
  hubBarPinned?: boolean;
  species?: AdoptionFilters['species'];
  onSpeciesChange?: (species: AdoptionFilters['species']) => void;
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
        <Stack.Screen name="Listing">
          {() => (
            <AdoptionListingScreen
              embedded={embedded}
              scrollHeader={scrollHeader}
              hubTab={hubTab}
              onHubTabChange={onHubTabChange}
              hubBarPinned={hubBarPinned}
              species={species}
              onSpeciesChange={onSpeciesChange}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Detail" component={AdoptionDetailScreen} />
        <Stack.Screen name="Apply" component={AdoptionApplyScreen} />
        <Stack.Screen name="Confirmation" component={AdoptionConfirmationScreen} />
        <Stack.Screen name="Search" component={AdoptionSearchScreen} />
        <Stack.Screen name="CreatePost" component={AdoptionCreatePostScreen} />
        <Stack.Screen name="EditPost" component={AdoptionEditPostScreen} />
        <Stack.Screen name="ManagePost" component={AdoptionManagePostScreen} />
        <Stack.Screen name="AdoptedDetail" component={AdoptedDetailScreen} />
      </Stack.Navigator>
  );
}
