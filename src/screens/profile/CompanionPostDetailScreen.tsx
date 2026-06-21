import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Empty } from '../../components/ui/Empty';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import { FeedPostItem } from '../../components/feed/FeedPostItem';
import { FeedCommentThread } from '../../components/feed/FeedCommentThread';
import { AlertMessageSheet } from '../../components/feed/AlertMessageSheet';
import { ForwardSheet, type ForwardDest } from '../../components/ForwardSheet';
import { CompanionProfileOverlay } from '../../components/CompanionProfileOverlay';
import { ChatThreadScreen } from '../ChatThreadScreen';
import { useFeedPosts } from '../../context/FeedPostContext';
import { usePawCircles } from '../../context/PawCircleContext';
import { useCommunityGroups } from '../../context/CommunityGroupsContext';
import { useAuth } from '../../context/AuthContext';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import type { Post } from '../../data/mockData';
import type { ChatThread } from '../../context/AdoptionContext';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';
import { navigateToUserProfileFromNested } from '../../navigation/userProfileRouting';
import { isFeedAlertPost } from '../../navigation/feedPostRouting';
import { supabase } from '../../lib/supabase';
import { FEED_SELECT, postsFromDbRows, type DbPostRow } from '../../hooks/useFeedQuery';

type Route = RouteProp<ProfileStackParamList, 'CompanionPostDetail'>;
type Nav = NativeStackNavigationProp<ProfileStackParamList, 'CompanionPostDetail'>;

async function fetchCompanionPost(postId: string, userId: string): Promise<Post | null> {
  const { data } = await supabase
    .from('posts')
    .select(FEED_SELECT)
    .eq('id', postId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!data) return null;
  const [post] = await postsFromDbRows([data as unknown as DbPostRow], userId);
  return post ?? null;
}

