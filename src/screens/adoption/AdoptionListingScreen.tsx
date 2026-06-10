import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { AlertBanner } from '../../components/ui/AlertBanner';
import { Empty } from '../../components/ui/Empty';
import { Toast, ToastData } from '../../components/ui/Toast';
import { FlipAdoptionCard } from '../../components/adoption/FlipAdoptionCard';
import {
  AdoptionToolbar,
  AdoptionSpeciesRow,
  AdoptionFilterSheet,
  countActiveFilters,
  type AdoptionHubTab,
} from '../../components/adoption/AdoptionChrome';
import { useAdoptionFeed } from '../../context/AdoptionFeedContext';
import {
  DEFAULT_ADOPTION_FILTERS,
  AdoptionFilters,
  filterAdoptionListings,
} from '../../data/adoptionData';
import type { AdoptionStackParamList } from '../../navigation/AdoptionNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Nav = NativeStackNavigationProp<AdoptionStackParamList, 'Listing'>;

export function AdoptionListingScreen({
  embedded = false,
  scrollHeader,
}: {
  embedded?: boolean;
  scrollHeader?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { listings, savedIds, requests, toggleSaved, isSaved } = useAdoptionFeed();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();

  const [tab, setTab] = useState<AdoptionHubTab>('browse');
  const [species, setSpecies] = useState<AdoptionFilters['species']>('all');
  const [filters, setFilters] = useState<AdoptionFilters>(DEFAULT_ADOPTION_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 480);
    return () => clearTimeout(t);
  }, []);

  const shown = useMemo(() => {
    const base = filterAdoptionListings(listings, {
      filters: { ...filters, species },
    });
    if (tab === 'saved') return base.filter(l => savedIds.has(l.id));
    if (tab === 'requested') {
      const ids = new Set(requests.map(r => r.listingId));
      return base.filter(l => ids.has(l.id));
    }
    if (tab === 'my-listings') return base.filter(l => l.userId === 'you');
    return base;
  }, [listings, filters, species, tab, savedIds, requests]);

  const listHeader = (
    <View>
      {scrollHeader}
      <AdoptionToolbar
        tab={tab}
        onTabChange={setTab}
        onSearch={() => navigation.navigate('Search', { species })}
        onFilter={() => setFilterOpen(true)}
        onCreate={() => navigation.navigate('CreatePost')}
        activeFilterCount={countActiveFilters({ ...filters, species })}
      />
      {tab === 'browse' && (
        <AdoptionSpeciesRow active={species} onChange={setSpecies} />
      )}
      {tab === 'browse' && (
        <View style={styles.bannerWrap}>
          <AlertBanner
            tone="accent"
            icon="shield"
            title="Verified listings only"
            body="All pets here are from vetted rescues and certified adopters."
          />
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
        {listHeader}
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <FlatList
        data={shown}
        keyExtractor={l => l.id}
        nestedScrollEnabled={embedded}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: tabBarPad, gap: 14, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
        renderItem={({ item }) => (
          <FlipAdoptionCard
            listing={item}
            saved={isSaved(item.id)}
            onViewDetails={() => navigation.navigate('Detail', { listingId: item.id })}
            onRequest={() => {
              if (item.status === 'Adopted') {
                setToast({ msg: `${item.name} has already been adopted`, icon: 'adoption', tone: 'neutral' });
                return;
              }
              navigation.navigate('Apply', { listingId: item.id });
            }}
            onSave={() => {
              const wasSaved = isSaved(item.id);
              toggleSaved(item.id);
              setToast({
                msg: wasSaved ? `Removed ${item.name} from saved` : `Saved ${item.name}`,
                icon: 'heart',
                tone: 'accent',
              });
            }}
            onShare={() => setToast({ msg: 'Adoption link copied', icon: 'forward', tone: 'success' })}
          />
        )}
        ListEmptyComponent={
          <Empty
            icon={tab === 'saved' ? 'heart' : tab === 'requested' ? 'adoption' : 'adoption'}
            title={
              tab === 'saved' ? 'No saved pets yet'
                : tab === 'requested' ? 'No requests yet'
                  : tab === 'my-listings' ? 'No listings yet'
                    : 'No pets match'
            }
            body={
              tab === 'saved' ? 'Tap the heart on a card to save pets you love.'
                : tab === 'requested' ? 'Request adoption from a listing to track it here.'
                  : tab === 'my-listings' ? 'Create a listing to help a pet find a home.'
                    : 'Try adjusting filters or search for another area.'
            }
          />
        }
      />

      <AdoptionFilterSheet
        visible={filterOpen}
        filters={{ ...filters, species }}
        onChange={f => { setFilters(f); setSpecies(f.species); }}
        onClose={() => setFilterOpen(false)}
        onReset={() => {
          setFilters(DEFAULT_ADOPTION_FILTERS);
          setSpecies('all');
        }}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  bannerWrap: { paddingHorizontal: 16, marginBottom: 4 },
});
