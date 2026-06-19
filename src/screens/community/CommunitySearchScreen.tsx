import React, { useMemo, useState } from 'react';
import { View, TextInput, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Empty } from '../../components/ui/Empty';
import { Toast, ToastData } from '../../components/ui/Toast';
import { CommunityCommentSheet } from '../../components/community/CommunityCommentSheet';
import { ForwardSheet, type ForwardDest } from '../../components/ForwardSheet';
import { CompanionProfileOverlay } from '../../components/CompanionProfileOverlay';
import { usePawCircles } from '../../context/PawCircleContext';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { CommunityFeedPost } from '../../components/community/CommunityFeedPost';
import { CommunityLensChrome } from '../../components/community/CommunityChrome';
import { CommunityComposerBar } from '../../components/community/CommunityComposerBar';
import { useCommunityFeed } from '../../context/CommunityFeedContext';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import {
  CommunityFeedFilter,
  DEFAULT_COMMUNITY_FILTER,
  filterCommunityPosts,
} from '../../data/communityPosts';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Route = RouteProp<CommunityStackParamList, 'Search'>;
type Nav = NativeStackNavigationProp<CommunityStackParamList, 'Search'>;

export function CommunitySearchScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { filter: initialFilter } = useRoute<Route>().params;
  const { posts, toggleHelpful, toggleSaved, addComment } = useCommunityFeed();
  const { joinedCommunities, getCommunity } = useCommunityGroups();
  const { createdCircles, joinedCircles } = usePawCircles();
  const tabBarPad = useTabBarScrollPadding();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CommunityFeedFilter>(initialFilter ?? DEFAULT_COMMUNITY_FILTER);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [forwardPostId, setForwardPostId] = useState<string | null>(null);
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const joinedIds = joinedCommunities.map(c => c.id);

  const openUserProfile = (userId: string) => {
    navigation.getParent()?.navigate('Circles', {
      screen: 'UserProfile',
      params: { userId },
    });
  };

  const commentPost = useMemo(
    () => (commentPostId ? posts.find(p => p.id === commentPostId) ?? null : null),
    [commentPostId, posts],
  );

  const forwardPost = useMemo(
    () => (forwardPostId ? posts.find(p => p.id === forwardPostId) ?? null : null),
    [forwardPostId, posts],
  );

  const completeForward = (dests: ForwardDest[]) => {
    if (dests.length === 0) return;
    setForwardPostId(null);
    if (dests.length === 1 && dests[0].type === 'circle') {
      navigation.getParent()?.navigate('Circles', {
        screen: 'CircleChat',
        params: { circleId: dests[0].id },
      });
    }
    const label = dests.map(d => d.label).join(', ');
    setToast({ msg: `Shared to ${label}`, icon: 'forward', tone: 'success' });
  };

  const results = useMemo(
    () => filterCommunityPosts(posts, {
      filter,
      joinedGroupIds: joinedIds.length > 0 ? joinedIds : undefined,
      query,
    }),
    [posts, filter, query, joinedIds],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title="Search" onBack={() => navigation.goBack()} />

      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search discussions, topics, groups…"
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.text }]}
          autoFocus
        />
      </View>

      <CommunityLensChrome>
        <CommunityComposerBar
          hideComposer
          filter={filter}
          joinedGroups={joinedCommunities}
          onFilterChange={setFilter}
          onOpen={() => {}}
          onCategorySelect={() => {}}
        />
      </CommunityLensChrome>

      <FlatList
        data={results}
        keyExtractor={p => p.id}
        contentContainerStyle={{ paddingBottom: tabBarPad, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        )}
        renderItem={({ item }) => {
          const group = getCommunity(item.communityId);
          return (
            <CommunityFeedPost
              post={item}
              communityTint={group?.tint ?? '#7C5CBF'}
              communityIcon={group?.icon ?? 'communities'}
              onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
              onComments={() => setCommentPostId(item.id)}
              onCommunityPress={() => navigation.navigate('Group', { communityId: item.communityId })}
              onCompanionPress={setSelectedCompanionId}
              onHelpful={() => toggleHelpful(item.id)}
              onSave={() => toggleSaved(item.id)}
              onShare={() => setForwardPostId(item.id)}
            />
          );
        }}
        ListEmptyComponent={
          <Empty title={query ? 'No matches' : 'Start typing'} icon="search">
            {query ? 'Try different keywords or a broader filter.' : 'Find rescue updates, tips, and local events.'}
          </Empty>
        }
      />

      <CompanionProfileOverlay
        companionId={selectedCompanionId}
        onCompanionIdChange={setSelectedCompanionId}
        onOwnerPress={openUserProfile}
        onToast={setToast}
      />

      {commentPost && (
        <CommunityCommentSheet
          post={commentPost}
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          onClose={() => setCommentPostId(null)}
          onSubmit={(text, replyToThreadId) => addComment(commentPost.id, text, { replyToThreadId })}
          onToast={setToast}
        />
      )}

      {forwardPost && (
        <ForwardSheet
          visible
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          joinedCommunities={joinedCommunities}
          onClose={() => setForwardPostId(null)}
          onSelect={completeForward}
        />
      )}

      <Toast data={toast} onHide={() => setToast(null)} />
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
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  divider: { height: 1, marginHorizontal: 16 },
});
