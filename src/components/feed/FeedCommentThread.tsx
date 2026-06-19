import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, StyleSheet, Platform, type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { MOBILE_INPUT_FONT_SIZE, radius } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/Button';
import { commentTextInputProps } from '../ui/BlankInputAccessory';
import { Icon } from '../icons/Icon';
import { ToastData } from '../ui/Toast';
import { type Post, type User } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import { CommentAuthorLine } from '../ui/CommentAuthorLine';
import { CommentReplyInput } from '../ui/CommentReplyInput';
import { PawCircle } from '../../data/pawCircles';
import { countFeedThreadComments } from '../../utils/postComments';
import {
  MentionPicker, insertMentionToken, shouldOpenMentionPicker,
} from '../MentionPicker';
import { useUserProfile, type UserMini } from '../../hooks/useUserProfile';

type ReplyTarget = {
  threadIndex: number;
  userName: string;
  anchorKey: string;
};

function commentAvatarUser(
  userId: string,
  profile: UserMini | null,
  me: User,
  fallbackTint: string,
): User {
  if (me.id && userId === me.id) return me;
  return {
    id: userId,
    name: profile?.name ?? profile?.handle ?? userId,
    handle: profile?.handle ?? userId,
    tint: profile?.tint ?? fallbackTint,
    loc: '',
    verified: false,
    avatarUrl: profile?.avatarUrl,
    avatarFallbackUrl: profile?.avatarFallbackUrl,
    avatarOriginalUrl: profile?.avatarOriginalUrl,
  };
}

type ThreadRowProps = {
  thread: Post['threads'][number];
  i: number;
  colors: ReturnType<typeof useTheme>['colors'];
  onCommentPaw?: (threadIndex: number) => void;
  onAuthorPress?: (userId: string) => void;
  openReply: (threadIndex: number, userName: string, anchorKey: string) => void;
  renderInlineReply: (anchorKey: string) => React.ReactNode;
  setReplyAnchorRef: (anchorKey: string, node: View | null) => void;
};

function ThreadRow({
  thread,
  i,
  colors,
  onCommentPaw,
  onAuthorPress,
  openReply,
  renderInlineReply,
  setReplyAnchorRef,
}: ThreadRowProps) {
  const { me } = useCurrentUserProfile();
  const authorId = thread.user || 'unknown';
  const profile = useUserProfile(authorId);
  const displayName = profile?.name ?? profile?.handle ?? authorId;
  const threadUser = commentAvatarUser(authorId, profile, me, colors.primary);
  const threadAnchor = `thread-${i}`;
  const [pawed, setPawed] = useState(false);

  return (
    <View style={styles.threadItem}>
      <Pressable
        onPress={() => onAuthorPress?.(authorId)}
        disabled={!onAuthorPress}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <Avatar user={threadUser} size={32} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameRow}>
          <CommentAuthorLine
            userId={authorId}
            authorProfile={profile ?? undefined}
            onAuthorPress={onAuthorPress}
          />
          <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{thread.time}</Text>
        </View>
        <Text style={[styles.threadText, { color: colors.text }]}>{thread.text}</Text>
        <View style={styles.threadActions}>
          <Pressable style={styles.actionBtn} hitSlop={6} onPress={() => { setPawed(v => !v); onCommentPaw?.(i); }}>
            <Icon name={pawed ? 'paw' : 'paw-line'} size={14} color={pawed ? colors.primary : colors.textTertiary} fill={pawed ? colors.primary : 'none'} />
          </Pressable>
          <Pressable
            hitSlop={6}
            onPress={() => openReply(i, displayName, threadAnchor)}
          >
            <Text style={[styles.actionLabel, { color: colors.textTertiary }]}>Reply</Text>
          </Pressable>
        </View>
        <View ref={node => setReplyAnchorRef(threadAnchor, node)} collapsable={false}>
          {renderInlineReply(threadAnchor)}
        </View>
        {(thread.replies ?? []).map((reply, j) => (
          <ReplyRow
            key={reply.id ?? `reply-${i}-${j}-${reply.user}-${reply.time}`}
            reply={reply}
            i={i}
            j={j}
            colors={colors}
            onAuthorPress={onAuthorPress}
            openReply={openReply}
            renderInlineReply={renderInlineReply}
            setReplyAnchorRef={setReplyAnchorRef}
          />
        ))}
      </View>
    </View>
  );
}

