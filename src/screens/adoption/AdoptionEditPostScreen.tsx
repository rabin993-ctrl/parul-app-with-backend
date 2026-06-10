import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { SectionHead } from '../../components/ui/SectionHead';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { useAdoptionFeed } from '../../context/AdoptionFeedContext';
import { getAdoptionListing } from '../../data/adoptionData';
import type { AdoptionStackParamList } from '../../navigation/AdoptionNavigator';

type Route = RouteProp<AdoptionStackParamList, 'EditPost'>;
type Nav = NativeStackNavigationProp<AdoptionStackParamList, 'EditPost'>;

export function AdoptionEditPostScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { listingId } = useRoute<Route>().params;
  const { listings, updateListing } = useAdoptionFeed();
  const listing = useMemo(() => getAdoptionListing(listingId, listings), [listingId, listings]);

  const [personality, setPersonality] = useState(listing?.personality ?? '');
  const [story, setStory] = useState(listing?.story ?? '');
  const [requirement, setRequirement] = useState(listing?.requirements[0] ?? '');

  if (!listing) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleSubHeader title="Edit listing" onBack={() => navigation.goBack()} />
        <View style={styles.center}><Text style={{ color: colors.textSecondary }}>Listing not found.</Text></View>
      </SafeAreaView>
    );
  }

  const save = () => {
    updateListing(listing.id, {
      personality: personality.trim(),
      story: story.trim(),
      requirements: requirement.trim() ? [requirement.trim(), ...listing.requirements.slice(1)] : listing.requirements,
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title={`Edit ${listing.name}`} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <SectionHead title="Update listing" />
        <Text style={[styles.label, { color: colors.textSecondary }]}>Personality line</Text>
        <TextInput
          value={personality}
          onChangeText={setPersonality}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        />
        <Text style={[styles.label, { color: colors.textSecondary }]}>Story</Text>
        <TextInput
          value={story}
          onChangeText={setStory}
          multiline
          textAlignVertical="top"
          style={[styles.input, styles.area, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        />
        <Text style={[styles.label, { color: colors.textSecondary }]}>Primary requirement</Text>
        <TextInput
          value={requirement}
          onChangeText={setRequirement}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        />

        <View style={styles.footer}>
          <Button variant="outline" onPress={() => navigation.goBack()}>Cancel</Button>
          <Button variant="primary" style={{ flex: 1 }} onPress={save}>Save changes</Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 8 },
  area: { minHeight: 140, lineHeight: 22 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
