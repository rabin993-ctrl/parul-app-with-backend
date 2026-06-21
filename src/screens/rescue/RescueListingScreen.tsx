import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Empty } from '../../components/ui/Empty';
import { Toast, ToastData } from '../../components/ui/Toast';
import { FeedPostCard } from '../../components/feed/FeedPostCard';
import { RescueCaseCard } from '../../components/rescue/RescueCaseCard';
import { MyRescueCaseCard } from '../../components/rescue/MyRescueCaseCard';
import {
  RescueHubBar,
  RescueFilterField,
} from '../../components/rescue/RescueChrome';
import { useRescueFeed } from '../../context/RescueFeedContext';
import { useFeedPosts } from '../../context/FeedPostContext';
import {
  DEFAULT_RESCUE_FILTERS,
  filterRescueCases,
  filterRescueFeedPosts,
  type RescueFilters,
  type RescueHubTab,
} from '../../data/rescueData';
import type { RescueStackParamList } from '../../navigation/RescueNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';
import type { Post } from '../../data/mockData';
import { ALL_RESCUE_CASES } from '../../data/rescueData';
import { RescueOpenCaseFab } from '../../components/rescue/RescueCreateActions';
import { ForwardSheet } from '../../components/ForwardSheet';
import { useRescueCaseShare } from '../../hooks/useRescueCaseShare';
import { useAuth } from '../../context/AuthContext';

type Nav = NativeStackNavigationProp<RescueStackParamList, 'Listing'>;

type ListItem =
  | { kind: 'case'; id: string; caseId: string }
  | { kind: 'post'; id: string; post: Post };

