import React, { useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { MOBILE_INPUT_FONT_SIZE, radius } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { commentTextInputProps } from '../ui/BlankInputAccessory';
import { Icon } from '../icons/Icon';
import { ToastData } from '../ui/Toast';
import { type Post } from '../../data/mockData';
import { useCurrentUserProfile } from '../../context/CurrentUserProfileContext';
import { CommentAuthorLine } from '../ui/CommentAuthorLine';
import { CommentReplyInput } from '../ui/CommentReplyInput';
import { PawCircle } from '../../data/pawCircles';
import { countFeedThreadComments } from '../../utils/postComments';
import {
  MentionPicker, insertMentionToken, shouldOpenMentionPicker,
} from '../MentionPicker';
import { useUserProfile } from '../../hooks/useUserProfile';

type ReplyTarget = {
  threadIndex: number;
  userName: string;
  anchorKey: string;
};

const MENTION_FOOTER_ESTIMATE = 320;

// ── per-thread row (needs hook per item) ──────────────────────────────────────
function ThreadRow({
  thread,
  i,
  colors,
  replyTo,
  onCommentPaw,
  onAuthorPress,
  openReply,
  renderInlineReply,
}: {
  thread: Post['threads'][number];
  i: number;
  colors: ReturnType<typeof useTheme>['colors'];
  replyTo: ReplyTarget | null;
  onCommentPaw?: (threadIndex: number) => void;
  onAuthorPress?: (userId: string) => void;
  openReply: (threadIndex: number, userName: string, anchorKey: string) => void;
  renderInlineReply: (anchorKey: string) => React.ReactNode;
}) {
  const profile = useUserProfile(thread.user);
  const displayName = profile?.name ?? profile?.handle ?? thread.user;
  const threadUser = {
    id: thread.user,
    name: displayName,
    tint: profile?.tint ?? colors.primary,
  };
  const threadAnchor = `thread-${i}`;
  const [pawed, setPawed] = useState(false);

  return (
    <View
      key={`${thread.user}-${thread.time}-${i}`}
      style={styles.threadItem}
    >
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
        {renderInlineReply(threadAnchor)}
        {thread.replies.map((reply, j) => (
          <ReplyRow
            key={j}
            reply={reply}
            i={i}
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

// ── per-reply row ─────────────────────────────────────────────────────────────
function ReplyRow({
  reply,
  i,
  j,
  colors,
  onAuthorPress,
  openReply,
  renderInlineReply,
}: {
  reply: Post['threads'][number]['replies'][number];
  i: number;
  j: number;
  colors: ReturnType<typeof useTheme>['colors'];
  onAuthorPress?: (userId: string) => void;
  openReply: (threadIndex: number, userName: string, anchorKey: string) => void;
  renderInlineReply: (anchorKey: string) => React.ReactNode;
}) {
  const profile = useUserProfile(reply.user);
  const displayName = profile?.name ?? profile?.handle ?? reply.user;
  const ru = {
    id: reply.user,
    name: displayName,
    tint: profile?.tint ?? colors.primary,
  };
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
        {renderInlineReply(replyAnchor)}
      </View>
    </View>
  );
}

// ── main sheet ────────────────────────────────────────────────────────────────
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
  const { colors, isDark } = useTheme();
  const { me } = useCurrentUserProfile();
  const [newCommentText, setNewCommentText] = useState('');
  const [inlineReplyText, setInlineReplyText] = useState('');
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const commentCount = countFeedThreadComments(post.threads);

  const openReply = (threadIndex: number, userName: string, anchorKey: string) => {
    setReplyTo({ threadIndex, userName, anchorKey });
    setInlineReplyText('');
  };

  const cancelReply = () => {
    setReplyTo(null);
    setInlineReplyText('');
  };

  const handleNewCommentChange = (next: string) => {
    if (shouldOpenMentionPicker(next, newCommentText)) setMentionPickerOpen(true);
    else if (mentionPickerOpen && !next.includes('@')) setMentionPickerOpen(false);
    setNewCommentText(next);
  };

  const handleInlineReplyChange = (next: string) => {
    if (shouldOpenMentionPicker(next, inlineReplyText)) setMentionPickerOpen(true);
    else if (mentionPickerOpen && !next.includes('@')) setMentionPickerOpen(false);
    setInlineReplyText(next);
  };

  const onMentionSelect = (token: string) => {
    if (replyTo) {
      setInlineReplyText(t => insertMentionToken(t, token));
    } else {
      setNewCommentText(t => insertMentionToken(t, token));
    }
  };

  const submitNewComment = () => {
    if (!newCommentText.trim()) return;
    onSubmit(newCommentText.trim());
    setNewCommentText('');
    setMentionPickerOpen(false);
    onToast({ msg: 'Comment posted!', icon: 'check', tone: 'success' });
  };

  const submitInlineReply = () => {
    if (!inlineReplyText.trim() || !replyTo) return;
    onSubmit(inlineReplyText.trim(), replyTo.threadIndex);
    setInlineReplyText('');
    setReplyTo(null);
    setMentionPickerOpen(false);
    onToast({ msg: 'Reply posted!', icon: 'check', tone: 'success' });
  };

  const renderInlineReply = (anchorKey: string) => {
    if (replyTo?.anchorKey !== anchorKey) return null;
    return (
      <CommentReplyInput
        replyToName={replyTo.userName}
        value={inlineReplyText}
        onChangeText={handleInlineReplyChange}
        onSubmit={submitInlineReply}
        onCancel={cancelReply}
      />
    );
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      contentKey={`${post.id}-${commentCount}`}
      footerExpandBody
      footerSizeEstimate={mentionPickerOpen ? MENTION_FOOTER_ESTIMATE : undefined}
      footer={(
        <View style={styles.replyFooter}>
          <MentionPicker
            visible={mentionPickerOpen}
            createdCircles={createdCircles}
            joinedCircles={joinedCircles}
            multiSelect
            inline
            onClose={() => setMentionPickerOpen(false)}
            onSelect={onMentionSelect}
          />
          <View style={styles.replyBar}>
            {me && <Avatar user={me} size={32} />}
            <View style={[styles.replyInputWrap, { backgroundColor: colors.surface2 }]}>
              <TextInput
                style={[styles.replyInput, { color: colors.text }]}
                placeholder="Add a comment…"
                placeholderTextColor={colors.textTertiary}
                value={newCommentText}
                onChangeText={handleNewCommentChange}
                autoComplete="off"
                {...commentTextInputProps(isDark)}
              />
              {newCommentText.trim().length > 0 && (
                <IconButton name="send" size={32} tone="ghost" color={colors.primary} onPress={submitNewComment} />
              )}
            </View>
          </View>
        </View>
      )}
    >
      <View style={styles.body}>
        <Text style={[styles.sheetTitle, { color: colors.text }]}>
          Comments{commentCount > 0 ? ` · ${commentCount}` : ''}
        </Text>
        {post.threads.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No comments yet — be the first to reply.
          </Text>
        )}
        {post.threads.map((thread, i) => (
          <ThreadRow
            key={`${thread.user}-${thread.time}-${i}`}
            thread={thread}
            i={i}
            colors={colors}
            replyTo={replyTo}
            onCommentPaw={onCommentPaw}
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
  sheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
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
      web: { outlineStyle: 'none' } as object,
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
