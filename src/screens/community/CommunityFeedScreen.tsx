import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Empty } from '../../components/ui/Empty';
import { Button } from '../../components/ui/Button';
import { AppSubHeader } from '../../components/ui/AppSubHeader';
import { Toast, ToastData } from '../../components/ui/Toast';
import { CommunityFeedPost } from '../../components/community/CommunityFeedPost';
import { CommunityLensChrome } from '../../components/community/CommunityChrome';
import { CommunityComposerBar } from '../../components/community/CommunityComposerBar';
import { CommunityCommentSheet } from '../../components/community/CommunityCommentSheet';
import { ForwardSheet, type ForwardDest } from '../../components/ForwardSheet';
import { CompanionProfileOverlay } from '../../components/CompanionProfileOverlay';
import { usePawCircles } from '../../context/PawCircleContext';
import { useCommunityFeed } from '../../context/CommunityFeedContext';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import {
  CommunityFeedFilter,
  DEFAULT_COMMUNITY_FILTER,
  filterCommunityPosts,
} from '../../data/communityPosts';
import { useFeedPosts } from '../../context/FeedPostContext';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';
import { useAdopterPublicFlags } from '../../hooks/useAdopterPublicFlags';

type Nav = NativeStackNavigationProp<CommunityStackParamList, 'Feed'>;

export function CommunityFeedScreen({
  embedded = false,
  scrollHeader,
  initialFilter,
}: {
  embedded?: boolean;
  scrollHeader?: React.ReactNode;
  initialFilter?: CommunityFeedFilter;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { posts, toggleHelpful, toggleSaved, addComment } = useCommunityFeed();
  const { openComposer, openCaseFlow, openAdoptionListing } = useFeedPosts();
  const { joinedCommunities, getCommunity } = useCommunityGroups();
  const { createdCircles, joinedCircles } = usePawCircles();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();

  const [filter, setFilter] = useState<CommunityFeedFilter>(initialFilter ?? DEFAULT_COMMUNITY_FILTER);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [forwardPostId, setForwardPostId] = useState<string | null>(null);
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);

  const commentPost = useMemo(
    () => (commentPostId ? posts.find(p => p.id === commentPostId) ?? null : null),
    [commentPostId, posts],
  );

  const forwardPost = useMemo(
    () => (forwardPostId ? posts.find(p => p.id === forwardPostId) ?? null : null),
    [forwardPostId, posts],
  );

  const openUserProfile = (userId: string) => {
    navigation.getParent()?.navigate('Circles', {
      screen: 'UserProfile',
      params: { userId },
    });
  };

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

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  const joinedIds = joinedCommunities.map(c => c.id);

  const openCommunityComposer = (initialCategory: string) => {
    openComposer({
      initialCategory,
      defaultDestination: 'community',
      preferredCommunityGroupId: filter.groupId !== 'all' ? filter.groupId : undefined,
    });
  };

  const handleCategorySelect = (category: string) => {
    if (category === 'adoption') {
      openAdoptionListing();
      return;
    }
    openCommunityComposer(category);
  };

  const shown = useMemo(
    () => filterCommunityPosts(posts, {
      filter,
      joinedGroupIds: joinedIds.length > 0 ? joinedIds : undefined,
    }),
    [posts, filter, joinedIds],
  );

  const communityAuthorIds = useMemo(
    () => [...new Set(shown.map(post => post.authorId).filter(Boolean))],
    [shown],
  );
  useAdopterPublicFlags(communityAuthorIds);

  const pageHeader = !embedded ? (
    <AppSubHeader
      title="Community"
      onBack={() => navigation.getParent()?.navigate('Feed', { screen: 'FeedHome' })}
      rightIcon="search"
      onRightPress={() => navigation.navigate('Search', { filter })}
    />
  ) : null;

  const listHeader = (
    <View>
      {scrollHeader}
      {pageHeader}
      <CommunityLensChrome>
        <CommunityComposerBar
          hideComposer={embedded}
          filter={filter}
          joinedGroups={joinedCommunities}
          onFilterChange={setFilter}
          onOpen={() => openCommunityComposer('discussion')}
          onCategorySelect={handleCategorySelect}
          onOpenCase={openCaseFlow}
        />
      </CommunityLensChrome>
    </View>
  );

  const overlays = (
    <>
      {commentPost && (
        <CommunityCommentSheet
          post={commentPost}
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          onClose={() => setCommentPostId(null)}
          onSubmit={(text, replyToThreadId) => addComment(commentPost.id, text, { replyToThreadId })}
          onToast={setToast}
          onAuthorPress={openUserProfile}
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

      <CompanionProfileOverlay
        companionId={selectedCompanionId}
        onCompanionIdChange={setSelectedCompanionId}
        onOwnerPress={openUserProfile}
        onToast={setToast}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </>
  );

  const Root = embedded ? View : SafeAreaView;
  const rootProps = embedded
    ? { style: [styles.wrap, { backgroundColor: colors.bg }] }
    : { style: [styles.wrap, { backgroundColor: colors.bg }], edges: ['top'] as const };

  if (loading) {
    return (
      <Root {...rootProps}>
        {listHeader}
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        {overlays}
      </Root>
    );
  }

  return (
    <Root {...rootProps}>
      <FlatList
        data={shown}
        keyExtractor={p => p.id}
        nestedScrollEnabled={embedded}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: tabBarPad, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
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
              onPress={() => setCommentPostId(item.id)}
              onComments={() => setCommentPostId(item.id)}
              onCommunityPress={() => navigation.navigate('Group', { communityId: item.communityId })}
              onCompanionPress={setSelectedCompanionId}
              onAuthorPress={openUserProfile}
              onHelpful={() => toggleHelpful(item.id)}
              onSave={() => {
                const nowSaved = toggleSaved(item.id);
                setToast({
                  msg: nowSaved ? 'Post saved' : 'Removed from saved',
                  icon: 'bookmark',
                  tone: 'neutral',
                });
              }}
              onShare={() => setForwardPostId(item.id)}
            />
          );
        }}
        ListEmptyComponent={
          joinedIds.length === 0
            ? (
              <Empty
                title="Join a group"
                icon="communities"
                body="Discover public groups to start seeing discussions."
                action={(
                  <Button variant="primary" onPress={() => navigation.navigate('Discover')}>
                    Discover groups
                  </Button>
                )}
              />
            )
            : (
              <Empty title="No discussions yet" icon="comment">
                Try another filter or start the conversation.
              </Empty>
            )
        }
      />

      {overlays}
    </Root>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  divider: { height: 1, marginHorizontal: 16 },
});
