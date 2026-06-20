import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { webFieldInputStyle } from '../../theme/webInput';
import { Icon } from '../icons/Icon';
import { Avatar } from '../ui/Avatar';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import { formatRescueUpdateTime, RESCUE_STATUS_META, type RescueStatus } from '../../data/profileData';
import { RescueOpenCasePhotoPicker } from './RescueOpenCasePhotoPicker';
import type { PickedAsset } from '../../hooks/useMediaPicker';

const SPECIES_OPTIONS = [
  { id: 'dog' as const, label: 'Dog', tint: '#14A697', icon: 'dog' },
  { id: 'cat' as const, label: 'Cat', tint: '#7A5AE0', icon: 'cat' },
  { id: 'other' as const, label: 'Other', tint: '#C98E2A', icon: 'paw' },
];

const STATUS_OPTIONS = (['active', 'under_treatment'] as const).map(id => ({
  id,
  label: RESCUE_STATUS_META[id].label,
  icon: RESCUE_STATUS_META[id].icon,
  tint: RESCUE_STATUS_META[id].tint,
}));

export type RescueOpenCaseDraft = {
  name: string;
  species: 'dog' | 'cat' | 'other';
  headline: string;
  location: string;
  story: string;
  status: RescueStatus;
  photoCount: number;
  tint: string;
  icon: string;
};

type Props = {
  onCanPublishChange?: (can: boolean) => void;
  onPublishHintChange?: (hint: string | null) => void;
  publishRef?: React.MutableRefObject<(() => RescueOpenCaseDraft | null) | null>;
};

export function RescueOpenCaseForm({ onCanPublishChange, onPublishHintChange, publishRef }: Props) {
  const { colors } = useTheme();
  const { me } = useCurrentUserProfile();

  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'dog' | 'cat' | 'other'>('dog');
  const [headline, setHeadline] = useState('');
  const [location, setLocation] = useState<string>('');
  const [story, setStory] = useState('');
  const [status, setStatus] = useState<RescueStatus>('active');
  const [photos, setPhotos] = useState<PickedAsset[]>([]);

  const speciesMeta = SPECIES_OPTIONS.find(s => s.id === species) ?? SPECIES_OPTIONS[0];
  const autoDate = formatRescueUpdateTime();
  const photoCount = photos.length;
  const hasName = name.trim().length > 0;
  const hasHeadline = headline.trim().length > 0;
  const canPublish = hasName && hasHeadline && photoCount > 0;

  const publishHint = useMemo(() => {
    if (canPublish) return null;
    const parts: string[] = [];
    if (!hasHeadline) parts.push('a headline');
    if (!hasName) parts.push("the animal's name");
    if (photoCount === 0) parts.push('at least one photo');
    if (parts.length === 0) return null;
    if (parts.length === 1) return `Add ${parts[0]} to open a case.`;
    const last = parts.pop();
    return `Add ${parts.join(', ')} and ${last} to open a case.`;
  }, [canPublish, hasHeadline, hasName, photoCount]);

  React.useEffect(() => {
    onCanPublishChange?.(canPublish);
  }, [canPublish, onCanPublishChange]);

  React.useEffect(() => {
    onPublishHintChange?.(publishHint);
  }, [publishHint, onPublishHintChange]);

  React.useEffect(() => {
    if (!publishRef) return;
    publishRef.current = () => {
      if (!canPublish) return null;
      return {
        name: name.trim(),
        species,
        headline: headline.trim(),
        location,
        story: story.trim(),
        status,
        photoCount,
        tint: speciesMeta.tint,
        icon: speciesMeta.icon,
      };
    };
    return () => {
      publishRef.current = null;
    };
  }, [publishRef, canPublish, name, species, headline, location, story, status, photoCount, speciesMeta]);

  return (
    <View style={styles.wrap}>
      <View style={styles.authorRow}>
        {me ? <Avatar user={me} size={40} /> : null}
        <View style={styles.authorCopy}>
          <Text style={[styles.authorName, { color: colors.text }]}>
            {me?.name.split(' ')[0] ?? ''}
          </Text>
          <View style={[styles.caseBadge, { backgroundColor: colors.successBg, borderColor: colors.border }]}>
            <Icon name="shield" size={12} color={colors.success} />
            <Text style={[styles.caseBadgeText, { color: colors.success }]}>Rescue case</Text>
            <Text style={[styles.caseBadgeMeta, { color: colors.textTertiary }]}>· {autoDate}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionLabel, styles.firstSectionLabel, { color: colors.textSecondary }]}>
        HEADLINE
      </Text>
      <TextInput
        value={headline}
        onChangeText={setHeadline}
        placeholder="e.g. Stray kitten needs vet care"
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.textBox,
          styles.headlineInput,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 },
          webFieldInputStyle,
        ]}
        multiline
        textAlignVertical="top"
      />

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        ABOUT THE CASE
      </Text>
      <TextInput
        value={story}
        onChangeText={setStory}
        placeholder="What happened? Locks after posting."
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.textBox,
          styles.storyInput,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 },
          webFieldInputStyle,
        ]}
        multiline
        textAlignVertical="top"
      />

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ANIMAL</Text>
      <View style={styles.chipRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name"
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.textBox,
            styles.field,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 },
            webFieldInputStyle,
          ]}
        />
        {SPECIES_OPTIONS.map(opt => {
          const on = species === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setSpecies(opt.id)}
              style={[styles.chip, {
                borderColor: on ? opt.tint : colors.border,
                backgroundColor: on ? opt.tint + '14' : colors.surface,
              }]}
            >
              <Icon name={opt.icon} size={13} color={on ? opt.tint : colors.textSecondary} />
              <Text style={[styles.chipText, { color: on ? colors.text : colors.textSecondary }]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>AREA</Text>
      <TextInput
        value={location}
        onChangeText={setLocation}
        placeholder="e.g. Dhanmondi, Dhaka"
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.textBox,
          styles.field,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 },
          webFieldInputStyle,
        ]}
      />

      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>STATUS</Text>
      <View style={styles.chipRow}>
        {STATUS_OPTIONS.map(opt => {
          const on = status === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setStatus(opt.id)}
              style={[styles.chip, {
                borderColor: on ? opt.tint : colors.border,
                backgroundColor: on ? opt.tint + '14' : colors.surface,
              }]}
            >
              <Icon name={opt.icon} size={13} color={on ? opt.tint : colors.textSecondary} />
              <Text style={[styles.chipText, { color: on ? colors.text : colors.textSecondary }, on && { fontWeight: '700' }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <RescueOpenCasePhotoPicker photos={photos} onChange={setPhotos} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  authorRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingBottom: 8,
  },
  authorCopy: { flex: 1, gap: 6, paddingTop: 2 },
  authorName: { fontSize: 15.5, fontWeight: '700' },
  caseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  caseBadgeText: { fontSize: 11.5, fontWeight: '700' },
  caseBadgeMeta: { fontSize: 11, fontWeight: '600' },
  textBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    width: '100%',
  },
  headlineInput: {
    fontSize: 16,
    lineHeight: 22,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  firstSectionLabel: { marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 2 },
  field: {
    flex: 1,
    minWidth: 120,
    fontSize: 15,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: 12.5, fontWeight: '600' },
  storyInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