function ReplyRow({
  reply,
  i,
  j,
  colors,
  onAuthorPress,
  openReply,
  renderInlineReply,
  setReplyAnchorRef,
}: {
  reply: Post['threads'][number]['replies'][number];
  i: number;
  j: number;
  colors: ReturnType<typeof useTheme>['colors'];
  onAuthorPress?: (userId: string) => void;
  openReply: (threadIndex: number, userName: string, anchorKey: string) => void;
  renderInlineReply: (anchorKey: string) => React.ReactNode;
  setReplyAnchorRef: (anchorKey: string, node: View | null) => void;
}) {
  const { me } = useCurrentUserProfile();
  const authorId = reply.user || 'unknown';
  const profile = useUserProfile(authorId);
  const displayName = profile?.name ?? profile?.handle ?? authorId;
  const ru = commentAvatarUser(authorId, profile, me, colors.primary);
  const replyAnchor = `reply-${i}-${j}`;
  const [pawed, setPawed] = useState(false);

  return (
    <View style={styles.nestedReply}>
      <Pressable
        onPress={() => onAuthorPress?.(authorId)}
        disabled={!onAuthorPress}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <Avatar user={ru} size={24} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameRow}>
          <CommentAuthorLine
            userId={authorId}
            authorProfile={profile ?? undefined}
            fontSize={13}
            onAuthorPress={onAuthorPress}
          />
          <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{reply.time}</Text>
        </View>
        <Text style={[styles.threadText, { color: colors.text, fontSize: 13.5 }]}>{reply.text}</Text>
        <View style={styles.threadActions}>
          <Pressable style={styles.actionBtn} hitSlop={6} onPress={() => setPawed(v => !v)}>
            <Icon name={pawed ? 'paw' : 'paw-line'} size={13} color={pawed ? colors.primary : colors.textTertiary} fill={pawed ? colors.primary : 'none'} />
          </Pressable>
          <Pressable
            hitSlop={6}
            onPress={() => openReply(i, displayName, replyAnchor)}
          >
            <Text style={[styles.actionLabel, { color: colors.textTertiary }]}>Reply</Text>
          </Pressable>
        </View>
        <View ref={node => setReplyAnchorRef(replyAnchor, node)} collapsable={false}>
          {renderInlineReply(replyAnchor)}
        </View>
      </View>
    </View>
  );
}

