import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, TextInput, ScrollView, StyleSheet, Platform, type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { MOBILE_INPUT_FONT_SIZE, radius } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/Button';
import { MentionComposerInput } from '../ui/MentionComposerInput';
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
  MentionPicker, insertMentionToken, extractActiveMentionQuery,
} from '../MentionPicker';
import { dismissActiveMention } from '../../utils/mentionText';
import { useUserProfile, type UserMini } from '../../hooks/useUserProfile';
import { MentionText } from '../ui/MentionText';
import { useVisualViewportInset } from '../../hooks/useVisualViewportInset';
import { useSheetScrollToEnd } from '../../hooks/useSheetScrollToEnd';
import type { MentionTarget } from '../../utils/mentionText';

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
  onMentionPress?: (target: MentionTarget) => void;
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
  onMentionPress,
}: ThreadRowProps) {
  const { me } = useCurrentUserProfile();
  const profile = useUserProfile(thread.user);
  const displayName = profile?.name ?? profile?.handle ?? thread.user;
  const threadUser = commentAvatarUser(thread.user, profile, me, colors.primary);
  const threadAnchor = `thread-${i}`;
  const [pawed, setPawed] = useState(false);

  return (
    <View style={styles.threadItem}>
      <Pressable
        onPress={() => onAuthorPress?.(thread.user)}
        disabled={!onAuthorPress}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <Avatar user={threadUser} size={32} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameRow}>
          <CommentAuthorLine
            userId={thread.user}
            authorProfile={profile ?? undefined}
            onAuthorPress={onAuthorPress}
          />
          <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{thread.time}</Text>
        </View>
        <MentionText style={[styles.threadText, { color: colors.text }]} onMentionPress={onMentionPress}>
          {thread.text}
        </MentionText>
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
            key={j}
            reply={reply}
            i={i}
            j={j}
            colors={colors}
            onAuthorPress={onAuthorPress}
            openReply={openReply}
            renderInlineReply={renderInlineReply}
            setReplyAnchorRef={setReplyAnchorRef}
            onMentionPress={onMentionPress}
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
  onMentionPress,
}: {
  reply: Post['threads'][number]['replies'][number];
  i: number;
  j: number;
  colors: ReturnType<typeof useTheme>['colors'];
  onAuthorPress?: (userId: string) => void;
  openReply: (threadIndex: number, userName: string, anchorKey: string) => void;
  renderInlineReply: (anchorKey: string) => React.ReactNode;
  setReplyAnchorRef: (anchorKey: string, node: View | null) => void;
  onMentionPress?: (target: MentionTarget) => void;
}) {
  const { me } = useCurrentUserProfile();
  const profile = useUserProfile(reply.user);
  const displayName = profile?.name ?? profile?.handle ?? reply.user;
  const ru = commentAvatarUser(reply.user, profile, me, colors.primary);
  const replyAnchor = `reply-${i}-${j}`;
  const [pawed, setPawed] = useState(false);

  return (
    <View style={styles.nestedReply}>
      <Pressable
        onPress={() => onAuthorPress?.(reply.user)}
        disabled={!onAuthorPress}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <Avatar user={ru} size={24} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameRow}>
          <CommentAuthorLine
            userId={reply.user}
            authorProfile={profile ?? undefined}
            fontSize={13}
            onAuthorPress={onAuthorPress}
          />
          <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{reply.time}</Text>
        </View>
        <MentionText
          style={[styles.threadText, { color: colors.text, fontSize: 13.5 }]}
          onMentionPress={onMentionPress}
        >
          {reply.text}
        </MentionText>
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
  onSubmitted,
  onToast,
  onMentionPickerOpenChange,
  onInputFocus,
  autoFocus = false,
  inline = false,
}: {
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  onSubmit: (text: string) => boolean | void;
  onSubmitted?: () => void;
  onToast: (t: ToastData) => void;
  onMentionPickerOpenChange?: (open: boolean) => void;
  onInputFocus?: () => void;
  autoFocus?: boolean;
  /** Inline in scroll body (mobile web) — drops footer horizontal padding. */
  inline?: boolean;
}) {
  const { colors, isDark, groupedBg } = useTheme();
  const { user } = useAuth();
  const { me } = useCurrentUserProfile();
  const inputRef = useRef<TextInput>(null);
  const isSubmittingRef = useRef(false);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedMentions, setConfirmedMentions] = useState<string[]>([]);
  const activeMentionQuery = useMemo(() => extractActiveMentionQuery(text), [text]);
  const mentionPickerOpen = activeMentionQuery !== null;

  useEffect(() => {
    onMentionPickerOpenChange?.(mentionPickerOpen);
  }, [mentionPickerOpen, onMentionPickerOpenChange]);

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

  const handleChange = useCallback((next: string) => {
    setText(next);
    setConfirmedMentions(prev => prev.filter(token => next.includes(token)));
  }, []);

  const handleMentionSelect = useCallback((token: string) => {
    setText(t => insertMentionToken(t, token));
    setConfirmedMentions(prev => (prev.includes(token) ? prev : [...prev, token]));
  }, []);

  const dismissMentionPicker = useCallback(() => {
    setText(t => dismissActiveMention(t));
  }, []);

  const submit = useCallback(() => {
    if (isSubmittingRef.current) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!user) {
      onToast({ msg: 'Sign in to comment', icon: 'alert', tone: 'danger' });
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const ok = onSubmit(trimmed);
    if (ok === false) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      onToast({ msg: 'Could not post comment — try again', icon: 'alert', tone: 'danger' });
      return;
    }
    setText('');
    setConfirmedMentions([]);
    onSubmitted?.();
    onToast({ msg: 'Comment posted!', icon: 'check', tone: 'success' });
    isSubmittingRef.current = false;
    setIsSubmitting(false);
  }, [text, onSubmit, onSubmitted, onToast, user]);

  const handleKeyPress = useCallback((e: { nativeEvent: { key: string; shiftKey?: boolean }; preventDefault?: () => void }) => {
    if (Platform.OS !== 'web') return;
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault?.();
      submit();
    }
  }, [submit]);

  useEffect(() => {
    if (!autoFocus) return;
    const delay = Platform.OS === 'ios' ? 450 : 250;
    const t = setTimeout(() => inputRef.current?.focus(), delay);
    return () => clearTimeout(t);
  }, [autoFocus]);

  return (
    <View style={styles.replyFooter}>
      {mentionPickerOpen ? (
        <MentionPicker
          visible
          inline
          typeaheadQuery={activeMentionQuery ?? undefined}
          createdCircles={createdCircles}
          joinedCircles={joinedCircles}
          multiSelect
          onClose={dismissMentionPicker}
          onSelect={handleMentionSelect}
        />
      ) : null}
      <View style={[styles.replyBar, inline && styles.replyBarInline]}>
        <Avatar user={composerUser} size={32} />
        <View
          style={[
            styles.replyInputWrap,
            { backgroundColor: groupedBg, borderColor: colors.border },
          ]}
          pointerEvents="box-none"
        >
          <MentionComposerInput
            ref={inputRef}
            inputStyle={styles.replyInput}
            confirmedMentions={confirmedMentions}
            placeholder="Add a comment…"
            placeholderTextColor={colors.textTertiary}
            value={text}
            onChangeText={handleChange}
            onFocus={onInputFocus}
            onKeyPress={handleKeyPress}
            autoComplete="off"
            autoFocus={autoFocus}
            showSoftInputOnFocus
            {...commentTextInputProps(isDark)}
          />
          {text.trim().length > 0 && (
            <View style={isSubmitting ? { opacity: 0.4 } : undefined}>
              <IconButton
                name="send"
                size={32}
                tone="ghost"
                color={colors.primary}
                onPress={isSubmitting ? undefined : submit}
              />
            </View>
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
  onMentionPress,
  onToast,
  contentStyle,
  showTitle = true,
  bodyScrollRef,
  useInlineInput = false,
}: {
  post: Post;
  onSubmit: (text: string, replyToThreadIndex?: number) => boolean | void;
  onCommentPaw?: (threadIndex: number) => void;
  onAuthorPress?: (userId: string) => void;
  onMentionPress?: (target: MentionTarget) => void;
  onToast?: (t: ToastData) => void;
  contentStyle?: ViewStyle;
  showTitle?: boolean;
  bodyScrollRef?: React.RefObject<ScrollView | null>;
  /** Mobile web inline main input — reserve space when scrolling inline replies. */
  useInlineInput?: boolean;
}) {
  const { colors } = useTheme();
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const replySubmittingRef = useRef(false);
  const lastReplyAnchorRef = useRef<string | null>(null);
  const threads = post.threads ?? [];
  const commentCount = countFeedThreadComments(threads);
  const scrollContentRef = useRef<View>(null);
  const replyAnchorRefs = useRef<Map<string, View>>(new Map());
  const keyboardInset = useVisualViewportInset(true);
  const { scrollToY } = useSheetScrollToEnd(bodyScrollRef ?? { current: null }, Boolean(bodyScrollRef));
  const stickyInputReserve = useInlineInput ? 72 : 0;
  const inlineReplyScrollPad = Platform.OS === 'web'
    ? Math.max(120, keyboardInset + 80 + stickyInputReserve)
    : 100;

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

  const scrollReplyAnchorIntoView = useCallback((anchorKey: string) => {
    if (!bodyScrollRef?.current || !scrollContentRef.current) return;
    const anchor = replyAnchorRefs.current.get(anchorKey);
    if (!anchor) return;
    anchor.measureLayout(
      scrollContentRef.current as View,
      (_x, y, _w, h) => {
        scrollToY(Math.max(0, y + h - inlineReplyScrollPad), { animated: true });
      },
      () => {},
    );
  }, [bodyScrollRef, inlineReplyScrollPad, scrollToY]);

  const submitInlineReply = useCallback(() => {
    if (replySubmittingRef.current) return;
    if (!inlineReplyText.trim() || !replyTo) return;
    replySubmittingRef.current = true;
    setReplySubmitting(true);
    const anchorKey = replyTo.anchorKey;
    const ok = onSubmit(inlineReplyText.trim(), replyTo.threadIndex);
    if (ok === false) {
      replySubmittingRef.current = false;
      setReplySubmitting(false);
      onToast?.({ msg: 'Could not post reply — try again', icon: 'alert', tone: 'danger' });
      return;
    }
    lastReplyAnchorRef.current = anchorKey;
    setInlineReplyText('');
    setReplyTo(null);
    onToast?.({ msg: 'Reply posted!', icon: 'check', tone: 'success' });
    replySubmittingRef.current = false;
    setReplySubmitting(false);
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
        submitting={replySubmitting}
      />
    );
  }, [replyTo, inlineReplyText, submitInlineReply, cancelReply, replySubmitting]);

  useEffect(() => {
    if (!replyTo) return;
    scrollReplyAnchorIntoView(replyTo.anchorKey);
  }, [replyTo, scrollReplyAnchorIntoView]);

  useEffect(() => {
    const anchorKey = lastReplyAnchorRef.current;
    if (!anchorKey) return;
    lastReplyAnchorRef.current = null;
    scrollReplyAnchorIntoView(anchorKey);
  }, [post.threads, scrollReplyAnchorIntoView]);

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
          key={`${thread.user}-${thread.time}-${i}`}
          thread={thread}
          i={i}
          colors={colors}
          onCommentPaw={onCommentPaw}
          onAuthorPress={onAuthorPress}
          onMentionPress={onMentionPress}
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
  emptyText: { fontSize: 14, lineHeight: 20, paddingVertical: 20, paddingBottom: 28 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  threadItem: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  threadTime: { fontSize: 12 },
  threadText: { fontSize: 14.5, lineHeight: 21, marginTop: 2 },
  threadActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  actionLabel: { fontSize: 12.5, fontWeight: '600' },
  nestedReply: { flexDirection: 'row', gap: 8, marginTop: 10 },
  replyFooter: { gap: 4 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    paddingHorizontal: 20,
  },
  replyBarInline: {
    paddingHorizontal: 0,
  },
  replyInputWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
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
