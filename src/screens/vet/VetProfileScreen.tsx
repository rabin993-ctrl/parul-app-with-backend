import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Stars } from '../../components/ui/Stars';
import { SectionHead } from '../../components/ui/SectionHead';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { getVetById, ISSUE_CATEGORIES } from '../../data/vetData';
import { useCompanions } from '../../context/CompanionContext';
import { useAuth } from '../../context/AuthContext';
import { useVetConsult } from '../../context/VetConsultContext';
import type { VetStackParamList } from '../../navigation/VetNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Route = RouteProp<VetStackParamList, 'VetProfile'>;
type Nav = NativeStackNavigationProp<VetStackParamList, 'VetProfile'>;

export function VetProfileScreen() {
  const { colors, iconBg } = useTheme();
  const navigation = useNavigation<Nav>();
  const { vetId } = useRoute<Route>().params;
  const { startChosenConsult } = useVetConsult();
  const { user } = useAuth();
  const { getMyCompanions, getCompanion } = useCompanions();
  const tabBarPad = useTabBarScrollPadding();
  const vet = getVetById(vetId);

  const myPets = useMemo(() => (user ? getMyCompanions(user.id) : []), [user, getMyCompanions]);
  const [issueId, setIssueId] = useState(ISSUE_CATEGORIES[6].id);
  const [petId, setPetId] = useState(() => myPets[0]?.id ?? '');

  if (!vet) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleSubHeader title="Vet profile" />
      </SafeAreaView>
    );
  }

  const issue = ISSUE_CATEGORIES.find(c => c.id === issueId)!;
  const pet = petId ? getCompanion(petId) : null;

  const book = () => {
    if (!vet.available || !pet) return;
    const consultId = startChosenConsult({
      vetId: vet.id,
      issueId,
      issueLabel: issue.label,
      petId: pet.id,
      petName: pet.name,
      petSpecies: pet.species,
      symptoms: `Consultation requested for ${issue.label.toLowerCase()}.`,
      hasImage: false,
    });
    navigation.navigate('Payment', { consultId });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Vet profile" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: tabBarPad, gap: 14 }}>
        <View style={[styles.hero, { backgroundColor: vet.tint + '12', borderColor: vet.tint + '28' }]}>
          <View style={[styles.avatar, { backgroundColor: vet.tint + '22' }]}>
            <Icon name="medical" size={36} color={vet.tint} />
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{vet.name}</Text>
          <Text style={[styles.title, { color: colors.textSecondary }]}>{vet.title}</Text>
          <View style={styles.ratingRow}>
            <Stars value={vet.rating} size={14} />
            <Text style={[styles.reviews, { color: colors.textSecondary }]}>
              {vet.rating} · {vet.reviews} reviews
            </Text>
          </View>
          <Badge tone={vet.available ? 'success' : 'neutral'}>
            {vet.available ? `Available · ~${vet.responseMins} min` : 'Currently busy'}
          </Badge>
        </View>

        <SectionHead title="Specialization" />
        <Text style={[styles.body, { color: colors.textSecondary }]}>{vet.specialization}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{vet.bio}</Text>

        <View style={styles.infoGrid}>
          <InfoTile icon="calendar" label="Experience" value={vet.experience} colors={colors} />
          <InfoTile icon="vaccine" label="Consult fee" value={`₹${vet.fee}`} colors={colors} />
          <InfoTile icon="comment" label="Languages" value={vet.languages.join(', ')} colors={colors} />
        </View>

        <SectionHead title="Consultation type" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {ISSUE_CATEGORIES.map(cat => (
            <Pressable
              key={cat.id}
              onPress={() => setIssueId(cat.id)}
              style={[styles.chip, {
                backgroundColor: issueId === cat.id ? iconBg(cat.bg) : colors.surface2,
                borderColor: issueId === cat.id ? cat.tint + '44' : 'transparent',
              }]}
            >
              <Text style={[styles.chipText, { color: issueId === cat.id ? cat.tint : colors.textSecondary }]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHead title="Your pet" />
        <View style={styles.chips}>
          {myPets.map(p => (
            <Pressable
              key={p.id}
              onPress={() => setPetId(p.id)}
              style={[styles.chip, {
                backgroundColor: petId === p.id ? colors.primary + '14' : colors.surface2,
                borderColor: petId === p.id ? colors.primary + '40' : 'transparent',
              }]}
            >
              <Text style={[styles.chipText, { color: petId === p.id ? colors.primary : colors.textSecondary }]}>
                {p.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button variant="primary" full onPress={book} disabled={!vet.available}>
          Book & pay ₹{vet.fee + 49}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoTile({ icon, label, value, colors }: {
  icon: string; label: string; value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.tile, { backgroundColor: colors.surface2 }]}>
      <Icon name={icon} size={14} color={colors.primary} />
      <Text style={[styles.tileLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: colors.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hero: {
    alignItems: 'center',
    padding: 20,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  name: { fontSize: 20, fontWeight: '800' },
  title: { fontSize: 13 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  reviews: { fontSize: 12.5 },
  body: { fontSize: 14, lineHeight: 21 },
  infoGrid: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, padding: 10, borderRadius: radius.md, gap: 4 },
  tileLabel: { fontSize: 10, fontWeight: '600' },
  tileValue: { fontSize: 11.5, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1 },
  chipText: { fontSize: 12.5, fontWeight: '600' },
});
