import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Sheet } from '../ui/Sheet';
import { ToastData } from '../ui/Toast';
import { type Post } from '../../data/mockData';
import { PawCircle } from '../../data/pawCircles';
import { FeedCommentInputBar, FeedCommentThreadList } from './FeedCommentThread';
import { countFeedThreadComments } from '../../utils/postComments';
import { useMentionActions } from '../../context/MentionActionContext';

const MENTION_FOOTER_ESTIMATE = 380;

function normalizeCommentPost(post: Post): Post {
  return {
    ...post,
    threads: (post.threads ?? []).map(thread => ({
      ...thread,
      replies: thread.replies ?? [],
    })),
  };
}

export function FeedCommentSheet({
  visible,
  post,
  createdCircles,
  joinedCircles,
  onClose,
  onSubmit,
  onCommentPaw,
  onToast,
  onAuthorPress,
}: {
  visible: boolean;
  post: Post;
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  onClose: () => void;
  onSubmit: (text: string, replyToThreadIndex?: number) => boolean | void;
  onCommentPaw?: (threadIndex: number) => void;
  onToast: (t: ToastData) => void;
  onAuthorPress?: (userId: string) => void;
}) {
  const bodyScrollRef = useRef<ScrollView>(null);
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
  const safePost = useMemo(() => normalizeCommentPost(post), [post]);
  const commentCount = countFeedThreadComments(safePost.threads ?? []);
  const sheetTitle = commentCount > 0 ? `Comments · ${commentCount}` : 'Comments';

  const handleAuthorPress = useCallback((userId: string) => {
    onClose();
    if (onAuthorPress) {
      queueMicrotask(() => onAuthorPress(userId));
    }
  }, [onAuthorPress, onClose]);

  const { handleMentionPress } = useMentionActions();
  const onMentionPress = useCallback((target: Parameters<typeof handleMentionPress>[0]) => {
    handleMentionPress(target, { returnTo: 'Feed', onBeforeNavigate: onClose });
  }, [handleMentionPress, onClose]);

  if (!visible) return null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={sheetTitle}
      contentKey={safePost.id}
      footerExpandBody
      footerBordered={false}
      footerFlush
      bodyDimmed={mentionPickerOpen}
      footerSizeEstimate={mentionPickerOpen ? MENTION_FOOTER_ESTIMATE : undefined}
      bodyScrollRef={bodyScrollRef}
      footer={(
        <FeedCommentInputBar
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          onSubmit={text => onSubmit(text)}
          onToast={onToast}
          onMentionPickerOpenChange={setMentionPickerOpen}
          autoFocus
        />
      )}
    >
      <FeedCommentThreadList
        post={safePost}
        onSubmit={onSubmit}
        onCommentPaw={onCommentPaw}
        onAuthorPress={onAuthorPress ? handleAuthorPress : undefined}
        onMentionPress={onMentionPress}
        onToast={onToast}
        showTitle={false}
        contentStyle={styles.body}
        bodyScrollRef={bodyScrollRef}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 4 },
});