export function RescueListingScreen({
  embedded = false,
  scrollHeader,
  openCreateOnMount = false,
  onOpenCreateHandled,
  hubTab: hubTabProp,
  onHubTabChange,
  hubBarPinned = false,
  filters: filtersProp,
  onFiltersChange,
}: {
  embedded?: boolean;
  scrollHeader?: React.ReactNode;
  openCreateOnMount?: boolean;
  onOpenCreateHandled?: () => void;
  hubTab?: RescueHubTab;
  onHubTabChange?: (tab: RescueHubTab) => void;
  hubBarPinned?: boolean;
  filters?: RescueFilters;
  onFiltersChange?: (filters: RescueFilters) => void;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { cases, followedIds, isFollowing, toggleFollow } = useRescueFeed();
  const { posts, openCaseFlow } = useFeedPosts();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const listScrollPad = tabBarPad + 48;

  const [tabInternal, setTabInternal] = useState<RescueHubTab>('browse');
  const tab = hubTabProp ?? tabInternal;
  const setTab = onHubTabChange ?? setTabInternal;
  const [filtersInternal, setFiltersInternal] = useState<RescueFilters>(DEFAULT_RESCUE_FILTERS);
  const filters = filtersProp ?? filtersInternal;
  const setFilters = onFiltersChange ?? setFiltersInternal;
  const filterPinned = hubBarPinned && filtersProp !== undefined;
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((t: ToastData) => setToast(t), []);
  const {
    shareOpen,
    openShare,
    closeShare,
    completeShare,
    createdCircles,
    joinedCircles,
    joinedCommunities,
  } = useRescueCaseShare(showToast);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 420);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!openCreateOnMount) return;
    navigation.navigate('CreateCase');
    onOpenCreateHandled?.();
  }, [openCreateOnMount, navigation, onOpenCreateHandled]);

  const handleOpenCase = () => {
    if (embedded) {
      openCaseFlow();
      return;
    }
    navigation.navigate('CreateCase');
  };

  const shownCases = useMemo(
    () => filterRescueCases(cases, { filters, tab, followedIds, currentUserId: user?.id }),
    [cases, filters, tab, followedIds, user?.id],
  );

  const visibleCaseIds = useMemo(
    () => new Set(shownCases.map(c => c.id)),
    [shownCases],
  );

  const postIdToCaseId = useMemo(() => {
    const map = new Map<string, string>();
    cases.forEach(c => {
      if (c.postId) map.set(c.postId, c.id);
    });
    return map;
  }, [cases]);

  const showCases = filters.contentType !== 'rescue';
  const showRescuePosts = tab === 'browse' && filters.contentType !== 'cases';

  const rescueFeedPosts = useMemo(() => {
    if (!showRescuePosts) return [];
    const dedupeAgainstCases = showCases && showRescuePosts && filters.contentType !== 'all';
    return filterRescueFeedPosts(posts, {
      filters,
      postIdToCaseId,
      visibleCaseIds,
      dedupeAgainstCases,
    });
  }, [posts, showRescuePosts, filters, postIdToCaseId, visibleCaseIds, showCases]);

  const listData: ListItem[] = useMemo(() => {
    const items: ListItem[] = [];
    if (showCases) {
      shownCases.forEach(c => items.push({ kind: 'case', id: c.id, caseId: c.id }));
    }
    rescueFeedPosts.forEach(p => items.push({ kind: 'post', id: `post-${p.id}`, post: p }));
    return items;
  }, [shownCases, rescueFeedPosts, showCases]);

  const listHeader = (
    <View style={styles.listHeader}>
      {scrollHeader}
      {!hubBarPinned && <RescueHubBar tab={tab} onTabChange={setTab} />}
      {tab === 'browse' && !filterPinned && (
        <RescueFilterField
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(DEFAULT_RESCUE_FILTERS)}
        />
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
        {!hubBarPinned ? listHeader : scrollHeader}
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
        <RescueOpenCaseFab onPress={handleOpenCase} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <FlatList
        data={listData}
        keyExtractor={item => item.id}
        nestedScrollEnabled={embedded}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{
          paddingBottom: listScrollPad,
          gap: tab === 'my-cases' ? 0 : 14,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
        renderItem={({ item }) => {
          if (item.kind === 'post') {
            return (
              <View style={styles.postWrap}>
                <FeedPostCard
                  post={item.post}
                  onPaw={() => {}}
                  onSave={() => {}}
                  onComments={() => {}}
                  onForward={() => setToast({ msg: 'Post shared', icon: 'forward', tone: 'success' })}
                />
              </View>
            );
          }
          const rescueCase = cases.find(c => c.id === item.caseId) ?? ALL_RESCUE_CASES.find(c => c.id === item.caseId);
          if (!rescueCase) return null;
          if (tab === 'my-cases') {
            const idx = shownCases.findIndex(c => c.id === rescueCase.id);
            return (
              <MyRescueCaseCard
                item={rescueCase}
                showDivider={idx < shownCases.length - 1}
                onPress={() => navigation.navigate('Detail', { caseId: rescueCase.id })}
              />
            );
          }

          return (
            <RescueCaseCard
              item={rescueCase}
              following={isFollowing(rescueCase.id)}
              isOwner={!!user && rescueCase.userId === user.id}
              onPress={() => navigation.navigate('Detail', { caseId: rescueCase.id })}
              onFollow={() => {
                const was = isFollowing(rescueCase.id);
                toggleFollow(rescueCase.id);
                setToast({
                  msg: was ? 'Unfollowed case' : `Following ${rescueCase.name}`,
                  icon: 'paw',
                  tone: 'primary',
                });
              }}
              onShare={() => openShare(rescueCase)}
            />
          );
        }}
        ListEmptyComponent={
          <Empty
            icon={tab === 'following' ? 'paw-line' : 'shield'}
            title={
              tab === 'following' ? 'Not following any cases'
                : tab === 'my-cases' ? 'No cases yet'
                  : filters.contentType === 'rescue' ? 'No rescue posts'
                    : filters.contentType === 'cases' ? 'No cases match'
                      : filters.scope === 'nearby' ? 'Nothing near you yet'
                        : 'No results match'
            }
            body={
              tab === 'following' ? 'Tap Follow on a case to track it here.'
                : tab === 'my-cases' ? 'Use + → Open a case to start one.'
                  : filters.contentType === 'rescue' ? 'Try Everywhere or check back for new rescue posts.'
                    : filters.contentType === 'cases' ? 'Try a different status, animal, or area.'
                      : 'Try Everywhere, a different type, or animal filter.'
            }
          />
        }
      />

      <RescueOpenCaseFab onPress={handleOpenCase} />

      <ForwardSheet
        visible={shareOpen}
        createdCircles={createdCircles}
        joinedCircles={joinedCircles}
        joinedCommunities={joinedCommunities}
        onClose={closeShare}
        onSelect={completeShare}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, position: 'relative' },
  listHeader: { gap: 4 },
  postWrap: { marginHorizontal: 0 },
});
