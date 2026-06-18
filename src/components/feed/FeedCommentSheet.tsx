import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Sheet } from '../ui/Sheet';
import { ToastData } from '../ui/Toast';
import { type Post } from '../../data/mockData';
import { PawCircle } from '../../data/pawCircles';
import { FeedCommentInputBar, FeedCommentThreadList } from './FeedCommentThread';

const MENTION_FOOTER_ESTIMATE = 320;

export function FeedCommentSheet({
  post,
  createdCircles,
  joinedCircles,
  onClose,
  onSubmit,
  onCommentPaw,
  onToast,
  onAuthorPress,
}: {
  post: Post;
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  onClose: () => void;
  onSubmit: (text: string, replyToThreadIndex?: number) => void;
  onCommentPaw?: (threadIndex: number) => void;
  onToast: (t: ToastData) => void;
  onAuthorPress?: (userId: string) => void;
}) {
  const bodyScrollRef = useRef<ScrollView>(null);
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);

  const handleAuthorPress = useCallback((userId: string) => {
    onClose();
    if (onAuthorPress) {
      queueMicrotask(() => onAuthorPress(userId));
    }
  }, [onAuthorPress, onClose]);

  return (
    <Sheet
      visible
      onClose={onClose}
      contentKey={post.id}
      footerExpandBody
      footerSizeEstimate={mentionPickerOpen ? MENTION_FOOTER_ESTIMATE : undefined}
      bodyScrollRef={bodyScrollRef}
      footer={(
        <FeedCommentInputBar
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          onSubmit={text => onSubmit(text)}
          onToast={onToast}
          onMentionPickerOpenChange={setMentionPickerOpen}
        />
      )}
    >
      <FeedCommentThreadList
        post={post}
        onSubmit={onSubmit}
        onCommentPaw={onCommentPaw}
        onAuthorPress={onAuthorPress ? handleAuthorPress : undefined}
        contentStyle={styles.body}
        bodyScrollRef={bodyScrollRef}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 4 },
});
