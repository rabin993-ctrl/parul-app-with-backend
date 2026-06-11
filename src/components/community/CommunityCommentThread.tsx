import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { CommunityThread } from '../../data/communityPosts';
import { users } from '../../data/mockData';

function CommentRow({ thread }: { thread: CommunityThread }) {
  const { colors } = useTheme();
  const user = users[thread.userId];

  return (
    <View style={styles.commentBlock}>
      <View style={styles.commentRow}>
        <Avatar user={user} size={32} />
        <View style={{ flex: 1 }}>
          <View style={styles.commentHead}>
            <Text style={[styles.commentAuthor, { color: colors.text }]}>{user.name}</Text>
            <Text style={[styles.commentTime, { color: colors.textTertiary }]}>{thread.time}</Text>
          </View>
          <Text style={[styles.commentText, { color: colors.text }]}>{thread.text}</Text>
          {thread.helpful > 0 && (
            <Text style={[styles.helpfulMeta, { color: colors.textTertiary }]}>
              {thread.helpful} found helpful
            </Text>
          )}
        </View>
      </View>
      {thread.replies.map(reply => {
        const ru = users[reply.userId];
        return (
          <View key={reply.id} style={[styles.replyRow, { borderLeftColor: colors.border }]}>
            <Avatar user={ru} size={26} />
            <View style={{ flex: 1 }}>
              <View style={styles.commentHead}>
                <Text style={[styles.replyAuthor, { color: colors.text }]}>{ru.name}</Text>
                <Text style={[styles.commentTime, { color: colors.textTertiary }]}>{reply.time}</Text>
              </View>
              <Text style={[styles.replyText, { color: colors.text }]}>{reply.text}</Text>
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
}: {
  threads: CommunityThread[];
  onSubmit: (text: string) => void;
}) {
  const { colors } = useTheme();
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text);
    setText('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Comments {threads.length > 0 ? `(${threads.length})` : ''}
      </Text>

      {threads.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          No comments yet — be the first to help.
        </Text>
      ) : (
        <View style={{ gap: 16 }}>
          {threads.map(t => <CommentRow key={t.id} thread={t} />)}
        </View>
      )}

      <View style={[styles.inputRow, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
        <Avatar user={users.you} size={32} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a helpful reply…"
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
  commentAuthor: { fontSize: 13.5, fontWeight: '700' },
  commentTime: { fontSize: 11.5 },
  commentText: { fontSize: 13.5, lineHeight: 20, marginTop: 2 },
  helpfulMeta: { fontSize: 11.5, marginTop: 4 },
  replyRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 42,
    paddingLeft: 12,
    borderLeftWidth: 2,
  },
  replyAuthor: { fontSize: 12.5, fontWeight: '700' },
  replyText: { fontSize: 13, lineHeight: 18, marginTop: 2 },
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
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 100,
    paddingVertical: 4,
  },
});
