import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Icon } from '../icons/Icon';
import type { AdoptionRecord, AdoptionUpdatePayload, AdoptionUpdatePrompt } from '../../data/adoptionRecords';

const SHEET_PAD = 20;
const MAX_PHOTOS = 3;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function AdoptionUpdatePromptBanner({
  prompt,
  onPostUpdate,
  onDismiss,
}: {
  prompt: AdoptionUpdatePrompt;
  onPostUpdate: () => void;
  onDismiss?: () => void;
}) {
  const { colors } = useTheme();
  const bg = prompt.overdue ? colors.warningBg : colors.infoBg;
  const accent = prompt.overdue ? colors.warning : colors.primary;

  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor: accent + '30' }]}>
      <View style={styles.bannerIcon}>
        <Icon name={prompt.overdue ? 'alert' : 'camera'} size={18} color={accent} />
      </View>
      <View style={styles.bannerBody}>
        <Text style={[styles.bannerTitle, { color: colors.text }]}>
          {prompt.overdue ? 'Update requested' : 'Upcoming check-in'} · {prompt.petName}
        </Text>
        <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
          {prompt.promptText}
          {prompt.overdue ? ` · ${prompt.overdueDays} days overdue` : ''}
        </Text>
        <Pressable onPress={onPostUpdate} style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1, marginTop: 8 }]}>
          <Text style={[styles.bannerAction, { color: accent }]}>Post home update →</Text>
        </Pressable>
      </View>
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Icon name="close" size={16} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

export function PostHomeUpdateSheet({
  visible,
  onClose,
  record,
  milestoneLabel,
  promptText,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  record: AdoptionRecord;
  milestoneLabel: string;
  promptText: string;
  onSubmit: (payload: AdoptionUpdatePayload) => void;
}) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<boolean[]>([false, false, false]);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setText('');
    setPhotos([false, false, false]);
    setHasVideo(false);
  }, [visible]);

  const photoCount = photos.filter(Boolean).length;
  const canSubmit = photoCount > 0 || hasVideo || text.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      text: text.trim() || undefined,
      photoCount: photoCount || undefined,
      hasVideo: hasVideo || undefined,
    });
    onClose();
  };

  const togglePhoto = (index: number) => {
    setPhotos(prev => prev.map((p, i) => (i === index ? !p : p)));
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Post home update"
      maxHeight={SCREEN_HEIGHT * 0.85}
      contentKey={`${record.id}-${milestoneLabel}`}
      footer={(
        <Button full onPress={handleSubmit} disabled={!canSubmit}>
          Share update
        </Button>
      )}
    >
      <View style={styles.sheetBody}>
        <Text style={[styles.sheetEyebrow, { color: colors.textTertiary }]}>
          {milestoneLabel} · {record.petName}
        </Text>
        <Text style={[styles.sheetHint, { color: colors.textSecondary }]}>{promptText}</Text>

        <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>PHOTOS · UP TO {MAX_PHOTOS}</Text>
        <View style={styles.photoRow}>
          {photos.map((filled, i) => (
            <MediaTile
              key={i}
              filled={filled}
              tint={record.tint}
              icon="image"
              label={filled ? `Photo ${i + 1}` : 'Add'}
              onPress={() => togglePhoto(i)}
              colors={colors}
              size="square"
            />
          ))}
        </View>

        <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>VIDEO · OPTIONAL</Text>
        <MediaTile
          filled={hasVideo}
          tint={record.tint}
          icon="play-square"
          label={hasVideo ? 'Video added' : 'Add a short clip'}
          onPress={() => setHasVideo(v => !v)}
          colors={colors}
          size="wide"
        />

        <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>CAPTION</Text>
        <TextInput
          style={[styles.sheetInput, { color: colors.text, backgroundColor: colors.surface2, borderColor: colors.border }]}
          placeholder="How are they settling in? Meals, mood, vet visits..."
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
        />
        <Text style={[styles.sheetNote, { color: colors.textTertiary }]}>
          Add at least one photo, video, or caption. Visible on your Adopted profile as proof of care.
        </Text>
      </View>
    </Sheet>
  );
}

