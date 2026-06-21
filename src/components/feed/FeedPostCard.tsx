import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { PhotoSlot } from '../ui/PhotoSlot';
import { PhotoViewerModal } from '../ui/PhotoViewerModal';
import { Icon } from '../icons/Icon';
import { PostAuthorRow } from './PostAuthorRow';
import { PostOwnerMenu } from './PostOwnerMenu';
import { MentionText } from '../ui/MentionText';
import { getPostPoster } from '../../utils/postAuthor';
import { type Post, type PostTag } from '../../data/mockData';
import { countFeedThreadComments } from '../../utils/postComments';
import { getPostImageUrls } from '../../utils/postMedia';

export function resolvePostTagKey(post: Post): PostTag {
  if (post.companionAuthorId || post.tag === 'paw-posting') return 'paw-posting';
  if (post.label === 'meme' || post.tag === 'meme') return 'meme';
  if (post.tag) return post.tag;
  if (post.label === 'adoption') return 'adoption';
  if (post.label === 'lost' || post.label === 'found') return 'lost-found';
  if (post.label === 'rescue') return 'rescue';
  return 'discussion';
}

function PostTagPill({ post }: { post: Post }) {
  const { postTag } = useTheme();
  const tag = postTag(resolvePostTagKey(post));
  return (
    <View style={[styles.postTag, { backgroundColor: tag.bg }]}>
      <Text style={[styles.postTagText, { color: tag.text }]}>{tag.label}</Text>
    </View>
  );
}

function ReactionBtn({ icon, count, active, activeColor, fill, onPress }: {
  icon: string; count: number; active?: boolean; activeColor: string; fill?: boolean; onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.reactionBtn}>
      <Icon name={icon} size={20} color={active ? activeColor : colors.text} fill={fill && active ? activeColor : 'none'} />
      {count > 0 && (
        <Text style={[styles.reactionCount, { color: active ? activeColor : colors.text }]}>
          {count}
        </Text>
      )}
    </Pressable>
  );
}

