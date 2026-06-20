import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Dimensions, Platform,
} from 'react-native';
import { MockMediaTile } from '../ui/MockMediaTile';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography, sheetLayout } from '../../theme/tokens';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Icon } from '../icons/Icon';
import { Avatar } from '../ui/Avatar';
import { type PosterRecommendation, isPosterEndorsementNoteRequired } from '../../data/adoptionRecords';
import { useUserProfile } from '../../hooks/useUserProfile';
import type { AdoptionUpdate } from '../../data/adoptionRecords';
import type { AdoptionRecord, AdoptionUpdatePayload, AdoptionUpdatePrompt } from '../../data/adoptionRecords';

const SHEET_PAD = 20;
const MAX_PHOTOS = 3;
const CAPTION_HINT = 'Share how they are doing';
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
      maxHeight={SCREEN_HEIGHT * sheetLayout.maxHeightRatio}
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
            <MockMediaTile
              key={i}
              imageKey={`${record.id}-checkin-${i}`}
              imageIndex={i}
              filled={filled}
              icon="image"
              label={filled ? `Photo ${i + 1}` : i === 0 ? 'Add photo' : 'Add'}
              onPress={() => togglePhoto(i)}
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
        <MockMediaTile
          imageKey={`${record.id}-video`}
          filled={hasVideo}
          icon="play-square"
          label={hasVideo ? 'Video added' : 'Add a short clip'}
          onPress={() => setHasVideo(v => !v)}
          size="wide"
          showPlay
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

