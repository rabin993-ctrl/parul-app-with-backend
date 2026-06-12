import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { CompanionAvatar } from '../../components/ui/Avatar';
import { useAdoptionFeed } from '../../context/AdoptionFeedContext';
import { getAdoptionListing } from '../../data/adoptionData';
import type { AdoptionStackParamList } from '../../navigation/AdoptionNavigator';

type Route = RouteProp<AdoptionStackParamList, 'Confirmation'>;
type Nav = NativeStackNavigationProp<AdoptionStackParamList, 'Confirmation'>;

export function AdoptionConfirmationScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { listingId, requestId } = useRoute<Route>().params;
  const { listings, requests } = useAdoptionFeed();
  const listing = useMemo(() => getAdoptionListing(listingId, listings), [listingId, listings]);
  const request = useMemo(
    () => (requestId ? requests.find(r => r.id === requestId) : undefined),
    [requestId, requests],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: colors.successBg }]}>
          <Icon name="check-circle" size={48} color={colors.success} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Request sent!</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Your adoption request{listing ? ` for ${listing.name}` : ''} has been submitted.
          The poster will reach out in Chats if it is a match.
        </Text>

        {listing && (
          <View style={[styles.petCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <CompanionAvatar companion={{ tint: listing.tint, species: listing.species } as { tint: string; species: string }} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.petName, { color: colors.text }]}>{listing.name}</Text>
              <Text style={[styles.petMeta, { color: colors.textSecondary }]}>
                {listing.breed} · {listing.location}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: colors.warningBg }]}>
              <Text style={[styles.statusText, { color: colors.warning }]}>
                {request?.status === 'approved' ? 'Approved' : 'Request sent'}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            variant="primary"
            full
            onPress={() => navigation.navigate('Listing')}
          >
            Back to Adoption
          </Button>
          {listing && (
            <Button
              variant="soft"
              full
              onPress={() => navigation.navigate('Detail', { listingId: listing.id })}
            >
              View pet profile
            </Button>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 320 },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 8,
  },
  petName: { fontSize: 16, fontWeight: '700' },
  petMeta: { fontSize: 12.5, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  statusText: { fontSize: 11.5, fontWeight: '700' },
  actions: { width: '100%', gap: 10, marginTop: 12 },
});
