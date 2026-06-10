import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { CompanionAvatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { SectionHead } from '../../components/ui/SectionHead';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { useAdoptionFeed } from '../../context/AdoptionFeedContext';
import { getAdoptionListing } from '../../data/adoptionData';
import { users } from '../../data/mockData';
import type { AdoptionStackParamList } from '../../navigation/AdoptionNavigator';

type Route = RouteProp<AdoptionStackParamList, 'Apply'>;
type Nav = NativeStackNavigationProp<AdoptionStackParamList, 'Apply'>;

export function AdoptionApplyScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { listingId } = useRoute<Route>().params;
  const { listings, submitRequest } = useAdoptionFeed();
  const listing = useMemo(() => getAdoptionListing(listingId, listings), [listingId, listings]);
  const me = users.you;

  const [reason, setReason] = useState('');
  const [homeType, setHomeType] = useState<string | null>(null);
  const [petExp, setPetExp] = useState<string | null>(null);
  const [living, setLiving] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  if (!listing) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleSubHeader title="Apply" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>Listing not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = reason.trim().length >= 20 && homeType && petExp && living && phone.trim().length >= 8;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const requestId = submitRequest(listing.id, listing.name);
    navigation.replace('Confirmation', { listingId: listing.id, requestId });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Request Adoption" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.petHeader}>
          <CompanionAvatar companion={{ tint: listing.tint, species: listing.species } as { tint: string; species: string }} size={52} />
          <View>
            <Text style={[styles.petName, { color: colors.text }]}>Adopt {listing.name}</Text>
            <Text style={[styles.petMeta, { color: colors.textSecondary }]}>
              {listing.breed} · {listing.location}
            </Text>
          </View>
        </View>

        <SectionHead title="About you" />
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Full name</Text>
        <TextInput
          value={me.name}
          editable={false}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface2, borderColor: colors.border }]}
        />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Why do you want to adopt {listing.name}?</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Share your motivation and what kind of home you can offer…"
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
          multiline
          textAlignVertical="top"
        />

        <SectionHead title="Home environment" />
        <ChipRow
          options={['House with yard', 'Apartment', 'Farm/rural', 'Condo']}
          selected={homeType}
          onSelect={setHomeType}
          colors={colors}
        />

        <SectionHead title="Pet experience" />
        <ChipRow
          options={['First time', '1–2 pets before', 'Several', 'Professional carer']}
          selected={petExp}
          onSelect={setPetExp}
          colors={colors}
        />

        <SectionHead title="Living situation" />
        <ChipRow
          options={['Live alone', 'With partner', 'With family', 'Roommates']}
          selected={living}
          onSelect={setLiving}
          colors={colors}
        />

        <SectionHead title="Contact" />
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Phone</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 …"
          placeholderTextColor={colors.textTertiary}
          keyboardType="phone-pad"
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        />
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email (optional)</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          placeholderTextColor={colors.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        />

        <View style={styles.footer}>
          <Button variant="outline" onPress={() => navigation.goBack()}>Cancel</Button>
          <Button variant="primary" style={{ flex: 1 }} onPress={handleSubmit} disabled={!canSubmit}>
            Submit Request
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChipRow({
  options,
  selected,
  onSelect,
  colors,
}: {
  options: string[];
  selected: string | null;
  onSelect: (v: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.chipRow}>
      {options.map(o => {
        const on = selected === o;
        return (
          <Button key={o} size="sm" variant={on ? 'primary' : 'soft'} onPress={() => onSelect(o)}>
            {o}
          </Button>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 32 },
  petHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  petName: { fontSize: 20, fontWeight: '800' },
  petMeta: { fontSize: 13, marginTop: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  textArea: { minHeight: 110, lineHeight: 22 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
