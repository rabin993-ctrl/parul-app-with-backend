import React from 'react';
import { Modal } from 'react-native';
import {
  NavigationContainer,
  NavigationIndependentTree,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdoptionDetailScreen } from '../../screens/adoption/AdoptionDetailScreen';
import { AdoptionEditPostScreen } from '../../screens/adoption/AdoptionEditPostScreen';
import type { AdoptionStackParamList } from '../../navigation/AdoptionNavigator';

const Stack = createNativeStackNavigator<AdoptionStackParamList>();

type Props = {
  listingId: string | null;
  editMode?: boolean;
  visible: boolean;
  onClose: () => void;
};

export function AdoptionListingDetailModal({
  listingId,
  editMode = false,
  visible,
  onClose,
}: Props) {
  if (!listingId) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <NavigationIndependentTree>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {editMode ? (
              <Stack.Screen name="EditPost" initialParams={{ listingId }}>
                {() => <AdoptionEditPostScreen onCloseOverride={onClose} />}
              </Stack.Screen>
            ) : (
              <Stack.Screen name="Detail" initialParams={{ listingId }}>
                {() => <AdoptionDetailScreen onCloseOverride={onClose} />}
              </Stack.Screen>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </NavigationIndependentTree>
    </Modal>
  );
}
