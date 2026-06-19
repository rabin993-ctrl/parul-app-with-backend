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
import { RescueCaseCard } from '../../components/rescue/RescueCaseCard';
import { RescueSpeciesRow } from '../../components/rescue/RescueChrome';
import { useRescueFeed } from '../../context/RescueFeedContext';
import { filterRescueCases, type RescueFilters } from '../../data/rescueData';
import type { RescueStackParamList } from '../../navigation/RescueNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useAuth } from '../../context/AuthContext';

type Route = RouteProp<RescueStackParamList, 'Search'>;
type Nav = NativeStackNavigationProp<RescueStackParamList, 'Search'>;

export function RescueSearchScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { species: initialSpecies } = useRoute<Route>().params;
  const { user } = useAuth();
  const { cases, isFollowing, toggleFollow } = useRescueFeed();
  const tabBarPad = useTabBarScrollPadding();

  const [query, setQuery] = useState('');
  const [species, setSpecies] = useState<RescueFilters['species']>(initialSpecies ?? 'all');

  const results = useMemo(
    () => filterRescueCases(cases, {
      query,
      filters: { species, status: 'all', scope: 'all' },
    }),
    [cases, query, species],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Search cases" onBack={() => navigation.goBack()} />

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, location, or case ID…"
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.text }]}
          autoFocus
        />
      </View>

      <RescueSpeciesRow active={species} onChange={setSpecies} />

      <FlatList
        data={results}
        keyExtractor={c => c.id}
        contentContainerStyle={{ paddingBottom: tabBarPad, gap: 14, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <RescueCaseCard
            item={item}
            following={isFollowing(item.id)}
            isOwner={!!user && item.userId === user.id}
            onPress={() => navigation.navigate('Detail', { caseId: item.id })}
            onFollow={() => toggleFollow(item.id)}
            onShare={() => {}}
          />
        )}
        ListEmptyComponent={
          <Empty icon="search" title={query ? 'No matches' : 'Start typing'}>
            {query ? 'Try another animal, neighbourhood, or case ID.' : 'Find open rescue cases near you or worldwide.'}
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
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
});
