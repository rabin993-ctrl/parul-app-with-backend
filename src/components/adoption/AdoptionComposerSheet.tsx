import React, { useMemo, useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Switch,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Icon } from '../icons/Icon';
import { Avatar } from '../ui/Avatar';
import { ToastData } from '../ui/Toast';
import { useAdoptionFeed } from '../../context/AdoptionFeedContext';
import {
  AdoptionSpecies,
  VaccinationStatus,
} from '../../data/adoptionData';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import { webFieldInputStyle } from '../../theme/webInput';
import { AdoptionPhotoPicker } from './AdoptionPhotoPicker';
import type { PickedAsset } from '../../hooks/useMediaPicker';

const SPECIES_OPTIONS: { id: AdoptionSpecies; label: string }[] = [
  { id: 'dog', label: 'Dog' },
  { id: 'cat', label: 'Cat' },
  { id: 'other', label: 'Other' },
];
const GENDER_OPTIONS = ['Female', 'Male'] as const;
const VACC_OPTIONS: VaccinationStatus[] = ['Done', 'Partial', 'Not yet'];
const STERILIZATION_OPTIONS = ['Yes', 'No'] as const;

function SectionLabel({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{text}</Text>;
}

function ChipGroup<T extends string>({
  label, options, value, onChange, getLabel,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  getLabel?: (v: T) => string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldBlock}>
      <SectionLabel text={label} />
      <View style={styles.chipRow}>
        {options.map(opt => {
          const active = opt === value;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[
                styles.chip,
                active && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5 },
              ]}
            >
              <Text style={[styles.chipText, {
                color: active ? colors.text : colors.textTertiary,
                fontWeight: active ? '700' : '500',
              }]}>
                {getLabel ? getLabel(opt) : opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function AdoptionComposerSheet({
  visible,
  onClose,
  onToast,
  onPublished,
}: {
  visible: boolean;
  onClose: () => void;
  onToast: (t: ToastData) => void;
  onPublished?: (input: {
    listingId: string;
    name: string;
    personality: string;
    story: string;
    location: string;
    urgent?: boolean;
  }) => void;
}) {
  const { colors } = useTheme();
  const { addListing } = useAdoptionFeed();
  const { me } = useCurrentUserProfile();

  const [name, setName] = useState('');
  const [species, setSpecies] = useState<AdoptionSpecies>('dog');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [location, setLocation] = useState('');
  const [vacc, setVacc] = useState<VaccinationStatus>('Partial');
  const [sterilized, setSterilized] = useState<'Yes' | 'No'>('No');
  const [urgent, setUrgent] = useState(false);
  const [personality, setPersonality] = useState('');
  const [story, setStory] = useState('');
  const [requirement, setRequirement] = useState('');
  const [photos, setPhotos] = useState<PickedAsset[]>([]);
  const [publishing, setPublishing] = useState(false);

  const reset = () => {
    setName(''); setSpecies('dog'); setBreed(''); setAge('');
    setGender('Female'); setLocation('');
    setVacc('Partial'); setSterilized('No'); setUrgent(false);
    setPersonality(''); setStory(''); setRequirement('');
    setPhotos([]);
  };

  const canSubmit = name.trim().length > 0 && photos.length > 0;

  const publishHint = useMemo(() => {
    if (canSubmit) return null;
    const parts: string[] = [];
    if (!name.trim()) parts.push('pet name');
    if (photos.length === 0) parts.push('at least one photo');
    return `Add ${parts.join(' and ')} to publish.`;
  }, [canSubmit, name, photos.length]);

  const submit = async () => {
    if (!canSubmit || publishing) return;
    const trimmedName = name.trim();
    const trimmedStory = story.trim();
    const trimmedBreed = breed.trim() || 'Mixed';
    const trimmedAge = age.trim() || 'Unknown';
    const trimmedPersonality = personality.trim() || 'Looking for a loving home';
    const trimmedLocation = location.trim() || me?.location || 'Dhaka';

    setPublishing(true);
    try {
      const listing = await addListing({
        name: trimmedName,
        species,
        breed: trimmedBreed,
        age: trimmedAge,
        gender,
        location: trimmedLocation,
        vacc,
        neutered: sterilized === 'Yes',
        status: 'Available',
        personality: trimmedPersonality,
        story: trimmedStory,
        requirements: requirement.trim() ? [requirement.trim()] : ['Meet-and-greet required'],
        urgent,
        withImage: photos.length > 0,
        photos: photos.length > 0 ? photos : undefined,
      });
      onPublished?.({
        listingId: listing.id,
        name: trimmedName,
        personality: trimmedPersonality,
        story: trimmedStory,
        location: trimmedLocation,
        urgent,
      });
      onClose();
      reset();
      onToast({ msg: `${trimmedName} listed for adoption 🐾`, icon: 'adoption', tone: 'success' });
    } catch {
      onToast({ msg: 'Could not publish listing. Try again.', icon: 'alert', tone: 'danger' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={() => { onClose(); reset(); }}
      title="List for adoption"
    >
      <View style={styles.scrollContent}>
        {/* Author row */}
        <View style={styles.authorRow}>
          <Avatar user={me} size={38} />
          <View>
            <Text style={[styles.authorName, { color: colors.text }]}>{me.name}</Text>
            <Text style={[styles.authorSub, { color: colors.textTertiary }]}>New adoption listing</Text>
          </View>
        </View>

        {/* Pet name */}
        <View style={styles.fieldBlock}>
          <SectionLabel text="PET NAME" />
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Luna"
            placeholderTextColor={colors.textTertiary}
            style={[styles.textField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }, webFieldInputStyle]}
          />
        </View>

        <ChipGroup
          label="SPECIES"
          options={SPECIES_OPTIONS.map(s => s.id)}
          value={species}
          onChange={setSpecies}
          getLabel={id => SPECIES_OPTIONS.find(s => s.id === id)?.label ?? id}
        />

        {/* Breed + Age side by side */}
        <View style={styles.rowFields}>
          <View style={{ flex: 1 }}>
            <SectionLabel text="BREED" />
            <TextInput
              value={breed}
              onChangeText={setBreed}
              placeholder="e.g. Indie"
              placeholderTextColor={colors.textTertiary}
              style={[styles.textField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }, webFieldInputStyle]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SectionLabel text="AGE" />
            <TextInput
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 2 yrs"
              placeholderTextColor={colors.textTertiary}
              style={[styles.textField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }, webFieldInputStyle]}
            />
          </View>
        </View>

        <ChipGroup label="GENDER" options={GENDER_OPTIONS} value={gender} onChange={setGender} />

        {/* Location */}
        <View style={styles.fieldBlock}>
          <SectionLabel text="LOCATION" />
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Dhanmondi, Dhaka"
            placeholderTextColor={colors.textTertiary}
            style={[styles.textField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }, webFieldInputStyle]}
          />
        </View>

        <ChipGroup label="VACCINATION" options={VACC_OPTIONS} value={vacc} onChange={setVacc} />
        <ChipGroup label="STERILIZATION" options={STERILIZATION_OPTIONS} value={sterilized} onChange={setSterilized} />

        {/* Urgent toggle */}
        <View style={[styles.fieldBlock, styles.urgentRow]}>
          <View style={{ flex: 1 }}>
            <SectionLabel text="URGENT" />
            <Text style={[styles.urgentSub, { color: colors.textTertiary }]}>
              Needs rehoming as soon as possible
            </Text>
          </View>
          <Switch
            value={urgent}
            onValueChange={setUrgent}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
        </View>

        {/* Personality */}
        <View style={styles.fieldBlock}>
          <SectionLabel text="PERSONALITY" />
          <TextInput
            value={personality}
            onChangeText={setPersonality}
            placeholder="One-liner shown on the card"
            placeholderTextColor={colors.textTertiary}
            style={[styles.textField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }, webFieldInputStyle]}
          />
        </View>

        {/* Story */}
        <View style={styles.fieldBlock}>
          <SectionLabel text="STORY" />
          <TextInput
            value={story}
            onChangeText={setStory}
            placeholder="Tell adopters about this pet…"
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
            style={[styles.textField, styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }, webFieldInputStyle]}
          />
        </View>

        {/* Requirements */}
        <View style={styles.fieldBlock}>
          <SectionLabel text="REQUIREMENTS (OPTIONAL)" />
          <TextInput
            value={requirement}
            onChangeText={setRequirement}
            placeholder="e.g. No small kids · Outdoor space needed"
            placeholderTextColor={colors.textTertiary}
            style={[styles.textField, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface2 }, webFieldInputStyle]}
          />
        </View>

        <AdoptionPhotoPicker photos={photos} onChange={setPhotos} required />

        <View style={styles.toolbar}>
          {publishHint ? (
            <Text style={[styles.publishHint, { color: colors.textTertiary }]} numberOfLines={2}>
              {publishHint}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Button disabled={!canSubmit || publishing} onPress={submit} icon="adoption">
            Publish listing
          </Button>
        </View>

      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 12, gap: 2 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  authorName: { fontSize: 15, fontWeight: '700' },
  authorSub: { fontSize: 12, marginTop: 1 },
  fieldBlock: { marginBottom: 14 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 7 },
  textField: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
  },
  textArea: { minHeight: 100, lineHeight: 21 },
  rowFields: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  chipText: { fontSize: 13.5 },
  urgentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  urgentSub: { fontSize: 12, marginTop: 2 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  publishHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
