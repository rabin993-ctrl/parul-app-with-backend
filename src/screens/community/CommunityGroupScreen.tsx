import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Button } from '../../components/ui/Button';
import { Empty } from '../../components/ui/Empty';
import { Toast, ToastData } from '../../components/ui/Toast';
import { Icon } from '../../components/icons/Icon';
import { PawCircleSubHeader } from '../pawCircles/PawCircleViews';
import { CommunityFeedPost } from '../../components/community/CommunityFeedPost';
import { CommunityCommentSheet } from '../../components/community/CommunityCommentSheet';
import { ForwardSheet, type ForwardDest } from '../../components/ForwardSheet';
import { CompanionProfileOverlay } from '../../components/CompanionProfileOverlay';
import { usePawCircles } from '../../context/PawCircleContext';
import { useCommunityFeed } from '../../context/CommunityFeedContext';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import {
  CommunityFeedFilter,
  filterCommunityPosts,
} from '../../data/communityPosts';
import type { CommunityStackParamList } from '../../navigation/CommunityNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Route = RouteProp<CommunityStackParamList, 'Group'>;
type Nav = NativeStackNavigationProp<CommunityStackParamList, 'Group'>;

export function CommunityGroupScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { communityId } = useRoute<Route>().params;
  const { posts, toggleHelpful, toggleSaved, addComment } = useCommunityFeed();
  const {
    getCommunity,
    toggleJoin,
    isMod,
    isAdmin,
    getPendingRequestCount,
    formatCommunityMemberLabel,
    joinedCommunities,
  } = useCommunityGroups();
  const { createdCircles, joinedCircles } = usePawCircles();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
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

  const community = getCommunity(communityId);
  const filter: CommunityFeedFilter = { groupId: communityId, topics: [] };

  const shown = useMemo(
    () => filterCommunityPosts(posts, { filter }),
    [posts, communityId],
  );

  if (!community) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <PawCircleSubHeader title="Group" onBack={() => navigation.goBack()} />
        <View style={styles.missing}>
          <Text style={{ color: colors.textSecondary }}>Group not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleJoin = () => {
    const willJoin = !community.joined;
    toggleJoin(communityId);
    setToast({
      msg: willJoin ? `Joined ${community.name}` : `Left ${community.name}`,
      icon: willJoin ? 'check' : 'close',
      tone: willJoin ? 'success' : 'neutral',
    });
  };

  const listHeader = (
    <View style={styles.header}>
      <View style={styles.heroCoverWrap}>
        <PhotoSlot height={120} imageKey={`group-cover-${communityId}`} borderRadius={radius.lg} label="" />
        <LinearGradient colors={[community.tint, community.tint + 'AA']} style={styles.heroIcon}>
          <Icon name={community.icon} size={32} color="#fff" />
        </LinearGradient>
      </View>
      <Text style={[styles.name, { color: colors.text }]}>{community.name}</Text>
      {isAdmin(communityId) && (
        <Text style={[styles.creatorBadge, { color: community.tint }]}>Creator</Text>
      )}
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {formatCommunityMemberLabel(communityId)} · {community.joined ? (isAdmin(communityId) ? 'You run this group' : 'Joined') : 'Public'}
      </Text>
      <Text style={[styles.about, { color: colors.textSecondary }]}>{community.about}</Text>
      <View style={styles.headerActions}>
        {isAdmin(communityId) ? (
          <>
            <Button
              size="sm"
              variant="primary"
              onPress={() => navigation.navigate('Admin', { communityId })}
            >
              Manage group
            </Button>
            {getPendingRequestCount(communityId) > 0 && (
              <Button
                size="sm"
                variant="soft"
                onPress={() => setToast({
                  msg: `${getPendingRequestCount(communityId)} pending requests`,
                  icon: 'clock',
                  tone: 'neutral',
                })}
              >
                Requests ({getPendingRequestCount(communityId)})
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant={community.joined ? 'outline' : 'primary'}
              onPress={handleJoin}
            >
              {community.joined ? 'Leave' : 'Join'}
            </Button>
            {isMod(communityId) && (
              <Button
                size="sm"
                variant="soft"
                onPress={() => navigation.navigate('Admin', { communityId })}
              >
                Manage
              </Button>
            )}
          </>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <PawCircleSubHeader title={community.name} onBack={() => navigation.goBack()} />

      <FlatList
        data={shown}
        keyExtractor={p => p.id}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: tabBarPad, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
        ItemSeparatorComponent={() => (
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        )}
        renderItem={({ item }) => (
          <CommunityFeedPost
            post={item}
            communityTint={community.tint}
            communityIcon={community.icon}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            onComments={() => setCommentPostId(item.id)}
            onCommunityPress={() => {}}
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
        )}
        ListEmptyComponent={
          <Empty title="No posts yet" icon="comment">
            Be the first to start a discussion in this group.
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

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center', gap: 6 },
  heroCoverWrap: {
    width: '100%',
    height: 120,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  creatorBadge: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  meta: { fontSize: 13 },
  about: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingHorizontal: 8 },
  headerActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  divider: { height: 1, marginHorizontal: 16 },
});
