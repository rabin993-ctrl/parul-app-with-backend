import React, { useMemo, useState } from 'react';
import { View, TextInput, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Empty } from '../../components/ui/Empty';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { AdoptionListingRow } from '../../components/adoption/AdoptionListingRow';
import { AdoptionSpeciesRow } from '../../components/adoption/AdoptionChrome';
import { useAdoptionFeed } from '../../context/AdoptionFeedContext';
import { AdoptionFilters, filterAdoptionListings } from '../../data/adoptionData';
import type { AdoptionStackParamList } from '../../navigation/AdoptionNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Route = RouteProp<AdoptionStackParamList, 'Search'>;
type Nav = NativeStackNavigationProp<AdoptionStackParamList, 'Search'>;

export function AdoptionSearchScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { species: initialSpecies } = useRoute<Route>().params;
  const { listings, isSaved, toggleSaved } = useAdoptionFeed();
  const tabBarPad = useTabBarScrollPadding();

  const [query, setQuery] = useState('');
  const [species, setSpecies] = useState<AdoptionFilters['species']>(initialSpecies ?? 'all');

  const results = useMemo(
    () => filterAdoptionListings(listings, { query, filters: { species, status: 'all' } }),
    [listings, query, species],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Search" onBack={() => navigation.goBack()} />

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, breed, or location…"
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.text }]}
          autoFocus
        />
      </View>

      <AdoptionSpeciesRow active={species} onChange={setSpecies} />

      <FlatList
        data={results}
        keyExtractor={l => l.id}
        contentContainerStyle={{ paddingBottom: tabBarPad, paddingTop: 4, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <AdoptionListingRow
            listing={item}
            saved={isSaved(item.id)}
            onPress={() => navigation.navigate('Detail', { listingId: item.id })}
            onSave={() => toggleSaved(item.id)}
          />
        )}
        ListEmptyComponent={
          <Empty icon="search" title={query ? 'No matches' : 'Start typing'}>
            {query ? 'Try a different breed or neighbourhood.' : 'Find pets ready for their forever home.'}
          </Empty>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
});
