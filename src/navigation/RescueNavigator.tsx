import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { RescueFeedProvider } from '../context/RescueFeedContext';
import { RescueListingScreen } from '../screens/rescue/RescueListingScreen';
import { RescueSearchScreen } from '../screens/rescue/RescueSearchScreen';
import { RescueCreateCaseScreen } from '../screens/rescue/RescueCreateCaseScreen';
import { RescuePostUpdateScreen } from '../screens/rescue/RescuePostUpdateScreen';
import { RescueCaseDetailScreen } from '../screens/profile/RescueCaseDetailScreen';
import type { RescueFilters, RescueHubTab } from '../data/rescueData';

export type RescueStackParamList = {
  Listing: undefined;
  Detail: { caseId: string; openHelpOffers?: boolean };
  PostUpdate: { caseId: string };
  Search: { species?: RescueFilters['species'] };
  CreateCase: undefined;
};

const Stack = createNativeStackNavigator<RescueStackParamList>();

export function RescueNavigator({
  embedded = false,
  scrollHeader,
  openCreateOnMount = false,
  onOpenCreateHandled,
  hubTab,
  onHubTabChange,
  hubBarPinned = false,
  filters,
  onFiltersChange,
}: {
  embedded?: boolean;
  scrollHeader?: React.ReactNode;
  openCreateOnMount?: boolean;
  onOpenCreateHandled?: () => void;
  hubTab?: RescueHubTab;
  onHubTabChange?: (tab: RescueHubTab) => void;
  hubBarPinned?: boolean;
  filters?: RescueFilters;
  onFiltersChange?: (filters: RescueFilters) => void;
}) {
  const { colors } = useTheme();

  return (
    <RescueFeedProvider>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg, flex: 1 },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Listing">
          {() => (
            <RescueListingScreen
              embedded={embedded}
              scrollHeader={scrollHeader}
              openCreateOnMount={openCreateOnMount}
              onOpenCreateHandled={onOpenCreateHandled}
              hubTab={hubTab}
              onHubTabChange={onHubTabChange}
              hubBarPinned={hubBarPinned}
              filters={filters}
              onFiltersChange={onFiltersChange}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Detail" component={RescueCaseDetailScreen} />
        <Stack.Screen name="PostUpdate" component={RescuePostUpdateScreen} />
        <Stack.Screen name="Search" component={RescueSearchScreen} />
        <Stack.Screen name="CreateCase" component={RescueCreateCaseScreen} />
      </Stack.Navigator>
    </RescueFeedProvider>
  );
}
