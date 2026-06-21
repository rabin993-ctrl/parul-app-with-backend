import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Toast, ToastData } from '../../components/ui/Toast';
import { AppCenteredHeader } from '../../components/ui/AppSubHeader';
import { RescuePostUpdateForm } from '../../components/rescue/RescuePostUpdateForm';
import { useRescueFeedOptional } from '../../context/RescueFeedContext';
import { useRescueOpenCaseBack } from '../../context/RescueOpenCaseFlowContext';
import { getRescueCaseById } from '../../data/rescueData';
import type { RescueCase } from '../../data/profileData';
import type { RescueStackParamList } from '../../navigation/RescueNavigator';
import { fetchRescueCaseById } from '../../utils/rescueCases';
import { isRescueCaseIdUuid } from '../../utils/rescueHelpOffers';
import type { PickedAsset } from '../../hooks/useMediaPicker';

type Nav = NativeStackNavigationProp<RescueStackParamList, 'PostUpdate'>;

const STATUS_ORDER = ['active', 'under_treatment', 'recovered'] as const;
type RescueStatusKey = typeof STATUS_ORDER[number];

export function RescuePostUpdateScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const handleBack = useRescueOpenCaseBack(navigation);
  const route = useRoute();
  const { caseId } = route.params as { caseId: string };
  const rescueFeed = useRescueFeedOptional();
  const feedItem = rescueFeed?.cases.find(c => c.id === caseId) ?? getRescueCaseById(caseId);
  const [fetchedItem, setFetchedItem] = useState<RescueCase | null>(null);
  const [loading, setLoading] = useState(false);
  const item = feedItem ?? fetchedItem;

  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<PickedAsset[]>([]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<RescueStatusKey>(
    (item?.status as RescueStatusKey) ?? 'active',
  );

  useEffect(() => {
    if (feedItem || !caseId) return;
    if (!isRescueCaseIdUuid(caseId)) return;
    let cancelled = false;
    setLoading(true);
    void fetchRescueCaseById(caseId).then(fetched => {
      if (cancelled) return;
      setFetchedItem(fetched);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [caseId, feedItem]);

  useEffect(() => {
    if (item?.status) {
      setSelectedStatus(item.status as RescueStatusKey);
    }
  }, [item?.status]);

  const photoCount = photos.length;
  const hasUpdateText = text.trim().length > 0;
  const canSubmit = photoCount > 0 && hasUpdateText;

  const publishHint = useMemo(() => {
    if (canSubmit) return null;
    const parts: string[] = [];
    if (!hasUpdateText) parts.push('an update');
    if (photoCount === 0) parts.push('at least one photo');
    return `Add ${parts.join(' and ')} to share.`;
  }, [canSubmit, hasUpdateText, photoCount]);

  if (loading && !item) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered, { backgroundColor: colors.bg }]} edges={['top']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!item) return null;

  const statusChanged = selectedStatus !== item.status;

  const publish = () => {
    if (!canSubmit || !rescueFeed) return;
    rescueFeed.addUpdate(caseId, {
      text: text.trim(),
      photoCount,
      photos,
      newStatus: statusChanged ? selectedStatus : undefined,
    });
    setToast({ msg: `Update posted for ${item.name}`, icon: 'paw', tone: 'success' });
    setTimeout(() => navigation.goBack(), 480);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <AppCenteredHeader
        title="Post update"
        onBack={handleBack}
        backAccessibilityLabel="Back from Post update"
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <RescuePostUpdateForm
          item={item}
          text={text}
          onTextChange={setText}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          photos={photos}
          onPhotosChange={setPhotos}
          showPhotoRequiredHint={false}
        />

        <View style={styles.actions}>
          {publishHint ? (
            <Text style={[styles.actionsHint, { color: colors.textTertiary }]} numberOfLines={2}>
              {publishHint}
            </Text>
          ) : (
            <View style={styles.actionsHintSpacer} />
          )}
          <Button disabled={!canSubmit || !rescueFeed} onPress={publish}>
            Share update
          </Button>
        </View>
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 28,
  },
  actionsHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  actionsHintSpacer: { flex: 1 },
});
