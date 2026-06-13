import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Empty } from '../../components/ui/Empty';
import { Toast, ToastData } from '../../components/ui/Toast';
import { ProfileSubHeader, ProfileCommentsFeed } from '../../components/profile/ProfileChrome';
import { FeedCommentSheet } from '../../components/feed/FeedCommentSheet';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import { useFeedPosts } from '../../context/FeedPostContext';
import { usePawCircles } from '../../context/PawCircleContext';
import { collectUserFeedComments, type UserFeedComment } from '../../utils/postComments';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Activity'>;

export function ProfileActivityScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { me } = useCurrentUserProfile();
  const { posts: feedPosts, addComment } = useFeedPosts();
  const { createdCircles, joinedCircles } = usePawCircles();
  const [selectedComment, setSelectedComment] = useState<UserFeedComment | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const comments = useMemo(
    () => me ? collectUserFeedComments(feedPosts, me.id) : [],
    [feedPosts, me],
  );

  const commentPost = useMemo(
    () => (selectedComment ? feedPosts.find(p => p.id === selectedComment.postId) ?? null : null),
    [selectedComment, feedPosts],
  );

  const openUserProfile = useCallback((userId: string) => {
    navigation.getParent()?.navigate('Circles', {
      screen: 'UserProfile',
      params: { userId },
    });
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Activity" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        {comments.length === 0 ? (
          <Empty
            icon="comment"
            title="No comments yet"
            body="Comments you leave on feed posts will show up here."
          />
        ) : (
          <ProfileCommentsFeed
            comments={comments}
            onOpenComment={setSelectedComment}
          />
        )}
      </ScrollView>

      {commentPost && (
        <FeedCommentSheet
          post={commentPost}
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          onClose={() => setSelectedComment(null)}
          onSubmit={(text, replyToThreadIndex) => addComment(commentPost.id, text, { replyToThreadIndex })}
          onToast={setToast}
          onAuthorPress={openUserProfile}
        />
      )}

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
});
