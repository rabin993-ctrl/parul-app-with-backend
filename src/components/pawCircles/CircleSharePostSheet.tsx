import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import { Sheet } from '../ui/Sheet';
import { Icon } from '../icons/Icon';
import type { Post } from '../../data/mockData';

function PostPickRow({
  post,
  onPress,
}: {
  post: Post;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const preview = post.text.trim() || (post.mediaUrls?.length ? 'Photo post' : 'Post');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.border, opacity: pressed ? 0.82 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Share post: ${preview}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + '14' }]}>
        <Icon name={post.mediaUrls?.length ? 'image' : 'paw'} size={18} color={colors.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.preview, { color: colors.text }]} numberOfLines={2}>
          {preview}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {post.time}{post.companionName ? ` · with ${post.companionName}` : ''}
        </Text>
      </View>
      <Icon name="chevronRight" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

export function CircleSharePostSheet({
  visible,
  onClose,
  posts,
  onSelectPost,
}: {
  visible: boolean;
  onClose: () => void;
  posts: Post[];
  onSelectPost: (postId: string) => void;
}) {
  const { colors } = useTheme();
  const myPosts = useMemo(
    () => posts.filter(p => p.text.trim() || p.mediaUrls?.length),
    [posts],
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Share feed post">
      <View style={styles.body}>
        {myPosts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No posts yet</Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Create a post on your feed first, then share it here.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Pick a post from your feed to share in this circle
            </Text>
            {myPosts.map(post => (
              <PostPickRow
                key={post.id}
                post={post}
                onPress={() => {
                  onSelectPost(post.id);
                  onClose();
                }}
              />
            ))}
          </>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 0 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: { flex: 1, minWidth: 0, gap: 2 },
  preview: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  meta: { fontSize: 12.5 },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8, paddingHorizontal: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
