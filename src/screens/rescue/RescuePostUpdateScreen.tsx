import React, { useState } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MockMediaTile } from '../../components/ui/MockMediaTile';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { Toast, ToastData } from '../../components/ui/Toast';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { useRescueFeed } from '../../context/RescueFeedContext';
import { useRescueOpenCaseBack } from '../../context/RescueOpenCaseFlowContext';
import { getRescueCaseById } from '../../data/rescueData';
import { RESCUE_STATUS_META, formatRescueUpdateTime } from '../../data/profileData';
import type { RescueStackParamList } from '../../navigation/RescueNavigator';

type Nav = NativeStackNavigationProp<RescueStackParamList, 'PostUpdate'>;

const MAX_PHOTOS = 3;

export function RescuePostUpdateScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const handleBack = useRescueOpenCaseBack(navigation);
  const route = useRoute();
  const { caseId } = route.params as { caseId: string };
  const { cases, addUpdate } = useRescueFeed();
  const item = cases.find(c => c.id === caseId) ?? getRescueCaseById(caseId);

  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<boolean[]>([false, false, false]);
  const [hasVideo, setHasVideo] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  if (!item) return null;

  const statusMeta = RESCUE_STATUS_META[item.status];
  const autoDate = formatRescueUpdateTime();
  const photoCount = photos.filter(Boolean).length;
  const canSubmit = photoCount > 0;

  const publish = () => {
    if (!canSubmit) return;
    addUpdate(caseId, {
      text: text.trim() || 'Case update posted.',
      hasPhoto: true,
      photoCount,
    });
    setToast({ msg: `Update posted for ${item.name}`, icon: 'paw', tone: 'success' });
    setTimeout(() => navigation.goBack(), 480);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Post update" onBack={handleBack} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>
          {item.name} · {statusMeta.shortLabel}
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Share how {item.name} is doing — photos help followers follow the rescue.
        </Text>

        <Text style={[styles.autoDate, { color: colors.textTertiary }]}>
          {autoDate}
        </Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          PHOTOS · REQUIRED · UP TO {MAX_PHOTOS}
        </Text>
        <View style={styles.photoRow}>
          {photos.map((filled, i) => (
            <MockMediaTile
              key={i}
              imageKey={`${caseId}-update-${i}`}
              imageIndex={i}
              filled={filled}
              icon="image"
              label={filled ? `Photo ${i + 1}` : i === 0 ? 'Add photo' : 'Add'}
              onPress={() => setPhotos(prev => prev.map((p, j) => (j === i ? !p : p)))}
              size="square"
            />
          ))}
        </View>
        {!canSubmit && (
          <Text style={[styles.note, { color: colors.warning }]}>
            Add at least one photo to post this update.
          </Text>
        )}

        <Text style={[styles.label, { color: colors.textSecondary }]}>VIDEO · OPTIONAL</Text>
        <MockMediaTile
          imageKey={`${caseId}-video`}
          filled={hasVideo}
          icon="play-square"
          label={hasVideo ? 'Video added' : 'Add a short clip'}
          onPress={() => setHasVideo(v => !v)}
          size="wide"
          showPlay
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>UPDATE · OPTIONAL</Text>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface2, borderColor: colors.border }]}
          placeholder="Vet visit, appetite, mood, next steps..."
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
        />

        <Button onPress={publish} disabled={!canSubmit} style={{ marginTop: 8 }}>
          Share update
        </Button>
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 10, paddingBottom: 40 },
  eyebrow: { ...typography.sectionLabel, fontSize: 10 },
  hint: { ...typography.small, lineHeight: 18 },
  autoDate: { fontSize: 13, fontWeight: '600' },
  label: { ...typography.sectionLabel, fontSize: 10, marginTop: 4 },
  photoRow: { flexDirection: 'row', gap: 10 },
  photoTile: { flex: 1, minWidth: 0, aspectRatio: 1 },
  photoTileInner: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
  },
  videoTile: { width: '100%', height: 112 },
  videoTileInner: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
  },
  tileLabel: { ...typography.caption, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  filledBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { ...typography.meta, fontSize: 11, lineHeight: 16 },
  input: {
    minHeight: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
  },
});
