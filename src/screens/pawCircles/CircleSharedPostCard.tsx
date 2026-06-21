import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import type { Post } from '../../data/mockData';
import { AlertDetailRow } from '../../components/feed/AlertCards';
import { PostAuthorRow } from '../../components/feed/PostAuthorRow';
import { ChatAttachmentCard, ChatAttachmentOpenLink } from '../../components/chat/ChatAttachmentCard';
import { MentionText } from '../../components/ui/MentionText';

function sourceEyebrow(post: Post): string {
  if (post.label === 'lost') return 'Lost pet alert';
  if (post.label === 'found') return 'Found pet sighting';
  return 'Feed post';
}

function ChatSharedPostPreview({
  post,
  circleTint,
  onPress,
}: {
  post: Post;
  circleTint: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const hasImage = post.images > 0;

  return (
    <ChatAttachmentCard
      label={sourceEyebrow(post)}
      onPress={onPress}
      accessibilityLabel="Open shared post"
      footer={onPress ? <ChatAttachmentOpenLink label="Open post" tint={circleTint} /> : null}
    >
      <PostAuthorRow post={post} size={48} />

      {post.text ? (
        <MentionText style={[styles.chatPreviewText, { color: colors.text }]} numberOfLines={4}>
          {post.text}
        </MentionText>
      ) : null}

      {hasImage ? (
        <PhotoSlot
          height={128}
          uri={post.mediaUrls?.[0]}
          fallbackUri={post.mediaFallbackUrls?.[0]}
          imageKey={`chat-${post.id}`}
          borderRadius={radius.md}
          label=""
          resizeMode="cover"
          style={styles.chatPreviewImage}
        />
      ) : null}

      {post.label === 'lost' && post.lost ? (
        <View style={styles.alertDetails}>
          <AlertDetailRow icon="mapPin" label="Last seen" value={post.lost.area} accent={colors.danger} showWhenEmpty />
          <AlertDetailRow icon="clock" label="When" value={post.lost.lastSeen} accent={colors.danger} showWhenEmpty />
          <AlertDetailRow icon="phone" label="Contact" value={post.lost.phone} accent={colors.danger} showWhenEmpty />
        </View>
      ) : null}

      {post.label === 'found' && post.found ? (
        <View style={styles.alertDetails}>
          <AlertDetailRow icon="mapPin" label="Found at" value={post.found.area} accent={colors.success} showWhenEmpty />
          <AlertDetailRow icon="clock" label="When" value={post.found.foundAt} accent={colors.success} showWhenEmpty />
          <AlertDetailRow icon="phone" label="Contact" value={post.found.phone} accent={colors.success} showWhenEmpty />
        </View>
      ) : null}
    </ChatAttachmentCard>
  );
}

function DefaultSharedPostPreview({
  post,
  circleTint,
  onPress,
}: {
  post: Post;
  circleTint: string;
  onPress?: () => void;
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

        <PostAuthorRow post={post} size={48} />

        {post.text ? (
          <MentionText style={[styles.previewText, { color: colors.text }]} numberOfLines={3}>
            {post.text}
          </MentionText>
        ) : null}

        {post.label === 'lost' && post.lost ? (
          <View style={styles.alertDetails}>
            <AlertDetailRow icon="mapPin" label="Last seen" value={post.lost.area} accent={colors.danger} showWhenEmpty />
            <AlertDetailRow icon="clock" label="When" value={post.lost.lastSeen} accent={colors.danger} showWhenEmpty />
            <AlertDetailRow icon="phone" label="Contact" value={post.lost.phone} accent={colors.danger} showWhenEmpty />
          </View>
        ) : null}

        {post.label === 'found' && post.found ? (
          <View style={styles.alertDetails}>
            <AlertDetailRow icon="mapPin" label="Found at" value={post.found.area} accent={colors.success} showWhenEmpty />
            <AlertDetailRow icon="clock" label="When" value={post.found.foundAt} accent={colors.success} showWhenEmpty />
            <AlertDetailRow icon="phone" label="Contact" value={post.found.phone} accent={colors.success} showWhenEmpty />
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
  hideCaption = false,
  variant = 'default',
}: {
  post: Post;
  circleTint: string;
  onPress?: () => void;
  fullWidth?: boolean;
  hideCaption?: boolean;
  variant?: 'default' | 'compact' | 'chat';
}) {
  const { colors } = useTheme();
  const compact = variant === 'compact';
  const chat = variant === 'chat';

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
    !compact && !chat && {
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
        <PostAuthorRow post={post} size={48} />

        {!hideCaption ? (
          <MentionText style={[styles.compactCaption, { color: colors.text }]} numberOfLines={3}>
            {post.text}
          </MentionText>
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
                <AlertDetailRow icon="mapPin" label="Last seen" value={post.lost.area} accent={circleTint} emphasis showWhenEmpty />
                <AlertDetailRow icon="clock" label="When" value={post.lost.lastSeen} accent={circleTint} emphasis showWhenEmpty />
                <AlertDetailRow icon="phone" label="Contact" value={post.lost.phone} accent={circleTint} emphasis showWhenEmpty />
              </>
            ) : null}
            {post.label === 'found' && post.found ? (
              <>
                <AlertDetailRow icon="mapPin" label="Found at" value={post.found.area} accent={circleTint} emphasis showWhenEmpty />
                <AlertDetailRow icon="clock" label="When" value={post.found.foundAt} accent={circleTint} emphasis showWhenEmpty />
                {!hideCaption ? (
                  <AlertDetailRow icon="paw" label="Looks like" value={post.found.looksLike} accent={circleTint} emphasis showWhenEmpty />
                ) : null}
                <AlertDetailRow icon="phone" label="Contact" value={post.found.phone} accent={circleTint} emphasis showWhenEmpty />
              </>
            ) : null}
          </View>
        </View>
      </View>
    </>
  );

  if (chat) {
    return (
      <View style={styles.chatWrap}>
        <ChatSharedPostPreview
          post={post}
          circleTint={circleTint}
          onPress={onPress}
        />
      </View>
    );
  }

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
        />
      )}
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
  chatWrap: {
    width: '100%',
    gap: 6,
  },
  chatPreviewText: {
    ...typography.bodySm,
    fontSize: 15,
    lineHeight: 22,
  },
  chatPreviewImage: {
    width: '100%',
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
});
