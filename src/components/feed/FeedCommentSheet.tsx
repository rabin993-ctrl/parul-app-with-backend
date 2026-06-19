import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../ui/Sheet';
import { ToastData } from '../ui/Toast';
import { type Post } from '../../data/mockData';
import { PawCircle } from '../../data/pawCircles';
import { useTheme } from '../../theme/ThemeContext';
import { FeedCommentInputBar, FeedCommentThreadList } from './FeedCommentThread';

const MENTION_FOOTER_ESTIMATE = 320;

export function normalizeCommentPost(post: Post): Post {
  return {
    ...post,
    threads: (post.threads ?? []).map(thread => ({
      ...thread,
      user: thread.user ?? 'unknown',
      text: thread.text ?? '',
      time: thread.time ?? '',
      replies: (thread.replies ?? []).map(reply => ({
        ...reply,
        user: reply.user ?? 'unknown',
        text: reply.text ?? '',
        time: reply.time ?? '',
      })),
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
  onLoadComments,
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
  onLoadComments?: (postId: string) => Promise<void>;
}) {
  const { colors } = useTheme();
  const bodyScrollRef = useRef<ScrollView>(null);
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const loadedCommentsForRef = useRef<string | null>(null);
  const safePost = useMemo(() => normalizeCommentPost(post), [post]);

  const handleAuthorPress = useCallback((userId: string) => {
    onClose();
    if (onAuthorPress) {
      queueMicrotask(() => onAuthorPress(userId));
    }
  }, [onAuthorPress, onClose]);

  useEffect(() => {
    if (!visible || !safePost.id || !onLoadComments) return;
    if (loadedCommentsForRef.current === safePost.id) return;
    loadedCommentsForRef.current = safePost.id;
    let cancelled = false;
    setLoadingComments(true);
    onLoadComments(safePost.id)
      .catch(() => {
        if (!cancelled) {
          onToast({ msg: 'Could not load comments — try again', icon: 'alert', tone: 'danger' });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingComments(false);
      });
    return () => { cancelled = true; };
  }, [visible, safePost.id, onLoadComments, onToast]);

  useEffect(() => {
    if (visible) return;
    loadedCommentsForRef.current = null;
    setMentionPickerOpen(false);
    setLoadingComments(false);
  }, [visible]);

  if (!visible) return null;

  if (!safePost.id) {
    return (
      <Sheet visible={visible} onClose={onClose} title="Comments">
        <View style={styles.fallback}>
          <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
            Unable to load comments for this post.
          </Text>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Comments"
      contentKey={`${safePost.id}:${(safePost.threads ?? []).length}`}
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
          autoFocus
        />
      )}
    >
      {loadingComments && (safePost.threads ?? []).length === 0 ? (
        <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
          Loading comments…
        </Text>
      ) : null}
      <FeedCommentThreadList
        post={safePost}
        onSubmit={onSubmit}
        onCommentPaw={onCommentPaw}
        onAuthorPress={onAuthorPress ? handleAuthorPress : undefined}
        onToast={onToast}
        contentStyle={styles.body}
        bodyScrollRef={bodyScrollRef}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 4 },
  loadingText: { fontSize: 14, paddingVertical: 12, paddingHorizontal: 18 },
  fallback: { paddingHorizontal: 20, paddingVertical: 24 },
  fallbackText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
