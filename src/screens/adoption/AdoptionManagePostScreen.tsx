import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { CompanionAvatar } from '../../components/ui/Avatar';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { useAdoptionFeed } from '../../context/AdoptionFeedContext';
import { getAdoptionListing } from '../../data/adoptionData';
import type { AdoptionStackParamList } from '../../navigation/AdoptionNavigator';

type Route = RouteProp<AdoptionStackParamList, 'ManagePost'>;
type Nav = NativeStackNavigationProp<AdoptionStackParamList, 'ManagePost'>;

export function AdoptionManagePostScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { listingId } = useRoute<Route>().params;
  const { listings, markAdopted } = useAdoptionFeed();
  const listing = useMemo(() => getAdoptionListing(listingId, listings), [listingId, listings]);
  const [note, setNote] = useState('Successfully adopted through Parul 🐾');

  if (!listing) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleSubHeader title="Manage" onBack={() => navigation.goBack()} />
        <View style={styles.center}><Text style={{ color: colors.textSecondary }}>Listing not found.</Text></View>
      </SafeAreaView>
    );
  }

  const confirm = () => {
    markAdopted(listing.id, note.trim());
    navigation.replace('Detail', { listingId: listing.id });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Mark as adopted" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <View style={[styles.hero, { backgroundColor: colors.successBg }]}>
          <Icon name="adoption" size={32} color={colors.success} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>Celebrate {listing.name}'s new home</Text>
          <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
            This will update the listing to Successfully Adopted and show a warm badge on the card.
          </Text>
        </View>

        <View style={[styles.petRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <CompanionAvatar companion={{ tint: listing.tint, species: listing.species } as { tint: string; species: string }} size={48} />
          <View>
            <Text style={[styles.petName, { color: colors.text }]}>{listing.name}</Text>
            <Text style={[styles.petMeta, { color: colors.textSecondary }]}>{listing.breed}</Text>
          </View>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>Adoption note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        />

        <View style={styles.footer}>
          <Button variant="outline" onPress={() => navigation.goBack()}>Cancel</Button>
          <Button variant="primary" style={{ flex: 1 }} onPress={confirm}>
            Mark Successfully Adopted
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  hero: { padding: 20, borderRadius: radius.lg, alignItems: 'center', gap: 8 },
  heroTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  heroBody: { fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
  petRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  petName: { fontSize: 16, fontWeight: '700' },
  petMeta: { fontSize: 12.5, marginTop: 2 },
  label: { fontSize: 12, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  footer: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
