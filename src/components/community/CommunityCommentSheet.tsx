import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { MOBILE_INPUT_FONT_SIZE, radius } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { MentionComposerInput } from '../ui/MentionComposerInput';
import { commentTextInputProps } from '../ui/BlankInputAccessory';
import { Icon } from '../icons/Icon';
import { ToastData } from '../ui/Toast';
import { CommunityPost } from '../../data/communityPosts';
import { CommentAuthorLine } from '../ui/CommentAuthorLine';
import { MentionText } from '../ui/MentionText';
import { CommentReplyInput } from '../ui/CommentReplyInput';
import { countCommunityThreadComments } from '../../utils/postComments';
import { PawCircle } from '../../data/pawCircles';
import {
  MentionPicker, insertMentionToken, extractActiveMentionQuery,
} from '../MentionPicker';
import { dismissActiveMention } from '../../utils/mentionText';
import { useAuth } from '../../context/AuthContext';

type ReplyTarget = {
  threadId: string;
  userName: string;
  anchorKey: string;
};

function CommunityReplyRow({
  reply,
  threadId,
  j,
  colors,
  onAuthorPress,
  openReply,
  renderInlineReply,
}: {
  reply: CommunityPost['threads'][number]['replies'][number];
  threadId: string;
  j: number;
  colors: ReturnType<typeof useTheme>['colors'];
  onAuthorPress?: (userId: string) => void;
  openReply: (threadId: string, userName: string, anchorKey: string) => void;
  renderInlineReply: (anchorKey: string) => React.ReactNode;
}) {
  const [pawed, setPawed] = useState(false);
  const replyAnchor = `reply-${threadId}-${j}`;
  const replyAuthorUser = { id: reply.userId, name: reply.author?.name ?? reply.author?.handle ?? reply.userId, tint: reply.author?.tint ?? '#F2972E' };
  return (
    <View style={styles.nestedReply}>
      <Pressable
        onPress={() => onAuthorPress?.(reply.userId)}
        disabled={!onAuthorPress}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <Avatar user={replyAuthorUser} size={24} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameRow}>
          <CommentAuthorLine
            userId={reply.userId}
            authorProfile={reply.author}
            fontSize={13}
            onAuthorPress={onAuthorPress}
          />
          <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{reply.time}</Text>
        </View>
        <MentionText style={[styles.threadText, { color: colors.text, fontSize: 13.5 }]}>
          {reply.text}
        </MentionText>
        <View style={styles.threadActions}>
          <Pressable style={styles.actionBtn} hitSlop={6} onPress={() => setPawed(v => !v)}>
            <Icon name={pawed ? 'paw' : 'paw-line'} size={13} color={pawed ? colors.primary : colors.textTertiary} fill={pawed ? colors.primary : 'none'} />
          </Pressable>
          <Pressable
            hitSlop={6}
            onPress={() => openReply(threadId, reply.author?.name ?? reply.author?.handle ?? reply.userId, replyAnchor)}
          >
            <Text style={[styles.actionLabel, { color: colors.textTertiary }]}>Reply</Text>
          </Pressable>
        </View>
        {renderInlineReply(replyAnchor)}
      </View>
    </View>
  );
}

function CommunityThreadRow({
  thread,
  colors,
  onAuthorPress,
  openReply,
  renderInlineReply,
}: {
  thread: CommunityPost['threads'][number];
  colors: ReturnType<typeof useTheme>['colors'];
  onAuthorPress?: (userId: string) => void;
  openReply: (threadId: string, userName: string, anchorKey: string) => void;
  renderInlineReply: (anchorKey: string) => React.ReactNode;
}) {
  const [pawed, setPawed] = useState(false);
  const threadAnchor = `thread-${thread.id}`;
  const threadAuthorUser = { id: thread.userId, name: thread.author?.name ?? thread.author?.handle ?? thread.userId, tint: thread.author?.tint ?? '#F2972E' };
  return (
    <View style={styles.threadItem}>
      <Pressable
        onPress={() => onAuthorPress?.(thread.userId)}
        disabled={!onAuthorPress}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
      >
        <Avatar user={threadAuthorUser} size={32} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameRow}>
          <CommentAuthorLine
            userId={thread.userId}
            authorProfile={thread.author}
            onAuthorPress={onAuthorPress}
          />
          <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{thread.time}</Text>
        </View>
        <MentionText style={[styles.threadText, { color: colors.text }]}>
          {thread.text}
        </MentionText>
        <View style={styles.threadActions}>
          <Pressable style={styles.actionBtn} hitSlop={6} onPress={() => setPawed(v => !v)}>
            <Icon name={pawed ? 'paw' : 'paw-line'} size={14} color={pawed ? colors.primary : colors.textTertiary} fill={pawed ? colors.primary : 'none'} />
          </Pressable>
          <Pressable
            hitSlop={6}
            onPress={() => openReply(thread.id, thread.author?.name ?? thread.author?.handle ?? thread.userId, threadAnchor)}
          >
            <Text style={[styles.actionLabel, { color: colors.textTertiary }]}>Reply</Text>
          </Pressable>
        </View>
        {renderInlineReply(threadAnchor)}
        {thread.replies.map((reply, j) => (
          <CommunityReplyRow
            key={reply.id ?? j}
            reply={reply}
            threadId={thread.id}
            j={j}
            colors={colors}
            onAuthorPress={onAuthorPress}
            openReply={openReply}
            renderInlineReply={renderInlineReply}
          />
        ))}
      </View>
    </View>
  );
}

const MENTION_FOOTER_ESTIMATE = 380;

