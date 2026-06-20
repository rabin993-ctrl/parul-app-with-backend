import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import { RescuePostUpdateForm } from '../../components/rescue/RescuePostUpdateForm';
import { useRescueFeed } from '../../context/RescueFeedContext';
import { useRescueOpenCaseBack } from '../../context/RescueOpenCaseFlowContext';
import { getRescueCaseById } from '../../data/rescueData';
import type { RescueStackParamList } from '../../navigation/RescueNavigator';
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
  const { cases, addUpdate } = useRescueFeed();
  const item = cases.find(c => c.id === caseId) ?? getRescueCaseById(caseId);

  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<PickedAsset[]>([]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<RescueStatusKey>(
    (item?.status as RescueStatusKey) ?? 'active',
  );

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

  if (!item) return null;

  const statusChanged = selectedStatus !== item.status;

  const publish = () => {
    if (!canSubmit) return;
    addUpdate(caseId, {
      text: text.trim(),
      hasPhoto: true,
      photoCount,
      newStatus: statusChanged ? selectedStatus : undefined,
    });
    setToast({ msg: `Update posted for ${item.name}`, icon: 'paw', tone: 'success' });
    setTimeout(() => navigation.goBack(), 480);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Post update" onBack={handleBack} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 96 + insets.bottom }]}
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
      </ScrollView>

      <View style={[
        styles.footer,
        {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}>
        {publishHint ? (
          <Text style={[styles.footerHint, { color: colors.textTertiary }]} numberOfLines={2}>
            {publishHint}
          </Text>
        ) : (
          <View style={styles.footerHintSpacer} />
        )}
        <Button disabled={!canSubmit} onPress={publish}>
          Share update
        </Button>
      </View>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 8 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  footerHintSpacer: { flex: 1 },
});
