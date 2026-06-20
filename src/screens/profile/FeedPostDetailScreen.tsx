import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Modal, KeyboardAvoidingView, Platform } from 'react-native';
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
import type { FeedPostDetailParams } from '../../navigation/feedHubNavigation';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';
import { navigateToUserProfileFromNested } from '../../navigation/userProfileRouting';
import {
  navigateToCompanionPostDetailFromNested,
} from '../../navigation/companionProfileRouting';
import { useFeedPostDetailBack } from '../../navigation/feedPostDetailBack';
import { isFeedAlertPost } from '../../navigation/feedPostRouting';

type Route = RouteProp<{ FeedPostDetail: FeedPostDetailParams & { returnTo?: keyof ProfileStackParamList } }, 'FeedPostDetail'>;
type Nav = NativeStackNavigationProp<{ FeedPostDetail: FeedPostDetailParams & { returnTo?: keyof ProfileStackParamList } }, 'FeedPostDetail'>;

function feedPostDetailTitle(post: Post | null): string {
  if (post?.label === 'lost' || post?.label === 'found') return 'Alert';
  return 'Post';
}

export function FeedPostDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const {
    postId,
    returnTo = 'Activity',
    scrollToComments: openCommentsOnMount,
  } = useRoute<Route>().params;
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
  } = useFeedPosts();
  const { createdCircles, joinedCircles } = usePawCircles();
  const { joinedCommunities } = useCommunityGroups();
  const [toast, setToast] = useState<ToastData | null>(null);
  const [forwardPost, setForwardPost] = useState<Post | null>(null);
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const [alertComposePost, setAlertComposePost] = useState<Post | null>(null);
  const [alertDmThread, setAlertDmThread] = useState<ChatThread | null>(null);
  const [pendingCommentsScroll, setPendingCommentsScroll] = useState(!!openCommentsOnMount);

  const post = useMemo(
    () => posts.find(p => p.id === postId) ?? null,
    [postId, posts],
  );
  const isAlertPost = post ? isFeedAlertPost(post) : false;

  const showToast = useCallback((t: ToastData) => setToast(t), []);

  const handleBack = useFeedPostDetailBack(returnTo);

  const handleCommentsLayout = useCallback((y: number) => {
    commentsOffsetY.current = y;
    if (!pendingCommentsScroll) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
      setPendingCommentsScroll(false);
    });
  }, [pendingCommentsScroll]);

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

  useEffect(() => {
    if (!openCommentsOnMount || !post || isAlertPost) return;
    setPendingCommentsScroll(true);
  }, [openCommentsOnMount, post?.id, isAlertPost]);

  const scrollToComments = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, commentsOffsetY.current - 8), animated: true });
  }, []);

  const headerTitle = feedPostDetailTitle(post);

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

  if (!post) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <ProfileSubHeader title={headerTitle} onBack={handleBack} />
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
      <ProfileSubHeader title={headerTitle} onBack={handleBack} />

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
            onCompanionPress={setSelectedCompanionId}
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
          <View
            onLayout={e => {
              handleCommentsLayout(e.nativeEvent.layout.y);
            }}
          >
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
          navigateToCompanionPostDetailFromNested(navigation, { postId, companionId });
        }}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  postSection: { gap: 6 },
  divider: { height: StyleSheet.hairlineWidth },
});