function MediaTile({
  filled,
  tint,
  icon,
  label,
  onPress,
  colors,
  size,
}: {
  filled: boolean;
  tint: string;
  icon: string;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  size: 'square' | 'wide';
}) {
  const isWide = size === 'wide';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        isWide ? styles.videoTile : styles.photoTile,
        { opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {filled ? (
        <LinearGradient
          colors={[tint + '55', tint + '28']}
          style={[isWide ? styles.videoTileInner : styles.photoTileInner, { borderColor: tint + '60' }]}
        >
          <View style={[styles.filledBadge, { backgroundColor: colors.success }]}>
            <Icon name="check" size={12} color={colors.onPrimary} />
          </View>
          {isWide && (
            <View style={[styles.playCircle, { backgroundColor: colors.primary }]}>
              <Icon name="play-square" size={18} color={colors.onPrimary} />
            </View>
          )}
          <Icon name={icon} size={isWide ? 22 : 20} color={tint} />
          <Text style={[styles.tileLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.tileRemove, { color: colors.textTertiary }]}>Tap to remove</Text>
        </LinearGradient>
      ) : (
        <View style={[
          isWide ? styles.videoTileInner : styles.photoTileInner,
          { borderColor: colors.borderStrong, backgroundColor: colors.surface2 },
        ]}>
          <Icon name={icon} size={isWide ? 24 : 22} color={colors.textTertiary} />
          <Text style={[styles.tileLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function PosterPlacementSheet({
  visible,
  onClose,
  record,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  record: AdoptionRecord;
  onSubmit: (text: string) => void;
}) {
  const { colors } = useTheme();
  const [text, setText] = useState('');

  return (
    <Sheet visible={visible} onClose={onClose} title="Placement note">
      <View style={styles.sheetBody}>
        <Text style={[styles.sheetHint, { color: colors.textSecondary }]}>
          Only use if the adopter hasn&apos;t posted a recent update. This will be labeled &quot;From foster&quot; — not adopter proof.
        </Text>
        <TextInput
          style={[styles.sheetInput, { color: colors.text, backgroundColor: colors.surface2, borderColor: colors.border }]}
          placeholder={`Update on ${record.petName}'s placement...`}
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
        />
        <Button variant="soft" onPress={() => { if (text.trim()) { onSubmit(text.trim()); setText(''); onClose(); } }}>
          Add placement note
        </Button>
      </View>
    </Sheet>
  );
}

export function PosterEndorseSheet({
  visible,
  onClose,
  record,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  record: AdoptionRecord;
  onSubmit: (rating: number, text: string) => void;
}) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);

  return (
    <Sheet visible={visible} onClose={onClose} title="Endorse adopter">
      <View style={styles.sheetBody}>
        <Text style={[styles.sheetHint, { color: colors.textSecondary }]}>
          Would you adopt to them again? This boosts their trust badge.
        </Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <Pressable key={n} onPress={() => setRating(n)}>
              <Text style={{ fontSize: 28, opacity: n <= rating ? 1 : 0.25 }}>★</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.sheetInput, { color: colors.text, backgroundColor: colors.surface2, borderColor: colors.border }]}
          placeholder="Optional note..."
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
        />
        <Button onPress={() => { onSubmit(rating, text.trim() || 'Would adopt to them again.'); onClose(); }}>
          Submit endorsement
        </Button>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  bannerIcon: { paddingTop: 2 },
  bannerBody: { flex: 1, minWidth: 0 },
  bannerTitle: { ...typography.label, fontSize: 14 },
  bannerSub: { ...typography.small, marginTop: 2 },
  bannerAction: { ...typography.link, fontSize: 13 },
  sheetBody: {
    gap: 10,
    paddingHorizontal: SHEET_PAD,
    paddingTop: 4,
  },
  sheetEyebrow: { ...typography.sectionLabel, fontSize: 10 },
  sheetHint: { ...typography.small, lineHeight: 18 },
  sheetLabel: { ...typography.sectionLabel, fontSize: 10, marginTop: 4 },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoTile: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 1,
  },
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
  videoTile: {
    width: '100%',
    height: 112,
  },
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
  tileRemove: { ...typography.meta, fontSize: 9 },
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
  playCircle: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
  },
  sheetInput: {
    minHeight: 88,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: 12,
    ...typography.body,
    fontSize: 15,
  },
  sheetNote: { ...typography.meta, fontSize: 11, lineHeight: 16, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 8 },
});
