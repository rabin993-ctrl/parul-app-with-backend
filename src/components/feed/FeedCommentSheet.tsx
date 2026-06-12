import React, { useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../icons/Icon';
import { ToastData } from '../ui/Toast';
import { users, type Post } from '../../data/mockData';
import { PawCircle } from '../../data/pawCircles';
import { countFeedThreadComments } from '../../utils/postComments';
import {
  MentionPicker, insertMentionToken, shouldOpenMentionPicker,
} from '../MentionPicker';

export function FeedCommentSheet({
  post,
  createdCircles,
  joinedCircles,
  onClose,
  onSubmit,
  onToast,
  onAuthorPress,
}: {
  post: Post;
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  onClose: () => void;
  onSubmit: (text: string, replyToThreadIndex?: number) => void;
  onToast: (t: ToastData) => void;
  onAuthorPress?: (userId: string) => void;
}) {
  const { colors } = useTheme();
  const [replyText, setReplyText] = useState('');
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<{ threadIndex: number; userName: string } | null>(null);
  const commentCount = countFeedThreadComments(post.threads);

  const handleReplyChange = (next: string) => {
    if (shouldOpenMentionPicker(next, replyText)) setMentionPickerOpen(true);
    else if (mentionPickerOpen && !next.includes('@')) setMentionPickerOpen(false);
    setReplyText(next);
  };

  const onMentionSelect = (token: string) => {
    setReplyText(t => insertMentionToken(t, token));
    setMentionPickerOpen(false);
  };

  const submit = () => {
    if (!replyText.trim()) return;
    onSubmit(replyText.trim(), replyTo?.threadIndex);
    setReplyText('');
    setReplyTo(null);
    setMentionPickerOpen(false);
    onToast({ msg: replyTo ? 'Reply posted!' : 'Comment posted!', icon: 'check', tone: 'success' });
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      contentKey={`${post.id}-${commentCount}`}
      footer={(
        <View style={styles.replyFooter}>
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
          <MentionPicker
            visible={mentionPickerOpen}
            createdCircles={createdCircles}
            joinedCircles={joinedCircles}
            onClose={() => setMentionPickerOpen(false)}
            onSelect={onMentionSelect}
          />
          <View style={styles.replyBar}>
            <Avatar user={users.you} size={32} />
            <View style={[styles.replyInputWrap, { backgroundColor: colors.surface2 }]}>
              <TextInput
                style={[styles.replyInput, { color: colors.text }]}
                placeholder={replyTo ? `Reply to ${replyTo.userName}…` : 'Add a comment…'}
                placeholderTextColor={colors.textTertiary}
                value={replyText}
                onChangeText={handleReplyChange}
                autoComplete="off"
              />
              {replyText.trim().length > 0 && (
                <IconButton name="send" size={32} tone="ghost" color={colors.primary} onPress={submit} />
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
        {post.threads.map((thread, i) => {
          const threadUser = users[thread.user];
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
                  <Pressable
                    onPress={() => onAuthorPress?.(thread.user)}
                    disabled={!onAuthorPress}
                    style={({ pressed }) => pressed && { opacity: 0.7 }}
                  >
                    <Text style={[styles.threadUser, { color: colors.text }]}>{threadUser?.name}</Text>
                  </Pressable>
                  <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{thread.time}</Text>
                </View>
                <Text style={[styles.threadText, { color: colors.text }]}>{thread.text}</Text>
                <View style={styles.threadActions}>
                  <Pressable style={styles.actionBtn} hitSlop={6}>
                    <Icon name="paw-line" size={14} color={colors.textTertiary} />
                    <Text style={[styles.actionLabel, { color: colors.textTertiary }]}>Paw</Text>
                  </Pressable>
                  <Pressable
                    hitSlop={6}
                    onPress={() => setReplyTo({ threadIndex: i, userName: threadUser?.name ?? 'user' })}
                  >
                    <Text style={[styles.actionLabel, { color: colors.textTertiary }]}>Reply</Text>
                  </Pressable>
                </View>
                {thread.replies.map((reply, j) => {
                  const ru = users[reply.user];
                  return (
                    <View key={j} style={styles.nestedReply}>
                      <Pressable
                        onPress={() => onAuthorPress?.(reply.user)}
                        disabled={!onAuthorPress}
                        style={({ pressed }) => pressed && { opacity: 0.7 }}
                      >
                        <Avatar user={ru} size={24} />
                      </Pressable>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.nameRow}>
                          <Pressable
                            onPress={() => onAuthorPress?.(reply.user)}
                            disabled={!onAuthorPress}
                            style={({ pressed }) => pressed && { opacity: 0.7 }}
                          >
                            <Text style={[styles.threadUser, { color: colors.text, fontSize: 13 }]}>{ru?.name}</Text>
                          </Pressable>
                          <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{reply.time}</Text>
                        </View>
                        <Text style={[styles.threadText, { color: colors.text, fontSize: 13.5 }]}>{reply.text}</Text>
                        <View style={styles.threadActions}>
                          <Pressable
                            hitSlop={6}
                            onPress={() => setReplyTo({ threadIndex: i, userName: ru?.name ?? 'user' })}
                          >
                            <Text style={[styles.actionLabel, { color: colors.textTertiary }]}>Reply</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
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
  threadUser: { fontSize: 14, fontWeight: '700' },
  threadTime: { fontSize: 12 },
  threadText: { fontSize: 14.5, lineHeight: 21, marginTop: 2 },
  threadActions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionLabel: { fontSize: 12.5, fontWeight: '600' },
  nestedReply: { flexDirection: 'row', gap: 8, marginTop: 10 },
  replyFooter: { gap: 8 },
  replyingTo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  replyingToText: { fontSize: 13 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  replyInputWrap: {
    flex: 1,
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
    fontSize: 14.5,
    paddingVertical: 6,
    ...Platform.select({
      web: { outlineStyle: 'none' } as object,
      default: {},
    }),
  },
});
