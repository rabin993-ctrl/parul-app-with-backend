import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import { Button } from '../../components/ui/Button';
import { Toast, ToastData } from '../../components/ui/Toast';
import { useCompanions } from '../../context/CompanionContext';
import { useResolvedCompanion } from '../../hooks/useResolvedCompanion';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';

type Route = RouteProp<ProfileStackParamList, 'CompanionEdit'>;
type Nav = NativeStackNavigationProp<ProfileStackParamList, 'CompanionEdit'>;

import { TRAIT_OPTIONS } from '../../hooks/useCompanionProfileEdit';

function SectionLabel({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.sectionLabel, typography.sectionLabel, { color: colors.textTertiary }]}>
      {title}
    </Text>
  );
}

export function CompanionEditScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { companionId } = useRoute<Route>().params;
  const { updateCompanionProfile } = useCompanions();
  const { companion, loading } = useResolvedCompanion(companionId);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [saving, setSaving] = useState(false);

  const [about, setAbout] = useState('');
  const [mood, setMood] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [traits, setTraits] = useState<string[]>([]);
  const [vaccinated, setVaccinated] = useState(false);
  const [neutered, setNeutered] = useState(false);
  const [microchipped, setMicrochipped] = useState(false);

  useEffect(() => {
    if (!companion) return;
    setAbout(companion.about ?? '');
    setMood(companion.mood ?? '');
    setBreed(companion.breed === '—' ? '' : companion.breed);
    setAge(companion.age === '—' ? '' : companion.age);
    setGender(companion.gender === '—' ? '' : companion.gender);
    setTraits(companion.traits ?? []);
    setVaccinated(companion.vaccinated);
    setNeutered(companion.neutered);
    setMicrochipped(companion.microchipped);
  }, [companion]);

  const toggleTrait = useCallback((trait: string) => {
    setTraits(prev => (
      prev.includes(trait) ? prev.filter(t => t !== trait) : [...prev, trait]
    ));
  }, []);

  const handleSave = useCallback(async () => {
    if (!companion || saving) return;
    setSaving(true);
    try {
      await updateCompanionProfile(companion.id, {
        about: about.trim(),
        mood: mood.trim() || undefined,
        breed: breed.trim() || '—',
        age: age.trim() || '—',
        gender: gender.trim() || '—',
        traits,
        vaccinated,
        neutered,
        microchipped,
      });
      setToast({ msg: 'Profile updated', icon: 'check', tone: 'success' });
      navigation.goBack();
    } catch {
      setToast({ msg: 'Could not save profile', icon: 'close', tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }, [
    about, age, breed, companion, gender, microchipped, mood, navigation,
    neutered, saving, traits, updateCompanionProfile, vaccinated,
  ]);

  if (loading || !companion) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <ProfileSubHeader title="Edit profile" onBack={() => navigation.goBack()} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Edit profile" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionLabel title="About" />
          <TextInput
            value={about}
            onChangeText={setAbout}
            placeholder={`Tell people about ${companion.name}…`}
            placeholderTextColor={colors.textTertiary}
            multiline
            style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
          />
        </View>

        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionLabel title="Mood" />
          <TextInput
            value={mood}
            onChangeText={setMood}
            placeholder="Feeling playful today"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
        </View>

        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionLabel title="Details" />
          <TextInput
            value={breed}
            onChangeText={setBreed}
            placeholder="Breed"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <TextInput
            value={age}
            onChangeText={setAge}
            placeholder="Age"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <TextInput
            value={gender}
            onChangeText={setGender}
            placeholder="Gender"
            placeholderTextColor={colors.textTertiary}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
        </View>

        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionLabel title="Traits" />
          <View style={styles.traitRow}>
            {TRAIT_OPTIONS.map(trait => {
              const active = traits.includes(trait);
              return (
                <Pressable
                  key={trait}
                  onPress={() => toggleTrait(trait)}
                  style={[
                    styles.traitChip,
                    {
                      backgroundColor: active ? companion.tint + '20' : colors.surface2,
                      borderColor: active ? companion.tint + '50' : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.traitText, { color: active ? colors.text : colors.textSecondary }]}>
                    {trait}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionLabel title="Health" />
          {([
            ['Vaccinated', vaccinated, setVaccinated],
            ['Neutered / spayed', neutered, setNeutered],
            ['Microchipped', microchipped, setMicrochipped],
          ] as const).map(([label, value, setter]) => (
            <View key={label} style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
              <Switch
                value={value}
                onValueChange={setter}
                trackColor={{ false: colors.border, true: companion.tint + '80' }}
                thumbColor={colors.surface}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
        <Button loading={saving} onPress={() => { void handleSave(); }}>
          Save changes
        </Button>
      </View>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.md, gap: 12, paddingBottom: 24 },
  group: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  sectionLabel: { marginBottom: 2 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  traitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  traitChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  traitText: { fontSize: 13, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