export function CompanionPostDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { postId, companionId } = useRoute<Route>().params;
  const { user } = useAuth();
  const { me } = useCurrentUserProfile();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const scrollRef = useRef<ScrollView>(null);
  const commentsOffsetY = useRef(0);
  const {
    posts,
    setPosts,
    togglePaw,
    toggleSaved,
    addComment,
    pawComment,
    persistForward,
    deletePost,
    openComposerForEdit,
    resolveAlert,
    ensureFeedPost,
  } = useFeedPosts();
  const { createdCircles, joinedCircles } = usePawCircles();
  const { joinedCommunities } = useCommunityGroups();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [forwardPost, setForwardPost] = useState<Post | null>(null);
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const [alertComposePost, setAlertComposePost] = useState<Post | null>(null);
  const [alertDmThread, setAlertDmThread] = useState<ChatThread | null>(null);
  const [fetchedPost, setFetchedPost] = useState<Post | null>(null);
  const [fetching, setFetching] = useState(false);

  const contextPost = useMemo(
    () => posts.find(p => p.id === postId) ?? null,
    [postId, posts],
  );

  const post = contextPost ?? fetchedPost;

  useEffect(() => {
    if (contextPost || !user?.id) return;
    let cancelled = false;
    setFetching(true);
    fetchCompanionPost(postId, user.id).then(loaded => {
      if (cancelled) return;
      if (loaded) {
        setFetchedPost(loaded);
        ensureFeedPost(loaded);
      }
      setFetching(false);
    });
    return () => { cancelled = true; };
  }, [contextPost, ensureFeedPost, postId, user?.id]);

  const isAlertPost = post ? isFeedAlertPost(post) : false;
  const showToast = useCallback((t: ToastData) => setToast(t), []);
  const currentUserId = me.id || user?.id;

  const openUserProfile = useCallback((userId: string) => {
    navigateToUserProfileFromNested(navigation, userId, currentUserId);
  }, [currentUserId, navigation]);

  const handleSave = useCallback((id: string) => {
    const nowSaved = toggleSaved(id);
    showToast({
      msg: nowSaved ? 'Saved to your collection' : 'Removed from saved',
      icon: 'bookmark',
      tone: 'primary',
    });
  }, [showToast, toggleSaved]);

  const scrollToComments = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, commentsOffsetY.current - 8), animated: true });
  }, []);

  const completeForward = useCallback((dests: ForwardDest[], note?: string) => {
    if (!forwardPost || dests.length === 0) return;
    setPosts(ps => ps.map(p => (
      p.id === forwardPost.id ? { ...p, forwards: p.forwards + dests.length } : p
    )));
    persistForward(forwardPost.id, dests, forwardPost.text, forwardPost.label, note);
    setForwardPost(null);
    const label = dests.map(d => d.label).join(', ');
    showToast({ msg: `Shared to ${label}`, icon: 'forward', tone: 'success' });
  }, [forwardPost, persistForward, setPosts, showToast]);

  const handleDelete = useCallback(() => {
    if (!post) return;
    deletePost(post.id);
    showToast({ msg: 'Post deleted', icon: 'check', tone: 'success' });
    navigation.goBack();
  }, [deletePost, navigation, post, showToast]);

  const handleResolveAlert = useCallback((target: Post) => {
    resolveAlert(target.id);
    const companion = target.companionName ?? 'Companion';
    const isFound = target.label === 'found' && !!target.found;
    showToast({
      msg: isFound
        ? `${companion} marked as reunited with their owner`
        : `${companion} marked as returned home`,
      icon: 'check',
      tone: 'success',
    });
  }, [resolveAlert, showToast]);

  const handleOpenAlertDm = useCallback((target: Post) => {
    if (!user) return;
    if (target.userId === user.id) {
      showToast({ msg: "This is your alert — others can message you here", icon: 'message', tone: 'neutral' });
      return;
    }
    setAlertComposePost(target);
  }, [showToast, user]);

  if (fetching && !post) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <ProfileSubHeader title="Post" onBack={() => navigation.goBack()} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <ProfileSubHeader title="Post" onBack={() => navigation.goBack()} />
        <Empty
          icon="comment"
          title="Post unavailable"
          body="This post may have been removed."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Post" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          {...tabBarScrollProps}
        >
          <View style={styles.postSection}>
            <FeedPostItem
              post={post}
              compact
              onPaw={() => togglePaw(post.id)}
              onSave={() => handleSave(post.id)}
              onComments={isAlertPost ? () => {} : scrollToComments}
              onForward={() => setForwardPost(post)}
              onUserPress={openUserProfile}
              onCompanionPress={id => {
                if (id !== companionId) setSelectedCompanionId(id);
              }}
              onEdit={() => openComposerForEdit(post)}
              onDelete={handleDelete}
              onMessage={handleOpenAlertDm}
              onResolve={handleResolveAlert}
              onToast={showToast}
            />
            {!isAlertPost ? (
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            ) : null}
          </View>

          {!isAlertPost ? (
            <View onLayout={e => { commentsOffsetY.current = e.nativeEvent.layout.y; }}>
              <FeedCommentThread
                post={post}
                createdCircles={createdCircles}
                joinedCircles={joinedCircles}
                onSubmit={(text, replyToThreadIndex) => addComment(post.id, text, { replyToThreadIndex })}
                onCommentPaw={threadIdx => pawComment(post.id, threadIdx)}
                onToast={showToast}
                onAuthorPress={openUserProfile}
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {forwardPost && (
        <ForwardSheet
          visible
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          joinedCommunities={joinedCommunities}
          onClose={() => setForwardPost(null)}
          onSelect={completeForward}
        />
      )}

      <AlertMessageSheet
        post={alertComposePost}
        onClose={() => setAlertComposePost(null)}
        onSent={thread => {
          setAlertDmThread(thread);
          showToast({ msg: 'Message sent', icon: 'check', tone: 'success' });
        }}
        onError={msg => showToast({ msg, icon: 'close', tone: 'danger' })}
      />

      <Modal visible={!!alertDmThread} animationType="slide" onRequestClose={() => setAlertDmThread(null)}>
        {alertDmThread ? (
          <ChatThreadScreen thread={alertDmThread} onClose={() => setAlertDmThread(null)} />
        ) : null}
      </Modal>

      <CompanionProfileOverlay
        companionId={selectedCompanionId}
        onCompanionIdChange={setSelectedCompanionId}
        onOwnerPress={openUserProfile}
        onToast={showToast}
        onOpenPostDetail={(postId, companionId) => {
          navigation.push('CompanionPostDetail', { postId, companionId });
        }}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  postSection: { gap: 6 },
  divider: { height: StyleSheet.hairlineWidth },
});
