import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
} from 'react-native';
import { MockMediaTile } from '../ui/MockMediaTile';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { webNoOutline } from '../../theme/webInput';
import { Icon } from '../icons/Icon';
import { Avatar } from '../ui/Avatar';
import { users } from '../../data/mockData';
import { RESCUE_LOCATIONS } from '../../data/rescueData';
import { formatRescueUpdateTime, RESCUE_STATUS_META, type RescueStatus } from '../../data/profileData';

const SPECIES_OPTIONS = [
  { id: 'dog' as const, label: 'Dog', tint: '#14A697', icon: 'dog' },
  { id: 'cat' as const, label: 'Cat', tint: '#7A5AE0', icon: 'cat' },
  { id: 'other' as const, label: 'Other', tint: '#C98E2A', icon: 'paw' },
];

const STATUS_OPTIONS = (['active', 'under_treatment', 'recovered'] as const).map(id => ({
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
  publishRef?: React.MutableRefObject<(() => RescueOpenCaseDraft | null) | null>;
};

export function RescueOpenCaseForm({ onCanPublishChange, publishRef }: Props) {
  const { colors } = useTheme();
  const me = users.you;

  const [name, setName] = useState('');
  const [species, setSpecies] = useState<'dog' | 'cat' | 'other'>('dog');
  const [headline, setHeadline] = useState('');
  const [location, setLocation] = useState<string>(RESCUE_LOCATIONS[0]);
  const [story, setStory] = useState('');
  const [status, setStatus] = useState<RescueStatus>('active');
  const [photos, setPhotos] = useState<boolean[]>([false, false, false]);

  const speciesMeta = SPECIES_OPTIONS.find(s => s.id === species) ?? SPECIES_OPTIONS[0];
  const autoDate = formatRescueUpdateTime();
  const photoCount = photos.filter(Boolean).length;
  const canPublish = name.trim().length > 0
    && headline.trim().length > 0
    && story.trim().length >= 12
    && photoCount > 0;

  React.useEffect(() => {
    onCanPublishChange?.(canPublish);
  }, [canPublish, onCanPublishChange]);

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
        <Avatar user={me} size={40} />
        <View style={styles.authorCopy}>
          <Text style={[styles.authorName, { color: colors.text }]}>{me.name.split(' ')[0]}</Text>
          <View style={[styles.caseBadge, { backgroundColor: colors.successBg, borderColor: colors.border }]}>
            <Icon name="shield" size={12} color={colors.success} />
            <Text style={[styles.caseBadgeText, { color: colors.success }]}>Rescue case</Text>
            <Text style={[styles.caseBadgeMeta, { color: colors.textTertiary }]}>· {autoDate}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionLabel, styles.headlineSectionLabel, { color: colors.textSecondary }]}>
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
        ]}
        multiline
      />

      <Text style={[styles.sectionLabel, styles.aboutSectionLabel, { color: colors.textSecondary }]}>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {RESCUE_LOCATIONS.map(loc => {
          const on = location === loc;
          const label = loc.split(',')[0]?.trim() ?? loc;
          return (
            <Pressable
              key={loc}
              onPress={() => setLocation(loc)}
              style={[styles.chip, {
                borderColor: on ? colors.primary : colors.border,
                backgroundColor: on ? colors.primary + '14' : colors.surface,
              }]}
            >
              <Text style={[styles.chipText, { color: on ? colors.primary : colors.textSecondary }, on && { fontWeight: '700' }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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

      <Text style={[styles.sectionLabel, styles.photoSectionLabel, { color: colors.textSecondary }]}>
        PHOTOS · REQUIRED
      </Text>
      <View style={styles.photoRow}>
        {photos.map((filled, i) => (
          <MockMediaTile
            key={i}
            imageKey={`new-case-${species}-${i}`}
            imageIndex={i}
            filled={filled}
            icon={i === 0 ? 'camera' : 'image'}
            label={filled ? `Photo ${i + 1}` : i === 0 ? 'Add photo' : 'Add'}
            onPress={() => setPhotos(prev => prev.map((p, j) => (j === i ? !p : p)))}
            size="square"
          />
        ))}
      </View>
      {photoCount === 0 && (
        <Text style={[styles.photoWarn, { color: colors.warning }]}>Add at least one photo.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  authorRow: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', marginBottom: 4 },
  authorCopy: { flex: 1, gap: 4 },
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
    ...webNoOutline,
  },
  headlineInput: {
    fontSize: 16,
    lineHeight: 22,
    minHeight: 48,
    marginBottom: 2,
    textAlignVertical: 'top',
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 8, marginBottom: 5 },
  headlineSectionLabel: { marginTop: 4, marginBottom: 5 },
  aboutSectionLabel: { marginTop: 4 },
  photoSectionLabel: { marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 2 },
  field: {
    flex: 1,
    minWidth: 120,
    fontSize: 15,
    ...webNoOutline,
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
    marginBottom: 0,
    textAlignVertical: 'top',
  },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoTile: { flex: 1, aspectRatio: 1, maxWidth: 96 },
  photoInner: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoWarn: { fontSize: 11.5, fontWeight: '600', marginTop: 2 },
});