export function FeedPostCard({
  post,
  onPaw,
  onSave,
  onComments,
  onForward,
  onUserPress,
  onCompanionPress,
  onEdit,
  onDelete,
  isOwner = false,
  compact,
}: {
  post: Post;
  onPaw: () => void;
  onSave: () => void;
  onComments: () => void;
  onForward: () => void;
  onUserPress?: (userId: string) => void;
  onCompanionPress?: (companionId: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isOwner?: boolean;
  /** @deprecated use isOwner */
  currentUserId?: string;
  /** Tighter padding for embedded profile lists */
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const commentCount = countFeedThreadComments(post.threads);
  const poster = getPostPoster(post);
  const [textExpanded, setTextExpanded] = useState(false);
  const [textTruncated, setTextTruncated] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const showOwnerMenu = isOwner && (onEdit || onDelete);
  const imageUrls = useMemo(() => getPostImageUrls(post), [post]);
  const caption = post.text?.trim() ?? '';
  const hasCaption = caption.length > 0;
  const isGalleryPhoto = post.companionContentStyle === 'gallery' && imageUrls.length > 0;
  const showTag = resolvePostTagKey(post) !== 'lost-found';
  const openViewer = (index: number) => setViewerIndex(index);

  const mediaBlock = imageUrls.length === 1 ? (
    <View style={styles.postMedia}>
      <PhotoSlot
        height={240}
        uri={imageUrls[0]}
        fallbackUri={post.mediaFallbackUrls?.[0]}
        imageKey={post.id}
        imageIndex={0}
        borderRadius={radius.lg}
        label=""
        onPress={() => openViewer(0)}
      />
    </View>
  ) : imageUrls.length >= 2 ? (
    <View style={[styles.imgGrid2, styles.postMedia]}>
      <PhotoSlot
        height={160}
        uri={imageUrls[0]}
        fallbackUri={post.mediaFallbackUrls?.[0]}
        imageKey={post.id}
        imageIndex={0}
        style={{ flex: 1 }}
        label=""
        borderRadius={radius.md}
        onPress={() => openViewer(0)}
      />
      <PhotoSlot
        height={160}
        uri={imageUrls[1]}
        fallbackUri={post.mediaFallbackUrls?.[1]}
        imageKey={post.id}
        imageIndex={1}
        style={{ flex: 1 }}
        label=""
        borderRadius={radius.md}
        onPress={() => openViewer(1)}
      />
    </View>
  ) : null;

  const captionBlock = hasCaption ? (
    <>
      <MentionText
        style={[styles.postText, { color: colors.text }]}
        numberOfLines={textExpanded ? undefined : 4}
        onTextLayout={e => {
          if (!textExpanded && !textTruncated && e.nativeEvent.lines.length >= 4)
            setTextTruncated(true);
        }}
      >
        {post.text}
      </MentionText>
      {!textExpanded && textTruncated && (
        <Pressable onPress={() => setTextExpanded(true)}>
          <Text style={[styles.moreLink, { color: colors.primary }]}>more</Text>
        </Pressable>
      )}
    </>
  ) : null;

  const tagBlock = showTag ? (
    <View style={styles.postTagRow}>
      <PostTagPill post={post} />
    </View>
  ) : null;

  return (
    <View style={[styles.post, compact && styles.postCompact]}>
      <View style={styles.postHeader}>
        <PostAuthorRow
          post={post}
          size={48}
          onUserPress={onUserPress}
          onCompanionPress={onCompanionPress}
          trailing={showOwnerMenu ? (
            <PostOwnerMenu onEdit={onEdit} onDelete={onDelete} />
          ) : undefined}
        />
      </View>

      {isGalleryPhoto ? (
        <>
          {mediaBlock}
          {captionBlock}
          {tagBlock}
        </>
      ) : (
        <>
          {captionBlock}
          {tagBlock}
          {mediaBlock}
        </>
      )}

      <View style={[styles.reactionBar, compact && styles.reactionBarCompact]}>
        <ReactionBtn
          icon={post.reacted ? 'paw' : 'paw-line'}
          count={post.paws}
          active={post.reacted}
          activeColor={colors.primary}
          fill={post.reacted}
          onPress={onPaw}
        />
        <ReactionBtn icon="comment" count={commentCount} activeColor={colors.accent} onPress={onComments} />
        <ReactionBtn icon="forward" count={post.forwards} activeColor={colors.accent} onPress={onForward} />
        <View style={{ flex: 1 }} />
        {!isOwner && (
          <ReactionBtn
            icon={post.saved ? 'bookmark' : 'bookmark-line'}
            count={0}
            active={post.saved}
            activeColor={colors.primary}
            fill={post.saved}
            onPress={onSave}
          />
        )}
      </View>

      <PhotoViewerModal
        visible={viewerIndex != null}
        images={imageUrls}
        initialIndex={viewerIndex ?? 0}
        caption={post.text}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  post: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  postCompact: { paddingHorizontal: 0, paddingTop: 12, paddingBottom: 0 },
  postHeader: { width: '100%', paddingBottom: 0 },
  postText: { fontSize: 15.5, lineHeight: 23, paddingTop: 10, paddingBottom: 0 },
  moreLink: { fontSize: 14, fontWeight: '600', marginTop: 3 },
  postTagRow: { paddingTop: 8 },
  postTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  postTagText: { fontSize: 12, fontWeight: '700' },
  postMedia: { paddingTop: 12 },
  imgGrid2: { flexDirection: 'row', gap: 6 },
  reactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 4,
    marginTop: 4,
  },
  reactionBarCompact: {
    paddingVertical: 6,
    marginTop: 2,
  },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 6 },
  reactionCount: { fontSize: 13.5, fontWeight: '600' },
});
