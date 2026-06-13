import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Icon } from '../icons/Icon';
import { PostAuthorRow } from './PostAuthorRow';
import { getPostPoster } from '../../utils/postAuthor';
import { type Post, type PostTag } from '../../data/mockData';
import { countFeedThreadComments } from '../../utils/postComments';

export function resolvePostTagKey(post: Post): PostTag {
  if (post.companionAuthorId || post.tag === 'paw-posting') return 'paw-posting';
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
      <Icon name={icon} size={20} color={active ? activeColor : colors.textSecondary} fill={fill && active ? activeColor : 'none'} />
      {count > 0 && (
        <Text style={[styles.reactionCount, { color: active ? activeColor : colors.textSecondary }]}>
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
  onDelete,
  currentUserId,
  compact,
}: {
  post: Post;
  onPaw: () => void;
  onSave: () => void;
  onComments: () => void;
  onForward: () => void;
  onUserPress?: (userId: string) => void;
  onCompanionPress?: (companionId: string) => void;
  onDelete?: () => void;
  currentUserId?: string;
  /** Tighter padding for embedded profile lists */
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const commentCount = countFeedThreadComments(post.threads);
  const poster = getPostPoster(post);
  const mediaTint = poster.type === 'companion' ? poster.companion.tint : poster.user.tint;
  const [textExpanded, setTextExpanded] = useState(false);
  const [textTruncated, setTextTruncated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwn = currentUserId ? post.userId === currentUserId : false;

  return (
    <View style={[styles.post, compact && styles.postCompact]}>
      <View style={styles.postHeader}>
        <PostAuthorRow
          post={post}
          size={44}
          onUserPress={onUserPress}
          onCompanionPress={onCompanionPress}
          trailing={isOwn ? (
            <Pressable
              onPress={() => setMenuOpen(v => !v)}
              hitSlop={8}
              style={{ padding: 4 }}
            >
              <Icon name="more-horizontal" size={18} color={colors.textTertiary} />
            </Pressable>
          ) : undefined}
        />
      </View>

      {menuOpen && isOwn && (
        <View style={[styles.dropMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            onPress={() => { setMenuOpen(false); onDelete?.(); }}
            style={[styles.dropItem, { borderBottomColor: colors.border }]}
          >
            <Icon name="trash" size={15} color={colors.danger} />
            <Text style={[styles.dropItemText, { color: colors.danger }]}>Delete post</Text>
          </Pressable>
        </View>
      )}

      <Text
        style={[styles.postText, { color: colors.text }]}
        numberOfLines={textExpanded ? undefined : 4}
        onTextLayout={e => {
          if (!textExpanded && !textTruncated && e.nativeEvent.lines.length >= 4)
            setTextTruncated(true);
        }}
      >
        {post.text}
      </Text>
      {!textExpanded && textTruncated && (
        <Pressable onPress={() => setTextExpanded(true)}>
          <Text style={[styles.moreLink, { color: colors.primary }]}>more</Text>
        </Pressable>
      )}

      {resolvePostTagKey(post) !== 'lost-found' && (
        <View style={styles.postTagRow}>
          <PostTagPill post={post} />
        </View>
      )}

      {post.images === 1 && (
        <View style={styles.postMedia}>
          <PhotoSlot height={240} imageKey={post.id} imageIndex={0} borderRadius={radius.lg} label="" />
        </View>
      )}
      {post.images === 2 && (
        <View style={[styles.imgGrid2, styles.postMedia]}>
          <PhotoSlot height={160} imageKey={post.id} imageIndex={0} style={{ flex: 1 }} label="" borderRadius={radius.md} />
          <PhotoSlot height={160} imageKey={post.id} imageIndex={1} style={{ flex: 1 }} label="" borderRadius={radius.md} />
        </View>
      )}

      <View style={styles.reactionBar}>
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
        {!isOwn && (
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

    </View>
  );
}

const styles = StyleSheet.create({
  post: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  postCompact: { paddingHorizontal: 0, paddingTop: 12 },
  postHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingBottom: 0 },
  dropMenu: { position: 'absolute', top: 50, right: 16, zIndex: 10, borderRadius: 10, borderWidth: 1, minWidth: 160, overflow: 'hidden' },
  dropItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  dropItemText: { fontSize: 14, fontWeight: '500' },
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
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 6 },
  reactionCount: { fontSize: 13.5, fontWeight: '600' },
});
