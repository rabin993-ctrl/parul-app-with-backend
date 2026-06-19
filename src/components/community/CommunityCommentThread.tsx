import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { MOBILE_INPUT_FONT_SIZE, radius } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Icon } from '../icons/Icon';
import { CommunityThread } from '../../data/communityPosts';
import { CommentAuthorLine } from '../ui/CommentAuthorLine';
import { MentionText } from '../ui/MentionText';
import { countCommunityThreadComments } from '../../utils/postComments';
import { useAuth } from '../../context/AuthContext';

function authorLabel(thread: import('../../data/communityPosts').CommunityThread | import('../../data/communityPosts').CommunityReply) {
  return thread.author?.name ?? thread.author?.handle ?? thread.userId;
}

function CommentRow({
  thread,
  onReply,
  onAuthorPress,
}: {
  thread: CommunityThread;
  onReply: (threadId: string, userName: string) => void;
  onAuthorPress?: (userId: string) => void;
}) {
  const { colors } = useTheme();
  const authorUser = { id: thread.userId, name: thread.author?.name ?? thread.author?.handle ?? thread.userId, tint: thread.author?.tint ?? '#F2972E' };

  return (
    <View style={styles.commentBlock}>
      <View style={styles.commentRow}>
        <Pressable
          onPress={() => onAuthorPress?.(thread.userId)}
          disabled={!onAuthorPress}
          style={({ pressed }) => pressed && { opacity: 0.7 }}
        >
          <Avatar user={authorUser} size={32} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={styles.commentHead}>
            <CommentAuthorLine
              userId={thread.userId}
              authorProfile={thread.author}
              fontSize={13.5}
              onAuthorPress={onAuthorPress}
            />
            <Text style={[styles.commentTime, { color: colors.textTertiary }]}>{thread.time}</Text>
          </View>
          <MentionText style={[styles.commentText, { color: colors.text }]}>
            {thread.text}
          </MentionText>
          {thread.helpful > 0 && (
            <Text style={[styles.helpfulMeta, { color: colors.textTertiary }]}>
              {thread.helpful} found helpful
            </Text>
          )}
          <Pressable onPress={() => onReply(thread.id, authorLabel(thread))} hitSlop={6} style={{ marginTop: 6 }}>
            <Text style={[styles.replyBtn, { color: colors.textTertiary }]}>Reply</Text>
          </Pressable>
        </View>
      </View>
      {(thread.replies ?? []).map(reply => {
        const replyAuthorUser = { id: reply.userId, name: reply.author?.name ?? reply.author?.handle ?? reply.userId, tint: reply.author?.tint ?? '#F2972E' };
        return (
          <View key={reply.id} style={[styles.replyRow, { borderLeftColor: colors.border }]}>
            <Pressable
              onPress={() => onAuthorPress?.(reply.userId)}
              disabled={!onAuthorPress}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <Avatar user={replyAuthorUser} size={26} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <View style={styles.commentHead}>
                <CommentAuthorLine
                  userId={reply.userId}
                  authorProfile={reply.author}
                  fontSize={12.5}
                  onAuthorPress={onAuthorPress}
                />
                <Text style={[styles.commentTime, { color: colors.textTertiary }]}>{reply.time}</Text>
              </View>
              <MentionText style={[styles.replyText, { color: colors.text }]}>
                {reply.text}
              </MentionText>
              <Pressable onPress={() => onReply(thread.id, authorLabel(reply))} hitSlop={6} style={{ marginTop: 4 }}>
                <Text style={[styles.replyBtn, { color: colors.textTertiary }]}>Reply</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function CommunityCommentThread({
  threads,
  onSubmit,
  onAuthorPress,
}: {
  threads: CommunityThread[];
  onSubmit: (text: string, replyToThreadId?: string) => void;
  onAuthorPress?: (userId: string) => void;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const meUser = { id: user?.id ?? 'you', name: user?.email?.split('@')[0] ?? 'Me', tint: '#F2972E' };
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ threadId: string; userName: string } | null>(null);
  const commentCount = countCommunityThreadComments(threads ?? []);

  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim(), replyTo?.threadId);
    setText('');
    setReplyTo(null);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Comments{commentCount > 0 ? ` · ${commentCount}` : ''}
      </Text>

      {(threads ?? []).length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          No comments yet — be the first to help.
        </Text>
      ) : (
        <View style={{ gap: 16 }}>
          {(threads ?? []).map(t => (
            <CommentRow
              key={t.id}
              thread={t}
              onReply={(threadId, userName) => setReplyTo({ threadId, userName })}
              onAuthorPress={onAuthorPress}
            />
          ))}
        </View>
      )}

      {replyTo && (
        <View style={[styles.replyingTo, { backgroundColor: colors.surface2 }]}>
          <Text style={[styles.replyingToText, { color: colors.textSecondary }]}>
            Replying to <Text style={{ color: colors.text, fontWeight: '700' }}>{replyTo.userName}</Text>
          </Text>
          <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
            <Icon name="close" size={16} color={colors.textTertiary} />
          </Pressable>
        </View>
      )}

      <View style={[styles.inputRow, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
        <Avatar user={meUser} size={32} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={replyTo ? `Reply to ${replyTo.userName}…` : 'Add a helpful reply…'}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { color: colors.text }]}
          multiline
        />
        <Button size="sm" variant="primary" onPress={submit} disabled={!text.trim()}>
          Post
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  empty: { fontSize: 13.5, lineHeight: 20 },
  commentBlock: { gap: 10 },
  commentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentTime: { fontSize: 11.5 },
  commentText: { fontSize: 13.5, lineHeight: 20, marginTop: 2 },
  helpfulMeta: { fontSize: 11.5, marginTop: 4 },
  replyBtn: { fontSize: 12.5, fontWeight: '600' },
  replyRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 42,
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
  replyText: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  replyingTo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  replyingToText: { fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 4,
  },
  input: {
    flex: 1,
    fontSize: MOBILE_INPUT_FONT_SIZE,
    lineHeight: 20,
    maxHeight: 100,
    paddingVertical: 4,
  },
});
