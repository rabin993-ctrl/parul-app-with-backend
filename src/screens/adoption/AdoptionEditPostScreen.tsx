import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { useAdoptionFeed } from '../../context/AdoptionFeedContext';
import {
  AdoptionSpecies,
  VaccinationStatus,
  getAdoptionListing,
} from '../../data/adoptionData';
import type { AdoptionStackParamList } from '../../navigation/AdoptionNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { webNoOutline } from '../../theme/webInput';

type Route = RouteProp<AdoptionStackParamList, 'EditPost'>;
type Nav = NativeStackNavigationProp<AdoptionStackParamList, 'EditPost'>;

const SPECIES_OPTIONS: { id: AdoptionSpecies; label: string; icon: string }[] = [
  { id: 'dog', label: 'Dog', icon: 'dog' },
  { id: 'cat', label: 'Cat', icon: 'cat' },
  { id: 'other', label: 'Other', icon: 'paw' },
];
const GENDER_OPTIONS = ['Female', 'Male'] as const;
const VACC_OPTIONS: VaccinationStatus[] = ['Done', 'Partial', 'Not yet'];
const STERILIZATION_OPTIONS = ['Yes', 'No'] as const;

function Label({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.label, { color: colors.textSecondary }]}>{text}</Text>;
}

function Field({
  label, value, onChange, placeholder, multiline, keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad';
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldWrap}>
      <Label text={label} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'auto'}
        keyboardType={keyboardType ?? 'default'}
        style={[
          styles.input,
          multiline && styles.inputArea,
          { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
          webNoOutline,
        ]}
      />
    </View>
  );
}

function ChipRow<T extends string>({
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
    <View style={styles.fieldWrap}>
      <Label text={label} />
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

function LocationField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldWrap}>
      <Label text="LOCATION" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="e.g. Dhanmondi, Dhaka"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }, webNoOutline]}
      />
    </View>
  );
}

export function AdoptionEditPostScreen({ onCloseOverride }: { onCloseOverride?: () => void } = {}) {
  const { colors } = useTheme();
  const tabBarPad = useTabBarScrollPadding();
  const navigation = useNavigation<Nav>();
  const { listingId } = useRoute<Route>().params;
  const { listings, updateListing } = useAdoptionFeed();
  const listing = useMemo(() => getAdoptionListing(listingId, listings), [listingId, listings]);

  const handleBack = () => {
    if (onCloseOverride) onCloseOverride();
    else navigation.goBack();
  };

  const [name, setName] = useState(listing?.name ?? '');
  const [species, setSpecies] = useState<AdoptionSpecies>(listing?.species ?? 'dog');
  const [breed, setBreed] = useState(listing?.breed ?? '');
  const [age, setAge] = useState(listing?.age ?? '');
  const [gender, setGender] = useState<'Male' | 'Female'>(listing?.gender ?? 'Female');
  const [location, setLocation] = useState(listing?.location ?? '');
  const [vacc, setVacc] = useState<VaccinationStatus>(listing?.vacc ?? 'Partial');
  const [sterilized, setSterilized] = useState<'Yes' | 'No'>(listing?.neutered ? 'Yes' : 'No');
  const [personality, setPersonality] = useState(listing?.personality ?? '');
  const [story, setStory] = useState(listing?.story ?? '');
  const [requirement, setRequirement] = useState(listing?.requirements[0] ?? '');
  const [urgent, setUrgent] = useState(listing?.urgent ?? false);

  if (!listing) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleSubHeader title="Edit listing" onBack={handleBack} />
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>Listing not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canSave = name.trim() && breed.trim() && age.trim() && personality.trim();

  const save = () => {
    if (!canSave) return;
    updateListing(listing.id, {
      name: name.trim(),
      species,
      breed: breed.trim(),
      age: age.trim(),
      gender,
      location,
      vacc,
      neutered: sterilized === 'Yes',
      healthNotes: `Vaccination: ${vacc} · Sterilization: ${sterilized === 'Yes' ? 'Yes' : 'No'}`,
      status: urgent ? 'Urgent' : (listing.status === 'Urgent' ? 'Available' : listing.status),
      urgent,
      personality: personality.trim(),
      story: story.trim(),
      requirements: requirement.trim()
        ? [requirement.trim(), ...listing.requirements.slice(1)]
        : listing.requirements,
    });
    handleBack();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title={`Edit ${listing.name}`} onBack={handleBack} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Field label="PET NAME" value={name} onChange={setName} placeholder="e.g. Luna" />

        <ChipRow
          label="SPECIES"
          options={SPECIES_OPTIONS.map(s => s.id)}
          value={species}
          onChange={setSpecies}
          getLabel={id => SPECIES_OPTIONS.find(s => s.id === id)?.label ?? id}
        />

        <Field label="BREED" value={breed} onChange={setBreed} placeholder="e.g. Indie Shorthair" />
        <Field label="AGE" value={age} onChange={setAge} placeholder="e.g. 2 yrs · 8 weeks" />

        <ChipRow
          label="GENDER"
          options={GENDER_OPTIONS}
          value={gender}
          onChange={setGender}
        />

        <LocationField value={location} onChange={setLocation} />

        <ChipRow
          label="VACCINATION"
          options={VACC_OPTIONS}
          value={vacc}
          onChange={setVacc}
        />

        <ChipRow
          label="STERILIZATION"
          options={STERILIZATION_OPTIONS}
          value={sterilized}
          onChange={setSterilized}
        />

        <View style={[styles.fieldWrap, styles.urgentRow]}>
          <View style={{ flex: 1 }}>
            <Label text="URGENT" />
            <Text style={[styles.urgentSub, { color: colors.textTertiary }]}>
              Mark if this pet needs urgent rehoming
            </Text>
          </View>
          <Switch
            value={urgent}
            onValueChange={setUrgent}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
          />
        </View>

        <Field
          label="PERSONALITY"
          value={personality}
          onChange={setPersonality}
          placeholder="One-liner shown on the card"
        />

        <Field
          label="STORY"
          value={story}
          onChange={setStory}
          placeholder="Tell adopters about this pet…"
          multiline
        />

        <Field
          label="REQUIREMENTS (OPTIONAL)"
          value={requirement}
          onChange={setRequirement}
          placeholder="e.g. No small kids · Outdoor space needed"
        />

      </ScrollView>

      <View style={[styles.footerBar, { backgroundColor: colors.bg, borderTopColor: colors.border, paddingBottom: tabBarPad }]}>
        <View style={styles.footer}>
          <Button variant="outline" onPress={handleBack}>Cancel</Button>
          <Button variant="primary" style={{ flex: 1 }} disabled={!canSave} onPress={save}>
            Save changes
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scroll: { padding: 16, gap: 4, paddingBottom: 16 },
  footerBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fieldWrap: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 7 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  inputArea: { minHeight: 120, lineHeight: 22 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  chipText: { fontSize: 13.5 },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
  },
  urgentSub: { fontSize: 12.5, marginTop: 2 },
  footer: { flexDirection: 'row', gap: 10 },
});