export function CommunityCommentSheet({
  post,
  createdCircles,
  joinedCircles,
  onClose,
  onSubmit,
  onToast,
  onAuthorPress,
}: {
  post: CommunityPost;
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  onClose: () => void;
  onSubmit: (text: string, replyToThreadId?: string) => void;
  onToast: (t: ToastData) => void;
  onAuthorPress?: (userId: string) => void;
}) {
  const { colors, isDark, groupedBg } = useTheme();
  const { user } = useAuth();
  const meUser = { id: user?.id ?? '', name: user?.email?.split('@')[0] ?? 'Me', tint: '#F2972E' };
  const commentInputRef = useRef<TextInput>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [confirmedNewMentions, setConfirmedNewMentions] = useState<string[]>([]);
  const [confirmedReplyMentions, setConfirmedReplyMentions] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const activeComposerText = replyTo ? inlineReplyText : newCommentText;
  const activeMentionQuery = useMemo(
    () => extractActiveMentionQuery(activeComposerText),
    [activeComposerText],
  );
  const mentionPickerOpen = activeMentionQuery !== null;
  const commentCount = countCommunityThreadComments(post.threads ?? []);

  const openReply = (threadId: string, userName: string, anchorKey: string) => {
    setReplyTo({ threadId, userName, anchorKey });
    setInlineReplyText('');
  };

  const cancelReply = () => {
    setReplyTo(null);
    setInlineReplyText('');
  };

  const handleNewCommentChange = (next: string) => {
    setNewCommentText(next);
    setConfirmedNewMentions(prev => prev.filter(token => next.includes(token)));
  };

  const handleInlineReplyChange = (next: string) => {
    setInlineReplyText(next);
    setConfirmedReplyMentions(prev => prev.filter(token => next.includes(token)));
  };

  const onMentionSelect = (token: string) => {
    if (replyTo) {
      setInlineReplyText(t => insertMentionToken(t, token));
      setConfirmedReplyMentions(prev => (prev.includes(token) ? prev : [...prev, token]));
    } else {
      setNewCommentText(t => insertMentionToken(t, token));
      setConfirmedNewMentions(prev => (prev.includes(token) ? prev : [...prev, token]));
    }
  };

  const submitNewComment = () => {
    if (!newCommentText.trim()) return;
    onSubmit(newCommentText.trim());
    setNewCommentText('');
    setConfirmedNewMentions([]);
    onToast({ msg: 'Comment posted!', icon: 'check', tone: 'success' });
  };

  const submitInlineReply = () => {
    if (!inlineReplyText.trim() || !replyTo) return;
    onSubmit(inlineReplyText.trim(), replyTo.threadId);
    setInlineReplyText('');
    setConfirmedReplyMentions([]);
    setReplyTo(null);
    onToast({ msg: 'Reply posted!', icon: 'check', tone: 'success' });
  };

  const dismissMentionPicker = () => {
    if (replyTo) {
      setInlineReplyText(t => dismissActiveMention(t));
    } else {
      setNewCommentText(t => dismissActiveMention(t));
    }
  };

  useEffect(() => {
    const delay = Platform.OS === 'ios' ? 450 : 250;
    const t = setTimeout(() => commentInputRef.current?.focus(), delay);
    return () => clearTimeout(t);
  }, []);

  const renderInlineReply = (anchorKey: string) => {
    if (replyTo?.anchorKey !== anchorKey) return null;
    return (
      <CommentReplyInput
        replyToName={replyTo.userName}
        value={inlineReplyText}
        onChangeText={handleInlineReplyChange}
        onSubmit={submitInlineReply}
        onCancel={cancelReply}
        confirmedMentions={confirmedReplyMentions}
      />
    );
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title={commentCount > 0 ? `Comments · ${commentCount}` : 'Comments'}
      contentKey={post.id}
      footerExpandBody={commentCount > 0}
      footerBordered={false}
      footerFlush
      bodyDimmed={mentionPickerOpen}
      footerSizeEstimate={mentionPickerOpen ? MENTION_FOOTER_ESTIMATE : undefined}
      footer={(
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
              onSelect={onMentionSelect}
            />
          ) : null}
          <View style={styles.replyBar}>
            <Avatar user={meUser} size={32} />
            <View
              style={[
                styles.replyInputWrap,
                { backgroundColor: groupedBg, borderColor: colors.border },
              ]}
              pointerEvents="box-none"
            >
              <MentionComposerInput
                ref={commentInputRef}
                inputStyle={styles.replyInput}
                confirmedMentions={confirmedNewMentions}
                placeholder="Add a comment…"
                placeholderTextColor={colors.textTertiary}
                value={newCommentText}
                onChangeText={handleNewCommentChange}
                autoComplete="off"
                autoFocus
                showSoftInputOnFocus
                {...commentTextInputProps(isDark)}
              />
              {newCommentText.trim().length > 0 && (
                <IconButton
                  name="send"
                  size={32}
                  tone="ghost"
                  color={colors.primary}
                  onPress={submitNewComment}
                />
              )}
            </View>
          </View>
        </View>
      )}
    >
      <View style={styles.body}>
        {(post.threads ?? []).length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No comments yet — be the first to reply.
          </Text>
        )}

        {(post.threads ?? []).map((thread) => (
          <CommunityThreadRow
            key={thread.id}
            thread={thread}
            colors={colors}
            onAuthorPress={onAuthorPress}
            openReply={openReply}
            renderInlineReply={renderInlineReply}
          />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 4 },
  emptyText: { fontSize: 14, lineHeight: 20, paddingVertical: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  threadItem: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  threadTime: { fontSize: 12 },
  threadText: { fontSize: 14.5, lineHeight: 21, marginTop: 2 },
  threadActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionLabel: { fontSize: 12.5, fontWeight: '600' },
  nestedReply: { flexDirection: 'row', gap: 8, marginTop: 10 },
  replyFooter: { gap: 8 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    paddingHorizontal: 20,
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
