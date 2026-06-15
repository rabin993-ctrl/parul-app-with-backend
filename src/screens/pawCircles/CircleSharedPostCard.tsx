import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { Avatar, CompanionAvatar } from '../../components/ui/Avatar';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import type { Post } from '../../data/mockData';
import { useCompanions } from '../../context/CompanionContext';
import { AlertDetailRow } from '../../components/feed/AlertCards';

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
  const { getCompanion } = useCompanions();

  const isCompanionAuthor = !!post.companionAuthorId;
  const companionAuthor = isCompanionAuthor ? getCompanion(post.companionAuthorId!) : null;

  // For "with" posts, show the first tagged companion (explicit selection only)
  const withPet = !isCompanionAuthor && post.companions[0]
    ? getCompanion(post.companions[0])
    : null;

  const humanAuthor = {
    id: post.userId,
    name: post.authorName ?? post.author,
    tint: post.authorTint ?? '#888888',
    avatarUrl: post.authorAvatarUrl,
    avatarFallbackUrl: post.authorAvatarFallbackUrl,
  };

  const displayName = isCompanionAuthor && companionAuthor
    ? companionAuthor.name
    : humanAuthor.name;

  const metaDetail = isCompanionAuthor && companionAuthor
    ? null
    : withPet
      ? `with ${withPet.name}`
      : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? 'View post' : undefined}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftColor: circleTint,
          opacity: pressed && onPress ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <Icon name="paw" size={12} color={circleTint} fill={circleTint} />
        <Text style={[styles.headerLabel, { color: circleTint }]}>
          {post.label === 'lost' ? 'Lost pet alert' : post.label === 'found' ? 'Found pet sighting' : 'Shared from Feed'}
        </Text>
      </View>

      <View style={styles.authorRow}>
        {isCompanionAuthor && companionAuthor ? (
          <CompanionAvatar pet={companionAuthor} size={28} />
        ) : (
          <>
            <Avatar user={humanAuthor} size={28} />
            {withPet && <CompanionAvatar pet={withPet} size={22} />}
          </>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
            {displayName}{metaDetail ? ` · ${metaDetail}` : ''}
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
        <PhotoSlot height={120} uri={post.mediaUrls?.[0]} imageKey={post.id} borderRadius={radius.md} label="" />
      )}

      {post.label === 'lost' && post.lost && (
        <View style={styles.alertDetails}>
          <AlertDetailRow icon="mapPin" label="Last seen" value={post.lost.area} accent={colors.danger} />
          <AlertDetailRow icon="clock" label="When" value={post.lost.lastSeen} accent={colors.danger} />
          <AlertDetailRow icon="phone" label="Contact" value={post.lost.phone} accent={colors.danger} />
        </View>
      )}

      {post.label === 'found' && post.found && (
        <View style={styles.alertDetails}>
          <AlertDetailRow icon="mapPin" label="Found at" value={post.found.area} accent={colors.success} />
          <AlertDetailRow icon="clock" label="When" value={post.found.foundAt} accent={colors.success} />
          <AlertDetailRow icon="phone" label="Contact" value={post.found.phone} accent={colors.success} />
        </View>
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
  alertDetails: { gap: 6, marginTop: 2 },
});
