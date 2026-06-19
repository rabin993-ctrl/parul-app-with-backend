import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { Avatar, CompanionAvatar } from '../../components/ui/Avatar';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import type { Post } from '../../data/mockData';
import { useCompanions } from '../../context/CompanionContext';
import { AlertDetailRow } from '../../components/feed/AlertCards';

function sourceEyebrow(post: Post): string {
  if (post.label === 'lost') return 'Lost pet alert';
  if (post.label === 'found') return 'Found pet sighting';
  return 'Feed post';
}

function SharedPostAuthor({
  post,
  displayName,
  metaDetail,
  isCompanionAuthor,
  companionAuthor,
  humanAuthor,
  withPet,
}: {
  post: Post;
  displayName: string;
  metaDetail: string | null;
  isCompanionAuthor: boolean;
  companionAuthor: ReturnType<ReturnType<typeof useCompanions>['getCompanion']>;
  humanAuthor: { id: string; name: string; tint: string; avatarUrl?: string; avatarFallbackUrl?: string };
  withPet: ReturnType<ReturnType<typeof useCompanions>['getCompanion']>;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.authorRow}>
      <View style={styles.authorAvatars}>
        {isCompanionAuthor && companionAuthor ? (
          <CompanionAvatar pet={companionAuthor} size={34} />
        ) : (
          <>
            <Avatar user={humanAuthor} size={34} />
            {withPet ? (
              <View style={[styles.withPetAvatar, { borderColor: colors.surface }]}>
                <CompanionAvatar pet={withPet} size={22} />
              </View>
            ) : null}
          </>
        )}
      </View>
      <View style={styles.authorCopy}>
        <Text style={[styles.authorName, { color: colors.text }]} numberOfLines={1}>
          {displayName}
          {metaDetail ? (
            <Text style={[styles.authorMetaInline, { color: colors.textSecondary }]}>
              {' · '}{metaDetail}
            </Text>
          ) : null}
        </Text>
        <Text style={[styles.authorTime, { color: colors.textTertiary }]} numberOfLines={1}>
          {post.time}
        </Text>
      </View>
    </View>
  );
}

