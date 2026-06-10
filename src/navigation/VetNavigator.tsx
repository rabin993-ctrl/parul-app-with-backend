import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { VetConsultProvider } from '../context/VetConsultContext';
import { VetHomeScreen } from '../screens/vet/VetHomeScreen';
import { VetUrgentIssueScreen } from '../screens/vet/VetUrgentIssueScreen';
import { VetUrgentPetScreen } from '../screens/vet/VetUrgentPetScreen';
import { VetUrgentDetailsScreen } from '../screens/vet/VetUrgentDetailsScreen';
import { VetMatchingScreen } from '../screens/vet/VetMatchingScreen';
import { VetAssignedScreen } from '../screens/vet/VetAssignedScreen';
import { VetBrowseScreen } from '../screens/vet/VetBrowseScreen';
import { VetProfileScreen } from '../screens/vet/VetProfileScreen';
import { VetPaymentScreen } from '../screens/vet/VetPaymentScreen';
import { VetStatusScreen } from '../screens/vet/VetStatusScreen';
import { VetChatScreen } from '../screens/vet/VetChatScreen';
import { VetHistoryScreen } from '../screens/vet/VetHistoryScreen';
import { VetReceiptScreen } from '../screens/vet/VetReceiptScreen';

export type VetStackParamList = {
  Home: undefined;
  History: undefined;
  UrgentIssue: undefined;
  UrgentPet: { issueId: string };
  UrgentDetails: { issueId: string; petId: string };
  Matching: { consultId: string };
  Assigned: { consultId: string };
  Browse: undefined;
  VetProfile: { vetId: string };
  Payment: { consultId: string };
  Status: { consultId: string };
  Chat: { consultId: string };
  Receipt: { consultId: string };
};

const Stack = createNativeStackNavigator<VetStackParamList>();

export function VetNavigator() {
  const { colors } = useTheme();

  return (
    <VetConsultProvider>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg, flex: 1 },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={VetHomeScreen} />
        <Stack.Screen name="History" component={VetHistoryScreen} />
        <Stack.Screen name="UrgentIssue" component={VetUrgentIssueScreen} />
        <Stack.Screen name="UrgentPet" component={VetUrgentPetScreen} />
        <Stack.Screen name="UrgentDetails" component={VetUrgentDetailsScreen} />
        <Stack.Screen name="Matching" component={VetMatchingScreen} />
        <Stack.Screen name="Assigned" component={VetAssignedScreen} />
        <Stack.Screen name="Browse" component={VetBrowseScreen} />
        <Stack.Screen name="VetProfile" component={VetProfileScreen} />
        <Stack.Screen name="Payment" component={VetPaymentScreen} />
        <Stack.Screen name="Status" component={VetStatusScreen} />
        <Stack.Screen name="Chat" component={VetChatScreen} />
        <Stack.Screen name="Receipt" component={VetReceiptScreen} />
      </Stack.Navigator>
    </VetConsultProvider>
  );
}