export function InlinePostHomeUpdateForm({
  record,
  milestoneLabel,
  promptText,
  onSubmit,
}: {
  record: AdoptionRecord;
  milestoneLabel: string;
  promptText: string;
  onSubmit: (payload: AdoptionUpdatePayload) => void;
}) {
  const { colors } = useTheme();
  const [savedCaption, setSavedCaption] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [photos, setPhotos] = useState<boolean[]>([false, false, false]);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    setSavedCaption('');
    setEditValue('');
    setEditingPrompt(false);
    setPhotos([false, false, false]);
    setHasVideo(false);
  }, [promptText, milestoneLabel, record.id]);

  const startEditing = () => {
    setEditValue(savedCaption);
    setEditingPrompt(true);
  };

  const finishEditing = () => {
    setSavedCaption(editValue.trim());
    setEditValue('');
    setEditingPrompt(false);
  };

  const photoCount = photos.filter(Boolean).length;
  const hasRequiredPhoto = photoCount > 0;
  const canSubmit = hasRequiredPhoto;

  const handleSubmit = () => {
    if (!hasRequiredPhoto) return;
    onSubmit({
      text: savedCaption.trim() || promptText,
      photoCount,
      hasVideo: hasVideo || undefined,
    });
    setSavedCaption('');
    setEditValue('');
    setEditingPrompt(false);
    setPhotos([false, false, false]);
    setHasVideo(false);
  };

  const togglePhoto = (index: number) => {
    setPhotos(prev => prev.map((p, i) => (i === index ? !p : p)));
  };

  return (
    <View style={styles.inlineUpdateForm}>
      <View style={[styles.promptField, { borderBottomColor: colors.border }]}>
        <View style={styles.promptBoxRow}>
          {editingPrompt ? (
            <TextInput
              style={[
                styles.promptBoxInput,
                { color: colors.text },
                Platform.OS === 'web' && styles.promptBoxInputWeb,
              ]}
              value={editValue}
              onChangeText={setEditValue}
              multiline
              autoFocus
              textAlignVertical="top"
              placeholder={CAPTION_HINT}
              placeholderTextColor={colors.textTertiary}
            />
          ) : (
            <Text style={[styles.promptBoxText, { color: colors.textTertiary }]}>
              {savedCaption || CAPTION_HINT}
            </Text>
          )}
          <Pressable
            onPress={editingPrompt ? finishEditing : startEditing}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={editingPrompt ? 'Done editing' : 'Edit prompt'}
            style={({ pressed }) => [
              styles.promptIconBtn,
              { opacity: pressed ? 0.65 : 1 },
              Platform.OS === 'web' && styles.promptIconBtnWeb,
            ]}
          >
            <Icon
              name={editingPrompt ? 'check' : 'edit'}
              size={16}
              color={editingPrompt ? colors.primary : colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>
        PHOTOS · REQUIRED · UP TO {MAX_PHOTOS}
      </Text>
      <View style={styles.photoRow}>
        {photos.map((filled, i) => (
          <MockMediaTile
            key={i}
            imageKey={`${record.id}-inline-${milestoneLabel}-${i}`}
            imageIndex={i}
            filled={filled}
            icon="image"
            label={filled ? `Photo ${i + 1}` : i === 0 ? 'Add photo' : 'Add'}
            onPress={() => togglePhoto(i)}
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
      <MockMediaTile
        imageKey={`${record.id}-inline-video-${milestoneLabel}`}
        filled={hasVideo}
        icon="play-square"
        label={hasVideo ? 'Video added' : 'Add a short clip'}
        onPress={() => setHasVideo(v => !v)}
        size="square"
        showPlay
      />

      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={({ pressed }) => [{ opacity: pressed ? 0.75 : !canSubmit ? 0.4 : 1 }]}
      >
        <Text style={[styles.inlineSubmitLink, { color: colors.primary }]}>Share update</Text>
      </Pressable>
    </View>
  );
}

function RecommendationChoice({
  value,
  onChange,
}: {
  value: PosterRecommendation | null;
  onChange: (v: PosterRecommendation) => void;
}) {
  const { colors } = useTheme();

  const renderOption = (
    id: PosterRecommendation,
    label: string,
    icon: string,
    activeBg: string,
    activeFg: string,
  ) => {
    const active = value === id;
    return (
      <Pressable
        key={id}
        onPress={() => onChange(id)}
        style={[
          styles.recPill,
          {
            backgroundColor: active ? activeBg : colors.surface,
            borderColor: active ? activeBg : colors.borderStrong,
          },
        ]}
      >
        <Icon name={icon} size={15} color={active ? activeFg : colors.textSecondary} />
        <Text style={[styles.recPillLabel, { color: active ? activeFg : colors.textSecondary }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.recRow}>
      {renderOption('recommended', 'Recommended', 'heart', colors.success, '#fff')}
      {renderOption('not_recommended', 'Not Recommended', 'alert', colors.danger, '#fff')}
    </View>
  );
}

export function PreviousOwnerNoteSheet({
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

  useEffect(() => {
    if (visible) setText('');
  }, [visible]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Post note"
      contentKey={`owner-note-${record.id}`}
      footer={(
        <Button full onPress={() => { if (text.trim()) { onSubmit(text.trim()); onClose(); } }} disabled={!text.trim()}>
          Post note
        </Button>
      )}
    >
      <View style={styles.sheetBody}>
        <Text style={[styles.sheetHint, { color: colors.textSecondary }]}>
          Share a follow-up about {record.petName} — how they&apos;re doing, a thank-you, or a check-in.
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
      </View>
    </Sheet>
  );
}

export function PreviousOwnerPostSheet({
  visible,
  onClose,
  record,
  endorsementCount,
  canRate,
  onSubmitRecommend,
}: {
  visible: boolean;
  onClose: () => void;
  record: AdoptionRecord;
  endorsementCount: number;
  canRate: boolean;
  onSubmitRecommend: (recommendation: PosterRecommendation, text?: string) => void;
}) {
  const { colors } = useTheme();
  const [recommendation, setRecommendation] = useState<PosterRecommendation | null>(null);
  const [text, setText] = useState('');
  const adopterProfile = useUserProfile(record.adopterId);
  const adopter = adopterProfile ?? { id: record.adopterId, name: 'Adopter', tint: record.tint };
  const noteRequired = isPosterEndorsementNoteRequired(recommendation, endorsementCount);
  const isNotRecommended = recommendation === 'not_recommended';
  const canSubmit = Boolean(recommendation) && (!noteRequired || Boolean(text.trim()));

  useEffect(() => {
    if (!visible) return;
    setRecommendation(null);
    setText('');
  }, [visible]);

  const handleSubmit = () => {
    if (!canRate || !recommendation) return;
    if (noteRequired && !text.trim()) return;
    onSubmitRecommend(recommendation, text.trim() || undefined);
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Rate adopter"
      contentKey={`owner-rec-${record.id}-${recommendation ?? 'none'}-${endorsementCount}`}
      footer={recommendation ? (
        <Button
          full
          variant={isNotRecommended ? 'danger' : 'primary'}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          Submit
        </Button>
      ) : undefined}
    >
      <View style={styles.sheetBody}>
        <View style={[styles.ownerPostTarget, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          {adopter ? <Avatar user={adopter} size={36} /> : null}
          <View style={styles.ownerPostTargetCopy}>
            <Text style={[styles.ownerPostTargetTitle, { color: colors.text }]}>
              {record.petName} → @{adopterProfile?.handle ?? record.adopterId.slice(0, 8)}
            </Text>
            <Text style={[styles.ownerPostTargetSub, { color: colors.textTertiary }]}>
              Visible on their adoption story
            </Text>
          </View>
        </View>

        {canRate ? (
          <>
            <RecommendationChoice value={recommendation} onChange={setRecommendation} />
            {recommendation ? (
              <>
                <Text style={[
                  styles.sheetHint,
                  { color: isNotRecommended ? colors.danger : colors.textSecondary },
                ]}
                >
                  {noteRequired
                    ? (isNotRecommended
                      ? 'A note is required when not recommending.'
                      : 'Share why you changed your rating — a note is required.')
                    : 'Add a note if you want (optional).'}
                </Text>
                <TextInput
                  style={[
                    styles.sheetInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface2,
                      borderColor: isNotRecommended ? colors.danger + '55' : colors.border,
                    },
                  ]}
                  placeholder={noteRequired ? 'Explain your rating…' : 'Add a note (optional)'}
                  placeholderTextColor={colors.textTertiary}
                  value={text}
                  onChangeText={setText}
                  multiline
                  textAlignVertical="top"
                />
              </>
            ) : null}
          </>
        ) : null}
      </View>
    </Sheet>
  );
}

export function PreviousOwnerActionsCard({
  record,
  adopterCheckIns,
  endorsementCount,
  canRate,
  onSubmitRecommendation,
}: {
  record: AdoptionRecord;
  adopterCheckIns: number;
  endorsementCount: number;
  canRate: boolean;
  onSubmitRecommendation: (recommendation: PosterRecommendation, text?: string) => void;
}) {
  const { colors } = useTheme();
  const adopterProfile = useUserProfile(record.adopterId);
  const adopter = adopterProfile ?? { id: record.adopterId, name: 'Adopter', tint: record.tint };
  const adopterHandle = adopterProfile?.handle ?? record.adopterId.slice(0, 8);
  const [selected, setSelected] = useState<PosterRecommendation | null>(null);
  const [text, setText] = useState('');

  const noteRequired = isPosterEndorsementNoteRequired(selected, endorsementCount);
  const isNotRecommended = selected === 'not_recommended';
  const canSubmit = Boolean(selected) && (!noteRequired || Boolean(text.trim()));

  const handleSubmit = () => {
    if (!selected || !canSubmit) return;
    onSubmitRecommendation(selected, text.trim() || undefined);
    setSelected(null);
    setText('');
  };

  return (
    <View style={[styles.ownerActionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.ownerActionsHead}>
        <View style={[styles.ownerActionsIcon, { backgroundColor: colors.surface2 }]}>
          <Icon name="user" size={16} color={colors.textSecondary} />
        </View>
        <View style={styles.ownerActionsCopy}>
          <Text style={[styles.ownerActionsTitle, { color: colors.text }]}>You posted this adoption</Text>
          <Text style={[styles.ownerActionsSub, { color: colors.textTertiary }]}>
            {adopterCheckIns === 1 ? '1 check-in' : `${adopterCheckIns} check-ins`} from @{adopterHandle}
            {endorsementCount > 0 ? ` · ${endorsementCount} rating${endorsementCount === 1 ? '' : 's'} posted` : ''}
          </Text>
        </View>
        {adopter ? <Avatar user={adopter} size={32} /> : null}
      </View>

      {canRate ? (
        <View style={styles.ownerRateBlock}>
          <RecommendationChoice value={selected} onChange={setSelected} />
          {selected ? (
            <>
              <Text style={[
                styles.ownerRateHint,
                { color: isNotRecommended ? colors.danger : colors.textSecondary },
              ]}>
                {noteRequired
                  ? (isNotRecommended
                    ? 'A note is required when not recommending.'
                    : 'Share why you changed your rating — a note is required.')
                  : 'Add a note if you want (optional).'}
              </Text>
              <TextInput
                style={[
                  styles.ownerRateInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.surface2,
                    borderColor: isNotRecommended ? colors.danger + '55' : colors.border,
                  },
                ]}
                placeholder={noteRequired ? 'Explain your rating…' : 'Add a note (optional)'}
                placeholderTextColor={colors.textTertiary}
                value={text}
                onChangeText={setText}
                multiline
                textAlignVertical="top"
              />
              <Button
                variant={isNotRecommended ? 'danger' : 'primary'}
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={styles.ownerRateSubmit}
              >
                Submit
              </Button>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function PreviousOwnerRecommendationsList({
  endorsements,
  isAdopter,
  adopterHandle,
}: {
  endorsements: AdoptionUpdate[];
  isAdopter?: boolean;
  adopterHandle?: string;
}) {
  const { colors } = useTheme();
  if (endorsements.length === 0) return null;

  return (
    <View style={styles.ownerRecList}>
      <Text style={[styles.ownerRecListTitle, { color: colors.text }]}>
        {isAdopter ? 'Previous owner ratings' : `Ratings for @${adopterHandle ?? 'adopter'}`}
      </Text>
      {[...endorsements].reverse().map(item => {
        const rec = item.endorsement ?? 'recommended';
        const positive = rec === 'recommended';
        const tint = positive ? colors.success : colors.danger;
        return (
          <View
            key={item.id}
            style={[styles.ownerRecItem, { backgroundColor: tint + '12', borderColor: tint + '35' }]}
          >
            <View style={styles.ownerRecItemHead}>
              <Icon name={positive ? 'heart' : 'alert'} size={14} color={tint} />
              <Text style={[styles.ownerRecItemLabel, { color: tint }]}>
                {positive ? 'Recommended' : 'Not Recommended'}
              </Text>
              <Text style={[styles.ownerRecItemDate, { color: colors.textTertiary }]}>{item.createdAt}</Text>
            </View>
            {item.text ? (
              <Text style={[styles.ownerRecItemText, { color: colors.text }]}>{item.text}</Text>
            ) : null}
          </View>
        );
      })}
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
          Only use if the adopter hasn&apos;t posted a recent update. This will be labeled &quot;Previous owner note&quot;: not adopter proof.
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
  endorsementCount,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  record: AdoptionRecord;
  endorsementCount: number;
  onSubmit: (recommendation: PosterRecommendation, text?: string) => void;
}) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [recommendation, setRecommendation] = useState<PosterRecommendation | null>(null);
  const noteRequired = isPosterEndorsementNoteRequired(recommendation, endorsementCount);
  const isNotRecommended = recommendation === 'not_recommended';
  const canSubmit = Boolean(recommendation) && (!noteRequired || Boolean(text.trim()));

  useEffect(() => {
    if (visible) {
      setRecommendation(null);
      setText('');
    }
  }, [visible]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Rate adopter"
      contentKey={`endorse-${record.id}-${recommendation ?? 'none'}`}
      footer={recommendation ? (
        <Button
          full
          variant={isNotRecommended ? 'danger' : 'primary'}
          onPress={() => {
            if (!recommendation || !canSubmit) return;
            onSubmit(recommendation, text.trim() || undefined);
            onClose();
          }}
          disabled={!canSubmit}
        >
          Submit
        </Button>
      ) : undefined}
    >
      <View style={styles.sheetBody}>
        <RecommendationChoice value={recommendation} onChange={setRecommendation} />
        {recommendation ? (
          <TextInput
            style={[
              styles.sheetInput,
              {
                color: colors.text,
                backgroundColor: colors.surface2,
                borderColor: isNotRecommended ? colors.danger + '55' : colors.border,
              },
            ]}
            placeholder={noteRequired ? 'Explain your rating…' : 'Add a note (optional)'}
            placeholderTextColor={colors.textTertiary}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
          />
        ) : null}
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
  inlineUpdateForm: { gap: 10, paddingTop: 2 },
  promptField: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
    paddingBottom: 4,
  },
  promptBoxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  promptBoxText: {
    ...typography.small,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  promptBoxInput: {
    ...typography.small,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    minHeight: 20,
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  promptBoxInputWeb: { outlineStyle: 'none' } as any,
  promptIconBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  promptIconBtnWeb: {
    cursor: 'pointer' as const,
  },
  inlineSubmitLink: { ...typography.link, fontWeight: '700', alignSelf: 'flex-start' },
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
  recRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  recPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  recPillLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
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
  ownerRateBlock: { gap: 10 },
  ownerRateHint: { ...typography.meta, fontSize: 12, lineHeight: 17 },
  ownerRateInput: {
    minHeight: 72,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
  },
  ownerRateSubmit: { alignSelf: 'stretch' },
  ownerRecList: { gap: 8 },
  ownerRecListTitle: { ...typography.label, fontSize: 14 },
  ownerRecItem: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
  },
  ownerRecItemHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ownerRecItemLabel: { ...typography.label, fontSize: 13, flex: 1 },
  ownerRecItemDate: { ...typography.meta, fontSize: 11 },
  ownerRecItemText: { ...typography.bodySm, lineHeight: 21 },
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
