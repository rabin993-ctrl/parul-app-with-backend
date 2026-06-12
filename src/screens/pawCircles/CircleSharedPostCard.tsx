import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { Avatar, CompanionAvatar } from '../../components/ui/Avatar';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import { Post, users, companions } from '../../data/mockData';

export function CircleSharedPostCard({
  post,
  circleTint,
  onPress,
}: {
  post: Post;
  circleTint: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const author = users[post.userId];
  const pet = post.companions[0] ? companions[post.companions[0]] : null;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftColor: circleTint,
        },
      ]}
    >
      <View style={styles.header}>
        <Icon name="paw" size={12} color={circleTint} fill={circleTint} />
        <Text style={[styles.headerLabel, { color: circleTint }]}>Shared from Feed</Text>
      </View>

      <View style={styles.authorRow}>
        <Avatar user={author} size={28} />
        {pet && <CompanionAvatar pet={pet} size={22} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
            {author?.name}{pet ? ` · ${pet.name}` : ''}
          </Text>
          <Text style={[styles.meta, { color: colors.textTertiary }]} numberOfLines={1}>
            {post.loc} · {post.time}
          </Text>
        </View>
      </View>

      <Text style={[styles.caption, { color: colors.textSecondary }]} numberOfLines={2}>
        {post.text}
      </Text>

      {post.images > 0 && (
        <PhotoSlot height={120} imageKey={post.id} borderRadius={radius.md} label="" />
      )}

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.stat}>
          <Icon name="paw-line" size={13} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>{post.paws}</Text>
        </View>
        <View style={styles.stat}>
          <Icon name="comment" size={13} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>{post.comments}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={[styles.viewLink, { color: circleTint }]}>View post →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
    padding: 12,
    gap: 8,
    maxWidth: '92%',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  headerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  authorName: { fontSize: 13, fontWeight: '700' },
  meta: { fontSize: 11 },
  caption: { fontSize: 13, lineHeight: 18 },
  thumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
  },
  thumbLabel: { fontSize: 12, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, fontWeight: '600' },
  viewLink: { fontSize: 12, fontWeight: '700' },
});
