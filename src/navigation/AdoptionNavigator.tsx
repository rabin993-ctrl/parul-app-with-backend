import React, { useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { AdoptionListingScreen } from '../screens/adoption/AdoptionListingScreen';
import { AdoptionDetailScreen } from '../screens/adoption/AdoptionDetailScreen';
import { AdoptionConfirmationScreen } from '../screens/adoption/AdoptionConfirmationScreen';
import { AdoptionSearchScreen } from '../screens/adoption/AdoptionSearchScreen';
import { AdoptionCreatePostScreen } from '../screens/adoption/AdoptionCreatePostScreen';
import { AdoptionEditPostScreen } from '../screens/adoption/AdoptionEditPostScreen';
import { AdoptionManagePostScreen } from '../screens/adoption/AdoptionManagePostScreen';
import { AdoptedDetailScreen } from '../screens/profile/AdoptedDetailScreen';
import type { AdoptionFilters } from '../data/adoptionData';
import type { AdoptionBrowseFilter, AdoptionHubTab } from '../components/adoption/AdoptionChrome';

import type { AdoptionListingReturnTo } from '../navigation/adoptionListingRouting';

export type AdoptionStackParamList = {
  Listing: undefined;
  Detail: { listingId: string; returnTo?: AdoptionListingReturnTo };
  Confirmation: { listingId: string; requestId: string };
  Search: { species?: AdoptionFilters['species'] };
  CreatePost: undefined;
  EditPost: { listingId: string };
  ManagePost: { listingId: string };
  AdoptedDetail: { recordId: string; openOwnerPost?: boolean };
};

const Stack = createNativeStackNavigator<AdoptionStackParamList>();

function AdoptionStackRouteReporter({
  onRouteChange,
}: {
  onRouteChange?: (route: keyof AdoptionStackParamList) => void;
}) {
  const routeName = useNavigationState(state => {
    const route = state?.routes[state.index ?? 0];
    return (route?.name ?? 'Listing') as keyof AdoptionStackParamList;
  });

  useEffect(() => {
    onRouteChange?.(routeName);
  }, [routeName, onRouteChange]);

  return null;
}

export function AdoptionNavigator({
  embedded = false,
  scrollHeader,
  hubTab,
  onHubTabChange,
  hubBarPinned = false,
  browseFilter,
  onBrowseFilterChange,
  onFocusedRouteChange,
}: {
  embedded?: boolean;
  scrollHeader?: React.ReactNode;
  hubTab?: AdoptionHubTab;
  onHubTabChange?: (tab: AdoptionHubTab) => void;
  hubBarPinned?: boolean;
  browseFilter?: AdoptionBrowseFilter;
  onBrowseFilterChange?: (filter: AdoptionBrowseFilter) => void;
  onFocusedRouteChange?: (route: keyof AdoptionStackParamList) => void;
}) {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg, flex: 1 },
          animation: 'slide_from_right',
        }}
        screenLayout={({ children }) => (
          <>
            <AdoptionStackRouteReporter onRouteChange={onFocusedRouteChange} />
            {children}
          </>
        )}
      >
        <Stack.Screen name="Listing">
          {() => (
            <AdoptionListingScreen
              embedded={embedded}
              scrollHeader={scrollHeader}
              hubTab={hubTab}
              onHubTabChange={onHubTabChange}
              hubBarPinned={hubBarPinned}
              browseFilter={browseFilter}
              onBrowseFilterChange={onBrowseFilterChange}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Detail" component={AdoptionDetailScreen} />
        <Stack.Screen name="Confirmation" component={AdoptionConfirmationScreen} />
        <Stack.Screen name="Search" component={AdoptionSearchScreen} />
        <Stack.Screen name="CreatePost" component={AdoptionCreatePostScreen} />
        <Stack.Screen name="EditPost" component={AdoptionEditPostScreen} />
        <Stack.Screen name="ManagePost" component={AdoptionManagePostScreen} />
        <Stack.Screen name="AdoptedDetail" component={AdoptedDetailScreen} />
      </Stack.Navigator>
  );
}