export function FeedCommentInputBar({
  createdCircles,
  joinedCircles,
  onSubmit,
  onToast,
  onMentionPickerOpenChange,
  autoFocus = false,
}: {
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  onSubmit: (text: string) => boolean | void;
  onToast: (t: ToastData) => void;
  onMentionPickerOpenChange?: (open: boolean) => void;
  autoFocus?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { me } = useCurrentUserProfile();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);

  const composerUser: User = me.id
    ? me
    : {
      id: user?.id ?? 'you',
      name: user?.email?.split('@')[0] ?? 'You',
      handle: user?.email?.split('@')[0] ?? 'you',
      tint: colors.primary,
      loc: '',
      verified: false,
    };

  const setMentionOpen = useCallback((open: boolean) => {
    setMentionPickerOpen(open);
    onMentionPickerOpenChange?.(open);
  }, [onMentionPickerOpenChange]);

  const handleChange = useCallback((next: string) => {
    if (shouldOpenMentionPicker(next, text)) setMentionOpen(true);
    else if (!next.includes('@')) setMentionOpen(false);
    setText(next);
  }, [text, setMentionOpen]);

  const handleMentionSelect = useCallback((token: string) => {
    setText(t => insertMentionToken(t, token));
    setMentionOpen(false);
  }, [setMentionOpen]);

  const submit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!user) {
      onToast({ msg: 'Sign in to comment', icon: 'alert', tone: 'danger' });
      return;
    }
    const ok = onSubmit(trimmed);
    if (ok === false) {
      onToast({ msg: 'Could not post comment — try again', icon: 'alert', tone: 'danger' });
      return;
    }
    setText('');
    setMentionOpen(false);
    onToast({ msg: 'Comment posted!', icon: 'check', tone: 'success' });
  }, [text, onSubmit, onToast, setMentionOpen, user]);

  useEffect(() => {
    if (!autoFocus) return;
    const delay = Platform.OS === 'ios' ? 450 : 250;
    const t = setTimeout(() => inputRef.current?.focus(), delay);
    return () => clearTimeout(t);
  }, [autoFocus]);

  return (
    <View style={styles.replyFooter}>
      <MentionPicker
        visible={mentionPickerOpen}
        createdCircles={createdCircles}
        joinedCircles={joinedCircles}
        multiSelect
        inline
        onClose={() => setMentionOpen(false)}
        onSelect={handleMentionSelect}
      />
      <View style={styles.replyBar}>
        <Avatar user={composerUser} size={32} />
        <View
          style={[styles.replyInputWrap, { backgroundColor: colors.surface2 }]}
          pointerEvents="box-none"
        >
          <TextInput
            ref={inputRef}
            style={[styles.replyInput, { color: colors.text }]}
            placeholder="Add a comment…"
            placeholderTextColor={colors.textTertiary}
            value={text}
            onChangeText={handleChange}
            autoComplete="off"
            autoFocus={autoFocus}
            showSoftInputOnFocus
            {...commentTextInputProps(isDark)}
          />
          {text.trim().length > 0 && (
            <IconButton name="send" size={32} tone="ghost" color={colors.primary} onPress={submit} />
          )}
        </View>
      </View>
    </View>
  );
}

