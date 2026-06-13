import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Icon } from '../icons/Icon';
import { CommunityPost } from '../../data/communityPosts';
import { countCommunityThreadComments } from '../../utils/postComments';
import { CommunityCategoryBadge } from './CommunityChrome';

function HelpfulBtn({
  count,
  active,
  onPress,
}: {
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.helpfulBtn,
        {
          backgroundColor: active ? colors.primary + '14' : colors.surface2,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Icon
        name={active ? 'paw' : 'paw-line'}
        size={16}
        color={active ? colors.primary : colors.textSecondary}
        fill={active ? colors.primary : 'none'}
      />
      <Text style={[styles.helpfulCount, { color: active ? colors.primary : colors.textSecondary }]}>
        {count}
      </Text>
      <Text style={[styles.helpfulLabel, { color: active ? colors.primary : colors.textTertiary }]}>
        Helpful
      </Text>
    </Pressable>
  );
}

function ActionChip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: pressed ? 0.7 : 1 }]}
    >
      <Icon
        name={icon === 'bookmark' && active ? 'bookmark' : icon === 'bookmark' ? 'bookmark-line' : icon}
        size={16}
        color={active ? colors.primary : colors.textSecondary}
      />
      <Text style={[styles.actionLabel, { color: active ? colors.primary : colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function CommunityPostCard({
  post,
  onPress,
  onHelpful,
  onSave,
  onShare,
}: {
  post: CommunityPost;
  onPress: () => void;
  onHelpful: () => void;
  onSave: () => void;
  onShare: () => void;
}) {
  const { colors } = useTheme();
  const commentCount = post.comments > 0 ? post.comments : countCommunityThreadComments(post.threads);
  const author = post.author;
  const authorUser = { id: author?.id, name: author?.name ?? author?.handle ?? 'you', tint: author?.tint ?? '#F2972E' };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.96 : 1 },
      ]}
    >
      <View style={styles.header}>
        <Avatar user={authorUser} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.author, { color: colors.text }]} numberOfLines={1}>
            {author?.name ?? author?.handle ?? post.authorId.slice(0, 8)}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {post.communityName} · {post.time} · {post.loc}
          </Text>
        </View>
        <CommunityCategoryBadge category={post.category} />
      </View>

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {post.title}
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={3}>
        {post.body}
      </Text>

      {post.hasImage && (
        <View style={styles.media}>
          <PhotoSlot
            height={160}
            imageKey={post.id}
            label=""
            borderRadius={radius.md}
          />
        </View>
      )}

      <View style={styles.actions}>
        <HelpfulBtn count={post.helpful} active={post.helpfulByMe} onPress={onHelpful} />
        <ActionChip icon="comment" label={`${commentCount}`} onPress={onPress} />
        <ActionChip
          icon="bookmark"
          label={post.saved ? 'Saved' : 'Save'}
          active={post.saved}
          onPress={onSave}
        />
        <View style={{ flex: 1 }} />
        <Pressable onPress={onShare} hitSlop={8}>
          <Icon name="forward" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 8,
    ...shadows.sm,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  author: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 1 },
  title: { fontSize: 16, fontWeight: '800', lineHeight: 22 },
  body: { fontSize: 13.5, lineHeight: 20 },
  media: { marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  helpfulBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  helpfulCount: { fontSize: 13, fontWeight: '700' },
  helpfulLabel: { fontSize: 11.5, fontWeight: '600' },
  actionLabel: { fontSize: 12.5, fontWeight: '600' },
});
