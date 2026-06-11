import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { radius } from '../theme/tokens';
import { Button, IconButton } from '../components/ui/Button';
import { Icon } from '../components/icons/Icon';
import { HubToggleBar } from '../components/ui/HubToggleBar';
import { Toast, ToastData } from '../components/ui/Toast';
import { usePawCircles } from '../context/PawCircleContext';
import {
  EXPLORE_CIRCLES,
  EXPLORE_FILTERS,
  ExploreFilterId,
  LOCAL_PAW_CIRCLE,
  PawCircle,
} from '../data/pawCircles';
import { useTabBarScrollPadding } from '../navigation/tabBarInsets';

function matchesFilter(circle: PawCircle, filter: ExploreFilterId): boolean {
  if (filter === 'all') return true;
  if (filter === 'popular') {
    return circle.memberCount >= 200 || (circle.tags?.includes('popular') ?? false);
  }
  if (filter === 'nearby') {
    return circle.tags?.includes('nearby') ?? false;
  }
  return true;
}

function matchesQuery(circle: PawCircle, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    circle.name.toLowerCase().includes(q)
    || circle.location.toLowerCase().includes(q)
    || (circle.tagline?.toLowerCase().includes(q) ?? false)
  );
}

export function ExploreCirclesScreen() {
  const { colors, groupedBg } = useTheme();
  const navigation = useNavigation();
  const { exploreCircles, isJoined, joinCircle, getCircle } = usePawCircles();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ExploreFilterId>('all');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const tabBarPad = useTabBarScrollPadding();
  const catalog = useMemo(() => {
    const ids = new Set<string>();
    const list: PawCircle[] = [];
    for (const c of [LOCAL_PAW_CIRCLE, ...exploreCircles, ...EXPLORE_CIRCLES]) {
      if (!ids.has(c.id)) {
        ids.add(c.id);
        list.push(c);
      }
    }
    return list;
  }, [exploreCircles]);

  const featured = !isJoined(LOCAL_PAW_CIRCLE.id) ? LOCAL_PAW_CIRCLE : null;

  const results = useMemo(() => catalog.filter(
    c => c.id !== featured?.id && matchesFilter(c, filter) && matchesQuery(c, query),
  ), [catalog, featured, filter, query]);

  const handleJoin = async (id: string) => {
    setJoiningId(id);
    await joinCircle(id);
    const c = getCircle(id);
    setJoiningId(null);
    setToast({ msg: `Joined ${c?.name ?? 'circle'}!`, icon: 'check', tone: 'success' });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: groupedBg }]} edges={['top']}>
      <View style={styles.pageHeader}>
        <IconButton
          name="chevronLeft"
          size={40}
          tone="ghost"
          color={colors.text}
          onPress={() => navigation.goBack()}
        />
        <Text style={[styles.pageTitle, { color: colors.text }]}>Explore</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        style={{ backgroundColor: groupedBg }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.searchCard, { backgroundColor: colors.surface }]}>
          <Icon name="search" size={18} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search circles or areas"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon name="close" size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        <HubToggleBar
          items={[...EXPLORE_FILTERS]}
          value={filter}
          onChange={id => setFilter(id as ExploreFilterId)}
          bordered={false}
          style={styles.hubToggle}
        />

        {featured && !query && filter === 'all' && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>NEAR YOU</Text>
            <View style={[styles.cardShell, { backgroundColor: colors.surface }]}>
              <FeaturedCircleCard
                circle={featured}
                joined={isJoined(featured.id)}
                loading={joiningId === featured.id}
                onJoin={() => handleJoin(featured.id)}
              />
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
          {query ? `RESULTS FOR “${query.toUpperCase()}”` : 'DISCOVER'}
        </Text>

        {results.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="search" size={28} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No circles found</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Try a different search or filter to find pet parents near you.
            </Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {results.map(c => (
              <View key={c.id} style={[styles.cardShell, { backgroundColor: colors.surface }]}>
                <ExploreCircleCard
                  circle={c}
                  joined={isJoined(c.id)}
                  loading={joiningId === c.id}
                  onJoin={() => handleJoin(c.id)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

function FeaturedCircleCard({
  circle,
  joined,
  loading,
  onJoin,
}: {
  circle: PawCircle;
  joined: boolean;
  loading: boolean;
  onJoin: () => void;
}) {
  const { colors, iconBg } = useTheme();
  return (
    <View style={styles.featuredInner}>
      <View style={styles.featuredTop}>
        <View style={[styles.circleIcon, { backgroundColor: iconBg(circle.iconBg) }]}>
          <Icon name={circle.icon} size={22} color={circle.tint} fill={circle.icon === 'paw' ? circle.tint : 'none'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.featuredEyebrow, { color: colors.primary }]}>Your local circle</Text>
          <Text style={[styles.featuredName, { color: colors.text }]}>{circle.name}</Text>
          <Text style={[styles.featuredMeta, { color: colors.textSecondary }]}>
            {circle.location} · {circle.memberCount} members
          </Text>
        </View>
      </View>
      {circle.tagline && (
        <Text style={[styles.featuredTagline, { color: colors.textSecondary }]}>{circle.tagline}</Text>
      )}
      <Button
        variant={joined ? 'soft' : 'primary'}
        full
        disabled={joined}
        loading={loading}
        icon="paw"
        onPress={onJoin}
        style={{ marginTop: 12 }}
      >
        {joined ? 'Joined' : 'Join local circle'}
      </Button>
    </View>
  );
}

function ExploreCircleCard({
  circle,
  joined,
  loading,
  onJoin,
}: {
  circle: PawCircle;
  joined: boolean;
  loading: boolean;
  onJoin: () => void;
}) {
  const { colors, iconBg } = useTheme();
  const popular = circle.memberCount >= 200 || circle.tags?.includes('popular');

  return (
    <View style={styles.exploreInner}>
      <View style={styles.exploreTop}>
        <View style={[styles.circleIcon, { backgroundColor: iconBg(circle.iconBg) }]}>
          <Icon name={circle.icon} size={20} color={circle.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.exploreNameRow}>
            <Text style={[styles.exploreName, { color: colors.text }]} numberOfLines={1}>{circle.name}</Text>
            {popular && (
              <Text style={[styles.popularTag, { color: colors.textTertiary }]}>Popular</Text>
            )}
          </View>
          <Text style={[styles.exploreMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {circle.location} · {circle.memberCount} members
          </Text>
        </View>
      </View>
      {circle.tagline && (
        <Text style={[styles.exploreTagline, { color: colors.textSecondary }]}>{circle.tagline}</Text>
      )}
      <Button
        size="sm"
        variant={joined ? 'soft' : 'primary'}
        disabled={joined}
        loading={loading}
        onPress={onJoin}
        style={{ alignSelf: 'flex-start', marginTop: 10 }}
      >
        {joined ? 'Joined' : 'Join circle'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pageHeader: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 2,
    gap: 2,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  scroll: { paddingHorizontal: 16, gap: 12 },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.xl,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  hubToggle: {
    paddingHorizontal: 0,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginLeft: 4,
    marginTop: 6,
    marginBottom: -4,
  },
  cardList: { gap: 12 },
  cardShell: {
    borderRadius: radius.xl,
    padding: 14,
    overflow: 'hidden',
  },
  circleIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredInner: { gap: 0 },
  featuredTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  featuredEyebrow: { fontSize: 12, fontWeight: '700' },
  featuredName: { fontSize: 17, fontWeight: '800', marginTop: 2, letterSpacing: -0.3 },
  featuredMeta: { fontSize: 13, marginTop: 2 },
  featuredTagline: { fontSize: 13, lineHeight: 19, marginTop: 10 },
  exploreInner: { gap: 0 },
  exploreTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  exploreNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exploreName: { fontSize: 16, fontWeight: '700', flexShrink: 1, letterSpacing: -0.2 },
  popularTag: { fontSize: 12, fontWeight: '600' },
  exploreMeta: { fontSize: 13, marginTop: 2 },
  exploreTagline: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  empty: {
    alignItems: 'center',
    padding: 28,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyBody: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