export function FeedCommentThreadList({
  post,
  onSubmit,
  onCommentPaw,
  onAuthorPress,
  onToast,
  contentStyle,
  showTitle = true,
  bodyScrollRef,
}: {
  post: Post;
  onSubmit: (text: string, replyToThreadIndex?: number) => boolean | void;
  onCommentPaw?: (threadIndex: number) => void;
  onAuthorPress?: (userId: string) => void;
  onToast?: (t: ToastData) => void;
  contentStyle?: ViewStyle;
  showTitle?: boolean;
  bodyScrollRef?: React.RefObject<ScrollView | null>;
}) {
  const { colors } = useTheme();
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const threads = post.threads ?? [];
  const commentCount = countFeedThreadComments(threads);
  const scrollContentRef = useRef<View>(null);
  const replyAnchorRefs = useRef<Map<string, View>>(new Map());

  const setReplyAnchorRef = useCallback((anchorKey: string, node: View | null) => {
    if (node) replyAnchorRefs.current.set(anchorKey, node);
    else replyAnchorRefs.current.delete(anchorKey);
  }, []);

  const openReply = useCallback((threadIndex: number, userName: string, anchorKey: string) => {
    setReplyTo({ threadIndex, userName, anchorKey });
    setInlineReplyText('');
  }, []);

  const cancelReply = useCallback(() => {
    setReplyTo(null);
    setInlineReplyText('');
  }, []);

  const submitInlineReply = useCallback(() => {
    if (!inlineReplyText.trim() || !replyTo) return;
    const ok = onSubmit(inlineReplyText.trim(), replyTo.threadIndex);
    if (ok === false) {
      onToast?.({ msg: 'Could not post reply — try again', icon: 'alert', tone: 'danger' });
      return;
    }
    setInlineReplyText('');
    setReplyTo(null);
    onToast?.({ msg: 'Reply posted!', icon: 'check', tone: 'success' });
  }, [inlineReplyText, replyTo, onSubmit, onToast]);

  const renderInlineReply = useCallback((anchorKey: string) => {
    if (replyTo?.anchorKey !== anchorKey) return null;
    return (
      <CommentReplyInput
        replyToName={replyTo.userName}
        value={inlineReplyText}
        onChangeText={setInlineReplyText}
        onSubmit={submitInlineReply}
        onCancel={cancelReply}
      />
    );
  }, [replyTo, inlineReplyText, submitInlineReply, cancelReply]);

  useEffect(() => {
    if (!replyTo || !bodyScrollRef?.current || !scrollContentRef.current) return;
    const timer = setTimeout(() => {
      const anchor = replyAnchorRefs.current.get(replyTo.anchorKey);
      if (!anchor) return;
      anchor.measureLayout(
        scrollContentRef.current as View,
        (_x, y, _w, h) => {
          bodyScrollRef.current?.scrollTo({
            y: Math.max(0, y + h - 100),
            animated: true,
          });
        },
        () => {},
      );
    }, 100);
    return () => clearTimeout(timer);
  }, [replyTo, bodyScrollRef]);

  return (
    <View ref={scrollContentRef} style={contentStyle} collapsable={false}>
      {showTitle ? (
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Comments{commentCount > 0 ? ` · ${commentCount}` : ''}
        </Text>
      ) : null}
      {threads.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          No comments yet — be the first to reply.
        </Text>
      )}
      {threads.map((thread, i) => (
        <ThreadRow
          key={thread.id ?? `thread-${i}-${thread.user}-${thread.time}`}
          thread={thread}
          i={i}
          colors={colors}
          onCommentPaw={onCommentPaw}
          onAuthorPress={onAuthorPress}
          openReply={openReply}
          renderInlineReply={renderInlineReply}
          setReplyAnchorRef={setReplyAnchorRef}
        />
      ))}
    </View>
  );
}

export function FeedCommentThread({
  post,
  createdCircles,
  joinedCircles,
  onSubmit,
  onCommentPaw,
  onToast,
  onAuthorPress,
}: {
  post: Post;
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  onSubmit: (text: string, replyToThreadIndex?: number) => boolean | void;
  onCommentPaw?: (threadIndex: number) => void;
  onToast: (t: ToastData) => void;
  onAuthorPress?: (userId: string) => void;
}) {
  return (
    <View style={styles.threadWrap}>
      <FeedCommentThreadList
        post={post}
        onSubmit={onSubmit}
        onCommentPaw={onCommentPaw}
        onAuthorPress={onAuthorPress}
        onToast={onToast}
      />
      <FeedCommentInputBar
        createdCircles={createdCircles}
        joinedCircles={joinedCircles}
        onSubmit={text => onSubmit(text)}
        onToast={onToast}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  threadWrap: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 14, lineHeight: 20, paddingVertical: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  threadItem: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  threadTime: { fontSize: 12 },
  threadText: { fontSize: 14.5, lineHeight: 21, marginTop: 2 },
  threadActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  actionLabel: { fontSize: 12.5, fontWeight: '600' },
  nestedReply: { flexDirection: 'row', gap: 8, marginTop: 10 },
  replyFooter: { gap: 8 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  replyInputWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingLeft: 14,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 40,
    ...Platform.select({
      web: { outlineStyle: 'none', cursor: 'text' } as object,
      default: {},
    }),
  },
  replyInput: {
    flex: 1,
    fontSize: MOBILE_INPUT_FONT_SIZE,
    lineHeight: 20,
    paddingVertical: 4,
    ...Platform.select({
      web: { outlineStyle: 'none' } as object,
      default: {},
    }),
  },
});
