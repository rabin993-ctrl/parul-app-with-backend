import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import { AdoptedCareProfile } from '../../components/profile/AdoptedCareProfile';
import { useAdoption } from '../../context/AdoptionContext';
import { getUserHandle } from '../../data/adoptionRecords';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type AdoptedDetailParams = {
  recordId: string;
  openOwnerPost?: boolean;
};

export function AdoptedDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute();
  const { recordId } = route.params as AdoptedDetailParams;
  const tabBarPad = useTabBarScrollPadding();
  const { me } = useCurrentUserProfile();
  const {
    records,
    submitAdopterUpdate,
    submitPosterEndorsement,
    submitAdopterResponse,
  } = useAdoption();
  const record = records.find(r => r.id === recordId);

  const [toast, setToast] = useState<ToastData | null>(null);

  const viewerId = me.id;

  if (!record) return null;

  const isAdopter = record.adopterId === viewerId;
  const isPoster = record.posterId === viewerId;

  const title = isPoster
    ? record.petName
    : isAdopter
      ? record.petName
      : `${record.petName}'s adoption`;

  const handleSubmitRecommendation = (
    recommendation: 'recommended' | 'not_recommended',
    text?: string,
  ) => {
    submitPosterEndorsement(record.id, recommendation, text);
    setToast({
      msg: recommendation === 'recommended'
        ? `Recommended @${getUserHandle(record.adopterId)}`
        : `Not recommended @${getUserHandle(record.adopterId)}`,
      icon: recommendation === 'recommended' ? 'heart' : 'alert',
      tone: recommendation === 'recommended' ? 'success' : 'danger',
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title={title} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
      >
        <AdoptedCareProfile
          record={record}
          viewerId={viewerId}
          onSubmitUpdate={isAdopter ? payload => {
            submitAdopterUpdate(record.id, payload);
            setToast({ msg: `Update posted for ${record.petName}`, icon: 'check', tone: 'success' });
          } : undefined}
          onSubmitRecommendation={isPoster ? handleSubmitRecommendation : undefined}
          onSubmitAdopterResponse={isAdopter ? text => {
            submitAdopterResponse(record.id, text);
            setToast({ msg: 'Response posted', icon: 'check', tone: 'success' });
          } : undefined}
        />
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
});