function DefaultSharedPostPreview({
  post,
  circleTint,
  onPress,
  displayName,
  metaDetail,
  isCompanionAuthor,
  companionAuthor,
  humanAuthor,
  withPet,
}: {
  post: Post;
  circleTint: string;
  onPress?: () => void;
  displayName: string;
  metaDetail: string | null;
  isCompanionAuthor: boolean;
  companionAuthor: ReturnType<ReturnType<typeof useCompanions>['getCompanion']>;
  humanAuthor: { id: string; name: string; tint: string; avatarUrl?: string; avatarFallbackUrl?: string };
  withPet: ReturnType<ReturnType<typeof useCompanions>['getCompanion']>;
}) {
  const { colors } = useTheme();
  const hasImage = post.images > 0;
  const showPaws = post.paws > 0;
  const showComments = post.comments > 0;
  const showEngagement = showPaws || showComments;

  const body = (
    <>
      {hasImage ? (
        <PhotoSlot
          height={148}
          uri={post.mediaUrls?.[0]}
          fallbackUri={post.mediaFallbackUrls?.[0]}
          imageKey={post.id}
          borderRadius={0}
          label=""
          resizeMode="cover"
          style={styles.heroImage}
        />
      ) : null}

      <View style={styles.previewBody}>
        <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>
          {sourceEyebrow(post)}
        </Text>

        <SharedPostAuthor
          post={post}
          displayName={displayName}
          metaDetail={metaDetail}
          isCompanionAuthor={isCompanionAuthor}
          companionAuthor={companionAuthor}
          humanAuthor={humanAuthor}
          withPet={withPet}
        />

        {post.text ? (
          <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={3}>
            {post.text}
          </Text>
        ) : null}

        {post.label === 'lost' && post.lost ? (
          <View style={styles.alertDetails}>
            <AlertDetailRow icon="mapPin" label="Last seen" value={post.lost.area} accent={colors.danger} />
            <AlertDetailRow icon="clock" label="When" value={post.lost.lastSeen} accent={colors.danger} />
            <AlertDetailRow icon="phone" label="Contact" value={post.lost.phone} accent={colors.danger} />
          </View>
        ) : null}

        {post.label === 'found' && post.found ? (
          <View style={styles.alertDetails}>
            <AlertDetailRow icon="mapPin" label="Found at" value={post.found.area} accent={colors.success} />
            <AlertDetailRow icon="clock" label="When" value={post.found.foundAt} accent={colors.success} />
            <AlertDetailRow icon="phone" label="Contact" value={post.found.phone} accent={colors.success} />
          </View>
        ) : null}

        {(showEngagement || onPress) ? (
          <View style={styles.previewFooter}>
            {showEngagement ? (
              <View style={styles.engagementRow}>
                {showPaws ? (
                  <View style={[styles.engagementChip, { backgroundColor: colors.surface2 }]}>
                    <Icon name="paw-line" size={13} color={colors.textSecondary} />
                    <Text style={[styles.engagementText, { color: colors.textSecondary }]}>
                      {post.paws}
                    </Text>
                  </View>
                ) : null}
                {showComments ? (
                  <View style={[styles.engagementChip, { backgroundColor: colors.surface2 }]}>
                    <Icon name="comment" size={13} color={colors.textSecondary} />
                    <Text style={[styles.engagementText, { color: colors.textSecondary }]}>
                      {post.comments}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View />
            )}
            {onPress ? (
              <View style={styles.openRow}>
                <Text style={[styles.openLabel, { color: circleTint }]}>Open post</Text>
                <Icon name="chevronRight" size={14} color={circleTint} />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="View post"
      style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
    >
      {body}
    </Pressable>
  );
}

export function CircleSharedPostCard({
  post,
  circleTint,
  onPress,
  fullWidth = false,
  attachedText,
  attachedBubbleBg,
  hideCaption = false,
  variant = 'default',
}: {
  post: Post;
  circleTint: string;
  onPress?: () => void;
  fullWidth?: boolean;
  attachedText?: string;
  attachedBubbleBg?: string;
  hideCaption?: boolean;
  variant?: 'default' | 'compact';
}) {
  const { colors } = useTheme();
  const compact = variant === 'compact';
  const { getCompanion } = useCompanions();

  const isCompanionAuthor = !!post.companionAuthorId;
  const companionAuthor = isCompanionAuthor ? getCompanion(post.companionAuthorId!) : null;
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
      borderLeftColor: circleTint,
    },
    !compact && {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
  ];

  const compactBody = (
    <>
      <View style={[styles.compactStrip, { backgroundColor: circleTint }]}>
        <Icon name="alert" size={15} color="#fff" fill="#fff" />
        <Text style={styles.compactStripText}>
          {post.label === 'lost' ? 'Lost pet alert' : post.label === 'found' ? 'Found pet sighting' : 'Shared alert'}
        </Text>
      </View>

      <View style={styles.compactInner}>
        <SharedPostAuthor
          post={post}
          displayName={displayName}
          metaDetail={metaDetail}
          isCompanionAuthor={isCompanionAuthor}
          companionAuthor={companionAuthor}
          humanAuthor={humanAuthor}
          withPet={withPet}
        />

        {!hideCaption ? (
          <Text style={[styles.compactCaption, { color: colors.text }]} numberOfLines={3}>
            {post.text}
          </Text>
        ) : null}

        <View style={[styles.compactBody, hideCaption && styles.compactBodyChat]}>
          {post.images > 0 ? (
            <PhotoSlot
              height={hideCaption ? 108 : 112}
              uri={post.mediaUrls?.[0]}
              fallbackUri={post.mediaFallbackUrls?.[0]}
              imageKey={`compact-${post.id}`}
              borderRadius={radius.md}
              label=""
              resizeMode="cover"
              style={hideCaption ? styles.compactPhotoChat : styles.compactPhoto}
            />
          ) : null}
          <View style={[styles.compactDetails, hideCaption && styles.compactDetailsChat]}>
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
                {!hideCaption ? (
                  <AlertDetailRow icon="paw" label="Looks like" value={post.found.looksLike} accent={circleTint} emphasis />
                ) : null}
                <AlertDetailRow icon="phone" label="Contact" value={post.found.phone} accent={circleTint} emphasis />
              </>
            ) : null}
          </View>
        </View>
      </View>
    </>
  );

  return (
    <View style={cardStyle}>
      {compact ? (
        onPress ? (
          <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="View post"
            style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}
          >
            {compactBody}
          </Pressable>
        ) : (
          compactBody
        )
      ) : (
        <DefaultSharedPostPreview
          post={post}
          circleTint={circleTint}
          onPress={onPress}
          displayName={displayName}
          metaDetail={metaDetail}
          isCompanionAuthor={isCompanionAuthor}
          companionAuthor={companionAuthor}
          humanAuthor={humanAuthor}
          withPet={withPet}
        />
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '92%',
    overflow: 'hidden',
  },
  cardFullWidth: {
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  cardCompact: {
    borderLeftWidth: 4,
    gap: 0,
  },
  heroImage: {
    width: '100%',
  },
  previewBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
  },
  eyebrow: {
    ...typography.sectionLabel,
    fontSize: 10,
    letterSpacing: 0.9,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  withPetAvatar: {
    marginLeft: -10,
    borderWidth: 2,
    borderRadius: 999,
  },
  authorCopy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  authorName: {
    ...typography.title,
    fontSize: 14.5,
  },
  authorMetaInline: {
    fontWeight: '500',
  },
  authorTime: {
    ...typography.meta,
  },
  previewText: {
    ...typography.bodySm,
    fontSize: 15,
    lineHeight: 22,
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 2,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  engagementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  engagementText: {
    fontSize: 12,
    fontWeight: '600',
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
  },
  openLabel: {
    fontSize: 13,
    fontWeight: '700',
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
  compactBody: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  compactBodyChat: { flexDirection: 'column', gap: 10 },
  compactPhoto: { width: 104, flexShrink: 0 },
  compactPhotoChat: { width: '100%', flexShrink: 0 },
  compactDetails: { flex: 1, minWidth: 0, gap: 10 },
  compactDetailsChat: { width: '100%', flex: 0 },
  compactCaption: { fontSize: 16, lineHeight: 23, fontWeight: '700' },
  alertDetails: { gap: 6 },
  attachedBubble: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachedBubbleCompact: {
    marginTop: 0,
  },
  attachedText: { fontSize: 15, lineHeight: 21 },
});
