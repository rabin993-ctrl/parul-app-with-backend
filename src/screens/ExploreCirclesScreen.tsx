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
  EXPLORE_FILTERS,
  ExploreFilterId,
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
  const { exploreCircles, exploreLoading, isJoined, isPending, joinCircle, getCircle } = usePawCircles();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ExploreFilterId>('all');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const tabBarPad = useTabBarScrollPadding();

  const results = useMemo(() => exploreCircles.filter(
    c => matchesFilter(c, filter) && matchesQuery(c, query),
  ), [exploreCircles, filter, query]);

  const pendingResults = useMemo(
    () => results.filter(c => isPending(c.id) && !isJoined(c.id)),
    [results, isPending, isJoined],
  );

  const availableResults = useMemo(
    () => results.filter(c => !isJoined(c.id) && !isPending(c.id)),
    [results, isJoined, isPending],
  );

  const joinedOnlyResults = useMemo(
    () => results.filter(c => isJoined(c.id)),
    [results, isJoined],
  );

  const hasListContent = pendingResults.length > 0
    || availableResults.length > 0
    || joinedOnlyResults.length > 0;

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

        {exploreLoading ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>Loading circles…</Text>
          </View>
        ) : !hasListContent ? (
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
          <>
            {availableResults.length > 0 ? (
              <>
                <PawCircleSectionLabel>
                  {query ? `Results for “${query}”` : 'Discover'}
                </PawCircleSectionLabel>
                <ExploreCircleList
                  circles={availableResults}
                  joiningId={joiningId}
                  onJoin={handleJoin}
                  cardState={() => ({ joined: false, requested: false })}
                />
              </>
            ) : null}

            {pendingResults.length > 0 ? (
              <>
                <View style={availableResults.length > 0 ? styles.sectionSpaced : undefined}>
                  <PawCircleSectionLabel>Pending approval</PawCircleSectionLabel>
                </View>
                <ExploreCircleList
                  circles={pendingResults}
                  joiningId={joiningId}
                  onJoin={handleJoin}
                  cardState={() => ({ joined: false, requested: true })}
                />
              </>
            ) : null}

            {joinedOnlyResults.length > 0 ? (
              <>
                <View style={(availableResults.length > 0 || pendingResults.length > 0) ? styles.sectionSpaced : undefined}>
                  <PawCircleSectionLabel>Your circles</PawCircleSectionLabel>
                </View>
                <ExploreCircleList
                  circles={joinedOnlyResults}
                  joiningId={joiningId}
                  onJoin={handleJoin}
                  cardState={() => ({ joined: true, requested: false })}
                />
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

function ExploreCircleList({
  circles,
  joiningId,
  onJoin,
  cardState,
}: {
  circles: PawCircle[];
  joiningId: string | null;
  onJoin: (id: string) => void;
  cardState: (circle: PawCircle) => { joined: boolean; requested: boolean };
}) {
  return (
    <View style={styles.flatList}>
      {circles.map((circle, index) => {
        const { joined, requested } = cardState(circle);
        return (
          <View key={circle.id}>
            <ExploreCircleCard
              circle={circle}
              joined={joined}
              requested={requested}
              loading={joiningId === circle.id}
              onJoin={() => onJoin(circle.id)}
            />
            {index < circles.length - 1 ? <PawCircleHairline inset={64} /> : null}
          </View>
        );
      })}
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
      {joined ? (
        <View style={[styles.statusPill, { backgroundColor: colors.successBg }]}>
          <Icon name="check" size={13} color={colors.success} />
          <Text style={[styles.statusPillText, { color: colors.success }]}>Joined</Text>
        </View>
      ) : requested ? (
        <View style={[styles.statusPill, styles.requestedPill, { backgroundColor: colors.warningBg, borderColor: colors.warning + '55' }]}>
          <Icon name="clock" size={13} color={colors.warning} />
          <Text style={[styles.statusPillText, { color: colors.warning }]}>Requested</Text>
        </View>
      ) : (
        <Button
          size="sm"
          variant="primary"
          loading={loading}
          onPress={onJoin}
          style={{ alignSelf: 'flex-start', marginTop: spacing.sm + 2 }}
        >
          Join circle
        </Button>
      )}
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
  sectionSpaced: { marginTop: spacing.lg },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: spacing.sm + 2,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  requestedPill: { borderWidth: 1 },
  statusPillText: { fontSize: 13.5, fontWeight: '700' },
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
