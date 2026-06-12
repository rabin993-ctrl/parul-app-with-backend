import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { ProfileHomeScreen } from '../screens/profile/ProfileHomeScreen';
import { RescuesScreen } from '../screens/profile/RescuesScreen';
import { SuccessfulAdoptionsScreen } from '../screens/profile/SuccessfulAdoptionsScreen';
import { AdoptedAnimalsScreen } from '../screens/profile/AdoptedAnimalsScreen';
import { AdoptedDetailScreen } from '../screens/profile/AdoptedDetailScreen';
import { ReviewsSafetyScreen } from '../screens/profile/ReviewsSafetyScreen';
import { RescueCaseDetailScreen } from '../screens/profile/RescueCaseDetailScreen';
import { AdoptionShowcaseDetailScreen } from '../screens/profile/AdoptionShowcaseDetailScreen';
import { MyCompanionScreen } from '../screens/profile/MyCompanionScreen';
import { ProfilePostsScreen } from '../screens/profile/ProfilePostsScreen';
import { ProfileActivityScreen } from '../screens/profile/ProfileActivityScreen';
import { ProfileSettingsScreen } from '../screens/profile/ProfileSettingsScreen';
import { ProfileSavedScreen } from '../screens/profile/ProfileSavedScreen';
import { ProfilePrivacyScreen } from '../screens/profile/ProfilePrivacyScreen';
import { ProfileBlockedUsersScreen } from '../screens/profile/ProfileBlockedUsersScreen';

export type ProfileStackParamList = {
  Home: undefined;
  Settings: undefined;
  Rescues: undefined;
  SuccessfulAdoptions: undefined;
  Adopted: undefined;
  ReviewsSafety: undefined;
  Posts: undefined;
  Saved: undefined;
  Activity: undefined;
  Privacy: undefined;
  BlockedUsers: undefined;
  RescueDetail: { caseId: string };
  AdoptionDetail: { showcaseId: string };
  AdoptedDetail: { recordId: string; openOwnerPost?: boolean };
  Companion: { companionId: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg, flex: 1 },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={ProfileHomeScreen} />
      <Stack.Screen name="Settings" component={ProfileSettingsScreen} />
      <Stack.Screen name="Rescues" component={RescuesScreen} />
      <Stack.Screen name="SuccessfulAdoptions" component={SuccessfulAdoptionsScreen} />
      <Stack.Screen name="Adopted" component={AdoptedAnimalsScreen} />
      <Stack.Screen name="ReviewsSafety" component={ReviewsSafetyScreen} />
      <Stack.Screen name="Posts" component={ProfilePostsScreen} />
      <Stack.Screen name="Saved" component={ProfileSavedScreen} />
      <Stack.Screen name="Activity" component={ProfileActivityScreen} />
      <Stack.Screen name="Privacy" component={ProfilePrivacyScreen} />
      <Stack.Screen name="BlockedUsers" component={ProfileBlockedUsersScreen} />
      <Stack.Screen name="RescueDetail" component={RescueCaseDetailScreen} />
      <Stack.Screen name="AdoptionDetail" component={AdoptionShowcaseDetailScreen} />
      <Stack.Screen name="AdoptedDetail" component={AdoptedDetailScreen} />
      <Stack.Screen name="Companion" component={MyCompanionScreen} />
    </Stack.Navigator>
  );
}
