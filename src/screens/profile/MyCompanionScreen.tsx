import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompanionFullProfile } from '../../components/CompanionProfile';
import { Toast, ToastData } from '../../components/ui/Toast';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';

type Route = RouteProp<ProfileStackParamList, 'Companion'>;
type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Companion'>;

export function MyCompanionScreen() {
  const navigation = useNavigation<Nav>();
  const { companionId } = useRoute<Route>().params;
  const [activeId, setActiveId] = useState(companionId);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    setActiveId(companionId);
  }, [companionId]);

  const handleSwitchCompanion = useCallback((id: string) => {
    setActiveId(id);
    navigation.setParams({ companionId: id });
  }, [navigation]);

  return (
    <>
      <CompanionFullProfile
        companionId={activeId}
        visible
        onClose={() => navigation.goBack()}
        onSwitchCompanion={handleSwitchCompanion}
        onToast={setToast}
      />
      <Toast data={toast} onHide={() => setToast(null)} />
    </>
  );
}
