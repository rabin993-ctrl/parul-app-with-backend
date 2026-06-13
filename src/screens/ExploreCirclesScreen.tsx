import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';
import { Button } from '../components/ui/Button';
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
import {
  PawCircleHairline,
  PawCirclePageHeader,
  PawCircleSearchField,
  PawCircleSectionLabel,
  pawCircleStyles,
} from './pawCircles/PawCircleChrome';

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
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { exploreCircles, isJoined, isPending, joinCircle, getCircle } = usePawCircles();
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
    const c = getCircle(id);
    setJoiningId(id);
    await joinCircle(id);
    setJoiningId(null);
    if (c?.privacy === 'request') {
      setToast({ msg: `Request sent to ${c?.name ?? 'circle'}!`, icon: 'check', tone: 'success' });
    } else {
      setToast({ msg: `Joined ${c?.name ?? 'circle'}!`, icon: 'check', tone: 'success' });
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCirclePageHeader title="Explore" />

      <ScrollView
        contentContainerStyle={[pawCircleStyles.pageScroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PawCircleSearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search circles or areas"
          onClear={() => setQuery('')}
        />

        <HubToggleBar
          items={[...EXPLORE_FILTERS]}
          value={filter}
          onChange={id => setFilter(id as ExploreFilterId)}
          bordered={false}
          style={styles.hubToggle}
        />

        {featured && !query && filter === 'all' && (
          <>
            <PawCircleSectionLabel>Near you</PawCircleSectionLabel>
            <FeaturedCircleCard
              circle={featured}
              joined={isJoined(featured.id)}
              requested={isPending(featured.id)}
              loading={joiningId === featured.id}
              onJoin={() => handleJoin(featured.id)}
            />
            <PawCircleHairline />
          </>
        )}

        <PawCircleSectionLabel>
          {query ? `Results for “${query}”` : 'Discover'}
        </PawCircleSectionLabel>

        {results.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '14' }]}>
              <Icon name="search" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No circles found</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Try a different search or filter to find pet parents near you.
            </Text>
          </View>
        ) : (
          <View style={styles.flatList}>
            {results.map((c, index) => (
              <View key={c.id}>
                <ExploreCircleCard
                  circle={c}
                  joined={isJoined(c.id)}
                  requested={isPending(c.id)}
                  loading={joiningId === c.id}
                  onJoin={() => handleJoin(c.id)}
                />
                {index < results.length - 1 && <PawCircleHairline inset={64} />}
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
  requested,
  loading,
  onJoin,
}: {
  circle: PawCircle;
  joined: boolean;
  requested: boolean;
  loading: boolean;
  onJoin: () => void;
}) {
  const { colors, iconBg } = useTheme();
  return (
    <View style={styles.cardInner}>
      <View style={styles.cardTop}>
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
        variant={joined || requested ? 'soft' : 'primary'}
        full
        disabled={joined || requested}
        loading={loading}
        icon="paw"
        onPress={onJoin}
        style={{ marginTop: spacing.md }}
      >
        {joined ? 'Joined' : requested ? 'Requested' : 'Join local circle'}
      </Button>
    </View>
  );
}

function ExploreCircleCard({
  circle,
  joined,
  requested,
  loading,
  onJoin,
}: {
  circle: PawCircle;
  joined: boolean;
  requested: boolean;
  loading: boolean;
  onJoin: () => void;
}) {
  const { colors, iconBg } = useTheme();
  const popular = circle.memberCount >= 200 || circle.tags?.includes('popular');

  return (
    <View style={styles.cardInner}>
      <View style={styles.cardTop}>
        <View style={[styles.circleIcon, { backgroundColor: iconBg(circle.iconBg) }]}>
          <Icon name={circle.icon} size={20} color={circle.tint} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.exploreNameRow}>
            <Text style={[styles.exploreName, { color: colors.text }]} numberOfLines={1}>{circle.name}</Text>
            {popular && (
              <View style={[styles.popularTag, { backgroundColor: colors.primary + '14' }]}>
                <Text style={[styles.popularTagText, { color: colors.primary }]}>Popular</Text>
              </View>
            )}
          </View>
          <Text style={[styles.exploreMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {circle.location} · {circle.memberCount} members
          </Text>
        </View>
      </View>
      {circle.tagline && (
        <Text style={[styles.exploreTagline, { color: colors.textSecondary }]} numberOfLines={2}>
          {circle.tagline}
        </Text>
      )}
      <Button
        size="sm"
        variant={joined || requested ? 'soft' : 'primary'}
        disabled={joined || requested}
        loading={loading}
        onPress={onJoin}
        style={{ alignSelf: 'flex-start', marginTop: spacing.sm + 2 }}
      >
        {joined ? 'Joined' : requested ? 'Requested' : 'Join circle'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hubToggle: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: spacing.xs,
  },
  flatList: { gap: 0 },
  cardInner: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  circleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredEyebrow: { ...typography.caption },
  featuredName: { ...typography.title, fontSize: 17, marginTop: 2 },
  featuredMeta: { ...typography.small, marginTop: 2 },
  featuredTagline: { ...typography.small, lineHeight: 19 },
  exploreNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  exploreName: { ...typography.title, flexShrink: 1 },
  popularTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  popularTagText: { fontSize: 11, fontWeight: '700' },
  exploreMeta: { ...typography.small, marginTop: 2 },
  exploreTagline: { ...typography.small, lineHeight: 18 },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl3,
    paddingHorizontal: spacing.xl2,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { ...typography.title },
  emptyBody: { ...typography.small, textAlign: 'center' },
});
