import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { SectionHead } from '../../components/ui/SectionHead';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { useAdoptionFeed } from '../../context/AdoptionFeedContext';
import { ADOPTION_LOCATIONS, AdoptionSpecies, VaccinationStatus } from '../../data/adoptionData';
import type { AdoptionStackParamList } from '../../navigation/AdoptionNavigator';
import { AdoptionPhotoPicker } from '../../components/adoption/AdoptionPhotoPicker';
import type { PickedAsset } from '../../hooks/useMediaPicker';

type Nav = NativeStackNavigationProp<AdoptionStackParamList, 'CreatePost'>;

export function AdoptionCreatePostScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { addListing } = useAdoptionFeed();

  const [name, setName] = useState('');
  const [species, setSpecies] = useState<AdoptionSpecies>('dog');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Female');
  const [location, setLocation] = useState(ADOPTION_LOCATIONS[0]);
  const [vacc, setVacc] = useState<VaccinationStatus>('Partial');
  const [sterilized, setSterilized] = useState<'Yes' | 'No'>('No');
  const [personality, setPersonality] = useState('');
  const [story, setStory] = useState('');
  const [requirement, setRequirement] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [photos, setPhotos] = useState<PickedAsset[]>([]);
  const [publishing, setPublishing] = useState(false);

  const canPublish = name.trim() && breed.trim() && age.trim() && personality.trim() && photos.length > 0;

  const publish = async () => {
    if (!canPublish || publishing) return;
    setPublishing(true);
    try {
      const listing = await addListing({
        name,
        species,
        breed,
        age,
        gender,
        location,
        vacc,
        neutered: sterilized === 'Yes',
        personality,
        story,
        requirements: requirement.trim() ? [requirement.trim()] : ['Meet-and-greet required'],
        urgent,
        withImage: photos.length > 0,
        photos: photos.length > 0 ? photos : undefined,
      });
      navigation.replace('Detail', { listingId: listing.id });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Create listing" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <SectionHead title="Pet basics" />
        <Field label="Name" colors={colors}>
          <TextInput value={name} onChangeText={setName} placeholder="Pet name" placeholderTextColor={colors.textTertiary}
            style={[styles.input, inputStyle(colors)]} />
        </Field>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Species</Text>
        <View style={styles.row}>
          {(['dog', 'cat'] as AdoptionSpecies[]).map(s => (
            <Button key={s} size="sm" variant={species === s ? 'primary' : 'soft'} onPress={() => setSpecies(s)}>
              {s === 'dog' ? 'Dog' : 'Cat'}
            </Button>
          ))}
        </View>

        <Field label="Breed" colors={colors}>
          <TextInput value={breed} onChangeText={setBreed} placeholder="e.g. Indie mix" placeholderTextColor={colors.textTertiary}
            style={[styles.input, inputStyle(colors)]} />
        </Field>
        <Field label="Age" colors={colors}>
          <TextInput value={age} onChangeText={setAge} placeholder="e.g. 2 yrs" placeholderTextColor={colors.textTertiary}
            style={[styles.input, inputStyle(colors)]} />
        </Field>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Gender</Text>
        <View style={styles.row}>
          {(['Female', 'Male'] as const).map(g => (
            <Button key={g} size="sm" variant={gender === g ? 'primary' : 'soft'} onPress={() => setGender(g)}>
              {g}
            </Button>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Location</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {ADOPTION_LOCATIONS.map(loc => (
            <Button key={loc} size="sm" variant={location === loc ? 'primary' : 'soft'} onPress={() => setLocation(loc)}>
              {loc}
            </Button>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Vaccination</Text>
        <View style={styles.row}>
          {(['Done', 'Partial', 'Not yet'] as VaccinationStatus[]).map(v => (
            <Button key={v} size="sm" variant={vacc === v ? 'primary' : 'soft'} onPress={() => setVacc(v)}>
              {v}
            </Button>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Sterilization</Text>
        <View style={styles.row}>
          {(['Yes', 'No'] as const).map(v => (
            <Button key={v} size="sm" variant={sterilized === v ? 'primary' : 'soft'} onPress={() => setSterilized(v)}>
              {v}
            </Button>
          ))}
        </View>

        <SectionHead title="Personality & story" />
        <Field label="One-line personality" colors={colors}>
          <TextInput value={personality} onChangeText={setPersonality} placeholder="Short, warm description"
            placeholderTextColor={colors.textTertiary} style={[styles.input, inputStyle(colors)]} />
        </Field>
        <Field label="Full story" colors={colors}>
          <TextInput value={story} onChangeText={setStory} placeholder="Background, temperament, care needs…"
            placeholderTextColor={colors.textTertiary} multiline textAlignVertical="top"
            style={[styles.input, styles.area, inputStyle(colors)]} />
        </Field>
        <Field label="Key requirement" colors={colors}>
          <TextInput value={requirement} onChangeText={setRequirement} placeholder="Most important adoption requirement"
            placeholderTextColor={colors.textTertiary} style={[styles.input, inputStyle(colors)]} />
        </Field>

        <Pressable
          onPress={() => setUrgent(v => !v)}
          style={[styles.toggle, { backgroundColor: colors.surface2, borderColor: colors.border }]}
        >
          <Icon name="alert" size={18} color={urgent ? colors.danger : colors.textSecondary} />
          <Text style={[styles.toggleText, { color: colors.text }]}>Mark as urgent listing</Text>
          {urgent && <Icon name="check" size={16} color={colors.danger} />}
        </Pressable>

        <AdoptionPhotoPicker photos={photos} onChange={setPhotos} required />

        <View style={styles.footer}>
          <Button variant="outline" onPress={() => navigation.goBack()}>Cancel</Button>
          <Button variant="primary" style={{ flex: 1 }} onPress={publish} disabled={!canPublish}>
            Publish listing
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children, colors }: { label: string; children: React.ReactNode; colors: { textSecondary: string } }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function inputStyle(colors: ReturnType<typeof useTheme>['colors']) {
  return { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border };
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  area: { minHeight: 120, lineHeight: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 8,
  },
  toggleText: { flex: 1, fontSize: 14, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
