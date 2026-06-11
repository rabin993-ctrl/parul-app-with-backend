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
import { CommunityPost } from '../../data/communityPosts';
import { users } from '../../data/mockData';

export function CommunityCommentSheet({
  post,
  onClose,
  onSubmit,
  onToast,
  onAuthorPress,
}: {
  post: CommunityPost;
  onClose: () => void;
  onSubmit: (text: string) => void;
  onToast: (t: ToastData) => void;
  onAuthorPress?: (userId: string) => void;
}) {
  const { colors } = useTheme();
  const [replyText, setReplyText] = useState('');

  const submit = () => {
    if (!replyText.trim()) return;
    onSubmit(replyText.trim());
    setReplyText('');
    onToast({ msg: 'Comment posted!', icon: 'check', tone: 'success' });
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      contentKey={`${post.id}-${post.threads.length}`}
      footer={(
        <View style={styles.replyBar}>
          <Avatar user={users.you} size={32} />
          <View style={[styles.replyInputWrap, { backgroundColor: colors.surface2 }]}>
            <TextInput
              style={[styles.replyInput, { color: colors.text }]}
              placeholder="Add a comment…"
              placeholderTextColor={colors.textTertiary}
              value={replyText}
              onChangeText={setReplyText}
              autoComplete="off"
            />
            {replyText.trim().length > 0 && (
              <IconButton
                name="send"
                size={32}
                tone="ghost"
                color={colors.primary}
                onPress={submit}
              />
            )}
          </View>
        </View>
      )}
    >
      <View style={styles.body}>
        <Text style={[styles.sheetTitle, { color: colors.text }]}>
          Comments{post.comments > 0 ? ` · ${post.comments}` : ''}
        </Text>

        {post.threads.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No comments yet — be the first to reply.
          </Text>
        )}

        {post.threads.map((thread, i) => {
          const author = users[thread.userId];
          return (
            <View
              key={thread.id}
              style={[
                styles.threadItem,
                i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Pressable
                onPress={() => onAuthorPress?.(thread.userId)}
                disabled={!onAuthorPress}
                style={({ pressed }) => pressed && { opacity: 0.7 }}
              >
                <Avatar user={author} size={32} />
              </Pressable>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.nameRow}>
                  <Pressable
                    onPress={() => onAuthorPress?.(thread.userId)}
                    disabled={!onAuthorPress}
                    style={({ pressed }) => pressed && { opacity: 0.7 }}
                  >
                    <Text style={[styles.threadUser, { color: colors.text }]}>{author?.name}</Text>
                  </Pressable>
                  <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{thread.time}</Text>
                </View>
                <Text style={[styles.threadText, { color: colors.text }]}>{thread.text}</Text>
                <View style={styles.threadActions}>
                  <Pressable style={styles.actionBtn} hitSlop={6}>
                    <Icon name="paw-line" size={14} color={colors.textTertiary} />
                    <Text style={[styles.actionLabel, { color: colors.textTertiary }]}>Paw</Text>
                  </Pressable>
                  <Pressable hitSlop={6}>
                    <Text style={[styles.actionLabel, { color: colors.textTertiary }]}>Reply</Text>
                  </Pressable>
                </View>

                {thread.replies.map(reply => {
                  const ru = users[reply.userId];
                  return (
                    <View key={reply.id} style={styles.nestedReply}>
                      <Pressable
                        onPress={() => onAuthorPress?.(reply.userId)}
                        disabled={!onAuthorPress}
                        style={({ pressed }) => pressed && { opacity: 0.7 }}
                      >
                        <Avatar user={ru} size={24} />
                      </Pressable>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.nameRow}>
                          <Pressable
                            onPress={() => onAuthorPress?.(reply.userId)}
                            disabled={!onAuthorPress}
                            style={({ pressed }) => pressed && { opacity: 0.7 }}
                          >
                            <Text style={[styles.threadUser, { color: colors.text, fontSize: 13 }]}>
                              {ru?.name}
                            </Text>
                          </Pressable>
                          <Text style={[styles.threadTime, { color: colors.textTertiary }]}>{reply.time}</Text>
                        </View>
                        <Text style={[styles.threadText, { color: colors.text, fontSize: 13.5 }]}>
                          {reply.text}
                        </Text>
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
