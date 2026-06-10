import React, { useMemo, useState } from 'react';
import { View, TextInput, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Empty } from '../../components/ui/Empty';
import { Icon } from '../../components/icons/Icon';
import { SlidingSegmentControl } from '../../components/ui/SlidingSegmentControl';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { VetListCard } from '../../components/vet/VetChrome';
import { DEMO_VETS, filterVets } from '../../data/vetData';
import type { VetStackParamList } from '../../navigation/VetNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Nav = NativeStackNavigationProp<VetStackParamList, 'Browse'>;

export function VetBrowseScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('available');

  const vets = useMemo(
    () => filterVets(DEMO_VETS, { query, availableOnly: filter === 'available' }),
    [query, filter],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Choose a vet" onBack={() => navigation.goBack()} />

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or specialty…"
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      <View style={styles.segment}>
        <SlidingSegmentControl
          items={[
            { id: 'available', label: 'Available' },
            { id: 'all', label: 'All vets' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      <FlatList
        data={vets}
        keyExtractor={v => v.id}
        contentContainerStyle={{ padding: 16, paddingBottom: tabBarPad, gap: 10, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <VetListCard
            vet={item}
            onPress={() => navigation.navigate('VetProfile', { vetId: item.id })}
          />
        )}
        ListEmptyComponent={
          <Empty icon="medical" title="No vets found" body="Try a different search or check back soon." />
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
  segment: { paddingHorizontal: 16, marginBottom: 4 },
});
