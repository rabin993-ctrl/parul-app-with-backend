import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Sheet } from '../ui/Sheet';
import { ToastData } from '../ui/Toast';
import { type Post } from '../../data/mockData';
import { PawCircle } from '../../data/pawCircles';
import { countFeedThreadComments } from '../../utils/postComments';
import { FeedCommentInputBar, FeedCommentThreadList } from './FeedCommentThread';

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
  onSubmit: (text: string, replyToThreadIndex?: number) => void;
  onCommentPaw?: (threadIndex: number) => void;
  onToast: (t: ToastData) => void;
  onAuthorPress?: (userId: string) => void;
}) {
  const commentCount = countFeedThreadComments(post.threads);

  const handleAuthorPress = useCallback((userId: string) => {
    onClose();
    if (onAuthorPress) {
      queueMicrotask(() => onAuthorPress(userId));
    }
  }, [onAuthorPress, onClose]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      contentKey={`${post.id}-${commentCount}`}
      footerExpandBody
      footer={(
        <FeedCommentInputBar
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          onSubmit={text => onSubmit(text)}
          onToast={onToast}
          autoFocus
        />
      )}
    >
      <FeedCommentThreadList
        post={post}
        onSubmit={onSubmit}
        onCommentPaw={onCommentPaw}
        onAuthorPress={onAuthorPress ? handleAuthorPress : undefined}
        contentStyle={styles.body}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 4 },
});
