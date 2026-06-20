import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sheet } from '../ui/Sheet';
import { ToastData } from '../ui/Toast';
import { type Post } from '../../data/mockData';
import { PawCircle } from '../../data/pawCircles';
import { FeedCommentInputBar, FeedCommentThreadList } from './FeedCommentThread';
import { countFeedThreadComments } from '../../utils/postComments';
import { useMentionActions } from '../../context/MentionActionContext';
import { useMobileWeb } from '../../hooks/useMobileWeb';
import { useSheetScrollToEnd } from '../../hooks/useSheetScrollToEnd';
import { useVisualViewportInset } from '../../hooks/useVisualViewportInset';
import { useTheme } from '../../theme/ThemeContext';

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
  const prevCommentCountRef = useRef(0);
  const mobileWeb = useMobileWeb();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardInset = useVisualViewportInset(visible && mobileWeb);
  const { scrollToEnd } = useSheetScrollToEnd(bodyScrollRef, visible);
  const safePost = useMemo(() => normalizeCommentPost(post), [post]);
  const commentCount = countFeedThreadComments(safePost.threads ?? []);
  const sheetTitle = commentCount > 0 ? `Comments · ${commentCount}` : 'Comments';
  const useInlineInput = mobileWeb;

  const scrollInputIntoView = useCallback(() => {
    scrollToEnd({ animated: true });
  }, [scrollToEnd]);

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

  const handleTopLevelSubmit = useCallback((text: string) => onSubmit(text), [onSubmit]);

  const handleCommentSubmitted = useCallback(() => {
    scrollToEnd({ animated: true });
  }, [scrollToEnd]);

  const commentInput = (
    <FeedCommentInputBar
      createdCircles={createdCircles}
      joinedCircles={joinedCircles}
      onSubmit={handleTopLevelSubmit}
      onSubmitted={handleCommentSubmitted}
      onToast={onToast}
      onMentionPickerOpenChange={setMentionPickerOpen}
      onInputFocus={useInlineInput && commentCount === 0 ? scrollInputIntoView : undefined}
      autoFocus={!mobileWeb}
      inline={useInlineInput}
    />
  );

  useEffect(() => {
    if (useInlineInput && mentionPickerOpen) {
      scrollInputIntoView();
    }
  }, [useInlineInput, mentionPickerOpen, scrollInputIntoView]);

  useEffect(() => {
    if (commentCount > prevCommentCountRef.current) {
      scrollToEnd({ animated: true });
    }
    prevCommentCountRef.current = commentCount;
  }, [commentCount, scrollToEnd]);

  const inlineBottomPad = Math.max(12, keyboardInset > 0 ? keyboardInset : insets.bottom);

  if (!visible) return null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={sheetTitle}
      contentKey={safePost.id}
      footerExpandBody={commentCount > 0}
      footerBordered={false}
      footerFlush
      bodyDimmed={mentionPickerOpen && !useInlineInput}
      footerSizeEstimate={!useInlineInput && mentionPickerOpen ? MENTION_FOOTER_ESTIMATE : undefined}
      bodyScrollRef={bodyScrollRef}
      footer={useInlineInput ? undefined : commentInput}
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
        useInlineInput={useInlineInput}
      />
      {useInlineInput ? (
        <View
          style={[
            styles.inlineInput,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: inlineBottomPad,
            },
            Platform.OS === 'web' ? styles.inlineInputSticky : null,
          ]}
        >
          {commentInput}
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 4 },
  inlineInput: {
    paddingHorizontal: 18,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inlineInputSticky: Platform.select({
    web: { position: 'sticky', bottom: 0, zIndex: 2 } as object,
    default: {},
  }),
});
