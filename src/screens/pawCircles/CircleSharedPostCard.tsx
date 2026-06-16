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
  fullWidth = false,
  attachedText,
  attachedBubbleBg,
  variant = 'default',
}: {
  post: Post;
  circleTint: string;
  onPress?: () => void;
  fullWidth?: boolean;
  /** Renders a message bubble attached below the card (DM alert replies). */
  attachedText?: string;
  attachedBubbleBg?: string;
  /** Smaller preview layout for compose sheets. */
  variant?: 'default' | 'compact';
}) {
  const { colors } = useTheme();
  const compact = variant === 'compact';
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

  const cardStyle = [
    styles.card,
    fullWidth && styles.cardFullWidth,
    compact && styles.cardCompact,
    compact && {
      backgroundColor: post.label === 'found'
        ? colors.successBg
        : post.label === 'lost'
          ? colors.dangerBg
          : colors.surface,
    },
    !compact && {
      backgroundColor: colors.surface,
    },
    {
      borderColor: colors.border,
      borderLeftColor: circleTint,
    },
  ];

  const cardBody = (
    <>
      {!compact ? (
        <View style={styles.header}>
          <Icon name="paw" size={12} color={circleTint} fill={circleTint} />
          <Text style={[styles.headerLabel, { color: circleTint }]}>
            {post.label === 'lost' ? 'Lost pet alert' : post.label === 'found' ? 'Found pet sighting' : 'Shared from Feed'}
          </Text>
        </View>
      ) : null}

      {!compact ? (
        <>
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
        </>
      ) : (
        <>
          <View style={[styles.compactStrip, { backgroundColor: circleTint }]}>
            <Icon name="alert" size={15} color="#fff" fill="#fff" />
            <Text style={styles.compactStripText}>
              {post.label === 'lost' ? 'Lost pet alert' : post.label === 'found' ? 'Found pet sighting' : 'Shared alert'}
            </Text>
          </View>

          <View style={styles.compactInner}>
            <View style={styles.compactAuthorRow}>
              {isCompanionAuthor && companionAuthor ? (
                <CompanionAvatar pet={companionAuthor} size={34} />
              ) : (
                <>
                  <Avatar user={humanAuthor} size={34} />
                  {withPet && <CompanionAvatar pet={withPet} size={26} />}
                </>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.compactAuthorName, { color: colors.text }]} numberOfLines={1}>
                  {displayName}{metaDetail ? ` · ${metaDetail}` : ''}
                </Text>
                <Text style={[styles.compactAuthorMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {post.loc ? `${post.loc} · ` : ''}{post.time}
                </Text>
              </View>
            </View>

            <Text style={[styles.compactCaption, { color: colors.text }]} numberOfLines={3}>
              {post.text}
            </Text>

            <View style={styles.compactBody}>
              {post.images > 0 ? (
                <PhotoSlot
                  height={112}
                  uri={post.mediaUrls?.[0]}
                  imageKey={`compact-${post.id}`}
                  borderRadius={radius.md}
                  label=""
                  resizeMode="contain"
                  style={styles.compactPhoto}
                />
              ) : null}
              <View style={styles.compactDetails}>
                {post.label === 'lost' && post.lost ? (
                  <>
                    <AlertDetailRow icon="mapPin" label="Last seen" value={post.lost.area} accent={circleTint} emphasis />
                    <AlertDetailRow icon="clock" label="When" value={post.lost.lastSeen} accent={circleTint} emphasis />
                    <AlertDetailRow icon="phone" label="Contact" value={post.lost.phone} accent={circleTint} emphasis />
                  </>
                ) : null}
                {post.label === 'found' && post.found ? (
                  <>
                    <AlertDetailRow icon="mapPin" label="Found at" value={post.found.area} accent={circleTint} emphasis />
                    <AlertDetailRow icon="clock" label="When" value={post.found.foundAt} accent={circleTint} emphasis />
                    <AlertDetailRow icon="paw" label="Looks like" value={post.found.looksLike} accent={circleTint} emphasis />
                    <AlertDetailRow icon="phone" label="Contact" value={post.found.phone} accent={circleTint} emphasis />
                  </>
                ) : null}
              </View>
            </View>
          </View>
        </>
      )}

    </>
  );

  return (
    <View style={cardStyle}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="View post"
          style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
        >
          {cardBody}
        </Pressable>
      ) : (
        cardBody
      )}

      {attachedText ? (
        <View style={[
          styles.attachedBubble,
          compact && styles.attachedBubbleCompact,
          {
            backgroundColor: attachedBubbleBg ?? colors.surface2,
            borderTopColor: colors.border,
          },
        ]}>
          <Text style={[styles.attachedText, { color: colors.text }]}>{attachedText}</Text>
        </View>
      ) : compact ? null : (
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
          {onPress ? (
            <Text style={[styles.viewLink, { color: circleTint }]}>View post →</Text>
          ) : null}
        </View>
      )}
    </View>
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
    overflow: 'hidden',
  },
  cardFullWidth: {
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  cardCompact: {
    padding: 0,
    gap: 0,
    borderLeftWidth: 4,
  },
  compactStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  compactStripText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#fff',
  },
  compactInner: {
    padding: 14,
    gap: 12,
  },
  compactAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactAuthorName: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  compactAuthorMeta: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  compactBody: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  compactPhoto: { width: 104, flexShrink: 0 },
  compactDetails: { flex: 1, minWidth: 0, gap: 10 },
  compactCaption: { fontSize: 16, lineHeight: 23, fontWeight: '700' },
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
  attachedBubble: {
    marginTop: 4,
    marginHorizontal: -12,
    marginBottom: -12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  attachedBubbleCompact: {
    marginTop: 0,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  attachedText: { fontSize: 15, lineHeight: 21 },
});
