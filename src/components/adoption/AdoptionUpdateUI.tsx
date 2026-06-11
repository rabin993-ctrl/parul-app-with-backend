import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { Icon } from '../icons/Icon';
import { Avatar } from '../ui/Avatar';
import { getUserHandle } from '../../data/adoptionRecords';
import { users } from '../../data/mockData';
import type { AdoptionUpdate } from '../../data/adoptionRecords';
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
  const overdueLabel = prompt.overdueDays === 1 ? '1 day overdue' : `${prompt.overdueDays}d overdue`;

  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor: accent + '28' }]}>
      <View style={[styles.bannerIcon, { backgroundColor: accent + '16' }]}>
        <Icon name={prompt.overdue ? 'alert' : 'camera'} size={14} color={accent} />
      </View>

      <View style={styles.bannerBody}>
        <Text style={[styles.bannerTitle, { color: colors.text }]} numberOfLines={1}>
          {prompt.petName} · {prompt.milestoneLabel}
        </Text>
        {prompt.overdue ? (
          <Text style={[styles.bannerMeta, { color: accent }]}>{overdueLabel}</Text>
        ) : (
          <Text style={[styles.bannerMeta, { color: colors.textTertiary }]}>Check-in due</Text>
        )}
      </View>

      <Pressable
        onPress={onPostUpdate}
        style={({ pressed }) => [
          styles.bannerCta,
          { backgroundColor: accent, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[styles.bannerCtaText, { color: colors.onPrimary }]}>Post</Text>
      </Pressable>

      {onDismiss ? (
        <Pressable onPress={onDismiss} hitSlop={8} style={styles.bannerDismiss}>
          <Icon name="close" size={14} color={colors.textTertiary} />
        </Pressable>
      ) : null}
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
  const hasRequiredPhoto = photoCount > 0;
  const canSubmit = hasRequiredPhoto;

  const handleSubmit = () => {
    if (!hasRequiredPhoto) return;
    onSubmit({
      text: text.trim() || undefined,
      photoCount,
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

        <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>
          PHOTOS · REQUIRED · UP TO {MAX_PHOTOS}
        </Text>
        <View style={styles.photoRow}>
          {photos.map((filled, i) => (
            <MediaTile
              key={i}
              filled={filled}
              tint={record.tint}
              icon="image"
              label={filled ? `Photo ${i + 1}` : i === 0 ? 'Add photo' : 'Add'}
              onPress={() => togglePhoto(i)}
              colors={colors}
              size="square"
            />
          ))}
        </View>
        {!hasRequiredPhoto ? (
          <Text style={[styles.sheetNote, { color: colors.warning, marginBottom: 0 }]}>
            Add at least one photo to post this check-in.
          </Text>
        ) : null}

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

        <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>CAPTION · OPTIONAL</Text>
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
          Photo required · video optional. Shown on your update timeline as proof of care.
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

type OwnerPostMode = 'note' | 'recommend';

export function PreviousOwnerPostSheet({
  visible,
  onClose,
  record,
  canRecommend,
  initialMode = 'note',
  onSubmitNote,
  onSubmitRecommend,
}: {
  visible: boolean;
  onClose: () => void;
  record: AdoptionRecord;
  canRecommend: boolean;
  initialMode?: OwnerPostMode;
  onSubmitNote: (text: string) => void;
  onSubmitRecommend: (rating: number, text: string) => void;
}) {
  const { colors } = useTheme();
  const [mode, setMode] = useState<OwnerPostMode>(initialMode);
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const adopter = users[record.adopterId as keyof typeof users];

  useEffect(() => {
    if (!visible) return;
    setMode(canRecommend ? initialMode : 'note');
    setText('');
    setRating(5);
  }, [visible, initialMode, canRecommend]);

  const handleSubmit = () => {
    if (mode === 'note') {
      if (!text.trim()) return;
      onSubmitNote(text.trim());
      onClose();
      return;
    }
    if (!canRecommend) return;
    onSubmitRecommend(rating, text.trim() || 'Would give them another pet.');
    onClose();
  };

  const canSubmit = mode === 'note' ? Boolean(text.trim()) : canRecommend;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Post as previous owner"
      contentKey={`owner-post-${record.id}-${mode}`}
      footer={(
        <Button full onPress={handleSubmit} disabled={!canSubmit}>
          {mode === 'note' ? 'Post note' : 'Post recommendation'}
        </Button>
      )}
    >
      <View style={styles.sheetBody}>
        <View style={[styles.ownerPostTarget, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          {adopter ? <Avatar user={adopter} size={36} /> : null}
          <View style={styles.ownerPostTargetCopy}>
            <Text style={[styles.ownerPostTargetTitle, { color: colors.text }]}>
              {record.petName} → @{getUserHandle(record.adopterId)}
            </Text>
            <Text style={[styles.ownerPostTargetSub, { color: colors.textTertiary }]}>
              Visible on their adoption story
            </Text>
          </View>
        </View>

        <Segmented
          value={mode}
          onChange={id => setMode(id as OwnerPostMode)}
          items={[
            { id: 'note', label: 'Note', icon: 'comment' },
            { id: 'recommend', label: 'Recommend', icon: 'heart' },
          ]}
        />

        {mode === 'note' ? (
          <>
            <Text style={[styles.sheetHint, { color: colors.textSecondary }]}>
              Share a follow-up — how they&apos;re doing, a thank-you, or a check-in for the adopter.
            </Text>
            <TextInput
              style={[styles.sheetInput, { color: colors.text, backgroundColor: colors.surface2, borderColor: colors.border }]}
              placeholder={`Note about ${record.petName}...`}
              placeholderTextColor={colors.textTertiary}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
            />
          </>
        ) : canRecommend ? (
          <>
            <Text style={[styles.sheetHint, { color: colors.textSecondary }]}>
              Would you give another pet to @{getUserHandle(record.adopterId)}? This shows on their profile.
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
              placeholder="Why you recommend them (optional)"
              placeholderTextColor={colors.textTertiary}
              value={text}
              onChangeText={setText}
              multiline
            />
          </>
        ) : (
          <Text style={[styles.sheetHint, { color: colors.textTertiary }]}>
            You already recommended this adopter.
          </Text>
        )}
      </View>
    </Sheet>
  );
}

export function PreviousOwnerActionsCard({
  record,
  adopterCheckIns,
  canPostNote,
  canRecommend,
  onPost,
}: {
  record: AdoptionRecord;
  adopterCheckIns: number;
  canPostNote: boolean;
  canRecommend: boolean;
  onPost: (mode?: OwnerPostMode) => void;
}) {
  const { colors } = useTheme();
  const adopter = users[record.adopterId as keyof typeof users];

  return (
    <View style={[styles.ownerActionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.ownerActionsHead}>
        <View style={[styles.ownerActionsIcon, { backgroundColor: colors.surface2 }]}>
          <Icon name="user" size={16} color={colors.textSecondary} />
        </View>
        <View style={styles.ownerActionsCopy}>
          <Text style={[styles.ownerActionsTitle, { color: colors.text }]}>You posted this adoption</Text>
          <Text style={[styles.ownerActionsSub, { color: colors.textTertiary }]}>
            {adopterCheckIns === 1 ? '1 check-in' : `${adopterCheckIns} check-ins`} from @{getUserHandle(record.adopterId)}
            {canRecommend ? ' · Recommend available' : ''}
          </Text>
        </View>
        {adopter ? <Avatar user={adopter} size={32} /> : null}
      </View>
      {canPostNote ? (
        <View style={styles.ownerActionsBtns}>
          <Button icon="comment" onPress={() => onPost('note')} style={styles.ownerActionBtn}>
            Post note
          </Button>
          {canRecommend ? (
            <Button variant="soft" icon="heart" onPress={() => onPost('recommend')} style={styles.ownerActionBtn}>
              Recommend
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function PreviousOwnerNotesList({
  notes,
  colors,
}: {
  notes: AdoptionUpdate[];
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  if (notes.length === 0) return null;

  return (
    <View style={styles.ownerNotesList}>
      <Text style={[styles.ownerNotesTitle, { color: colors.text }]}>Notes from previous owner</Text>
      {notes.map(note => (
        <View
          key={note.id}
          style={[styles.ownerNoteItem, { backgroundColor: colors.surface2, borderColor: colors.border }]}
        >
          <Text style={[styles.ownerNoteItemText, { color: colors.text }]}>{note.text}</Text>
          <Text style={[styles.ownerNoteItemDate, { color: colors.textTertiary }]}>{note.createdAt}</Text>
        </View>
      ))}
    </View>
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
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBody: { flex: 1, minWidth: 0, gap: 2 },
  bannerTitle: { ...typography.label, fontSize: 13 },
  bannerMeta: { fontSize: 11, fontWeight: '600' },
  bannerCta: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  bannerCtaText: { fontSize: 12, fontWeight: '700' },
  bannerDismiss: { marginLeft: -2 },
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
  ownerPostTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ownerPostTargetCopy: { flex: 1, gap: 2 },
  ownerPostTargetTitle: { ...typography.label, fontSize: 14 },
  ownerPostTargetSub: { ...typography.meta, fontSize: 11 },
  ownerActionsCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  ownerActionsHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ownerActionsIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerActionsCopy: { flex: 1, gap: 2 },
  ownerActionsTitle: { ...typography.label, fontSize: 14 },
  ownerActionsSub: { ...typography.meta, fontSize: 11 },
  ownerActionsBtns: { flexDirection: 'row', gap: 8 },
  ownerActionBtn: { flex: 1 },
  ownerNotesList: { gap: 8 },
  ownerNotesTitle: { ...typography.label, fontSize: 14 },
  ownerNoteItem: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
  },
  ownerNoteItemText: { ...typography.bodySm, lineHeight: 21 },
  ownerNoteItemDate: { ...typography.meta, fontSize: 11 },
});
