import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { profileOwnerScreenBg } from '../theme/profileCanvasTheme';
import { ProfileHomeScreen } from '../screens/profile/ProfileHomeScreen';
import { RescuesScreen } from '../screens/profile/RescuesScreen';
import { SuccessfulAdoptionsScreen } from '../screens/profile/SuccessfulAdoptionsScreen';
import { AdoptedAnimalsScreen } from '../screens/profile/AdoptedAnimalsScreen';
import { AdoptedDetailScreen } from '../screens/profile/AdoptedDetailScreen';
import { ReviewsSafetyScreen } from '../screens/profile/ReviewsSafetyScreen';
import { RescueCaseDetailScreen } from '../screens/profile/RescueCaseDetailScreen';
import { RescuePostUpdateScreen } from '../screens/rescue/RescuePostUpdateScreen';
import { RescueFeedProvider } from '../context/RescueFeedContext';
import { AdoptionShowcaseDetailScreen } from '../screens/profile/AdoptionShowcaseDetailScreen';
import { MyCompanionScreen } from '../screens/profile/MyCompanionScreen';
import { CompanionPostDetailScreen } from '../screens/profile/CompanionPostDetailScreen';
import { CompanionEditScreen } from '../screens/profile/CompanionEditScreen';
import { ProfilePostsScreen } from '../screens/profile/ProfilePostsScreen';
import { ProfileActivityScreen } from '../screens/profile/ProfileActivityScreen';
import { FeedPostDetailScreen } from '../screens/profile/FeedPostDetailScreen';
import { ProfileFollowingScreen } from '../screens/profile/ProfileFollowingScreen';
import { ProfileSettingsScreen } from '../screens/profile/ProfileSettingsScreen';
import { ProfileSavedScreen } from '../screens/profile/ProfileSavedScreen';
import { ProfilePrivacyScreen } from '../screens/profile/ProfilePrivacyScreen';
import { ProfileBlockedUsersScreen } from '../screens/profile/ProfileBlockedUsersScreen';
import { PrivacyPolicyScreen } from '../screens/legal/PrivacyPolicyScreen';
import { TermsOfServiceScreen } from '../screens/legal/TermsOfServiceScreen';
import type { FeedPostDetailParams } from './feedHubNavigation';

export type ProfileStackParamList = {
  Home: undefined;
  Settings: undefined;
  Rescues: undefined;
  Following: undefined;
  SuccessfulAdoptions: undefined;
  Adopted: undefined;
  ReviewsSafety: undefined;
  Posts: undefined;
  Saved: undefined;
  Activity: undefined;
  FeedPostDetail: FeedPostDetailParams & { returnTo?: keyof ProfileStackParamList };
  Privacy: undefined;
  BlockedUsers: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  RescueDetail: { caseId: string; openHelpOffers?: boolean };
  PostUpdate: { caseId: string };
  AdoptionDetail: { showcaseId: string };
  AdoptedDetail: { recordId: string; openOwnerPost?: boolean };
  Companion: { companionId: string };
  CompanionPostDetail: { postId: string; companionId: string };
  CompanionEdit: { companionId: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

function ProfileRescuePostUpdateScreen() {
  return (
    <RescueFeedProvider>
      <RescuePostUpdateScreen />
    </RescueFeedProvider>
  );
}

export function ProfileNavigator() {
  const { colors, isDark } = useTheme();
  const screenBg = profileOwnerScreenBg(isDark, colors);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: screenBg, flex: 1 },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={ProfileHomeScreen} />
      <Stack.Screen name="Settings" component={ProfileSettingsScreen} />
      <Stack.Screen name="Rescues" component={RescuesScreen} />
      <Stack.Screen name="Following" component={ProfileFollowingScreen} />
      <Stack.Screen name="SuccessfulAdoptions" component={SuccessfulAdoptionsScreen} />
      <Stack.Screen name="Adopted" component={AdoptedAnimalsScreen} />
      <Stack.Screen name="ReviewsSafety" component={ReviewsSafetyScreen} />
      <Stack.Screen name="Posts" component={ProfilePostsScreen} />
      <Stack.Screen name="Saved" component={ProfileSavedScreen} />
      <Stack.Screen name="Activity" component={ProfileActivityScreen} />
      <Stack.Screen name="FeedPostDetail" component={FeedPostDetailScreen} />
      <Stack.Screen name="Privacy" component={ProfilePrivacyScreen} />
      <Stack.Screen name="BlockedUsers" component={ProfileBlockedUsersScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
      <Stack.Screen name="RescueDetail" component={RescueCaseDetailScreen} />
      <Stack.Screen name="PostUpdate" component={ProfileRescuePostUpdateScreen} />
      <Stack.Screen name="AdoptionDetail" component={AdoptionShowcaseDetailScreen} />
      <Stack.Screen name="AdoptedDetail" component={AdoptedDetailScreen} />
      <Stack.Screen name="Companion" component={MyCompanionScreen} />
      <Stack.Screen name="CompanionPostDetail" component={CompanionPostDetailScreen} />
      <Stack.Screen name="CompanionEdit" component={CompanionEditScreen} />
    </Stack.Navigator>
  );
}
