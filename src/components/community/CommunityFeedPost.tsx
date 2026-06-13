import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { CommunityPostAuthorRow } from './CommunityPostAuthorRow';
export { CommunitySourcePill } from './CommunitySourcePill';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Icon } from '../icons/Icon';
import { CommunityPost } from '../../data/communityPosts';
import { countCommunityThreadComments } from '../../utils/postComments';
import { CommunityPostLabelBadge } from './CommunityChrome';

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

export function CommunityFeedPost({
  post,
  communityTint,
  communityIcon,
  onPress,
  onComments,
  onCommunityPress,
  onCompanionPress,
  onAuthorPress,
  onHelpful,
  onSave,
  onShare,
}: {
  post: CommunityPost;
  communityTint: string;
  communityIcon: string;
  onPress: () => void;
  onComments?: () => void;
  onCommunityPress?: () => void;
  onCompanionPress?: (companionId: string) => void;
  onAuthorPress?: (userId: string) => void;
  onHelpful: () => void;
  onSave: () => void;
  onShare: () => void;
}) {
  const openComments = onComments ?? onPress;
  const { colors } = useTheme();
  const commentCount = post.comments > 0 ? post.comments : countCommunityThreadComments(post.threads);
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const [bodyTruncated, setBodyTruncated] = useState(false);

  return (
    <View style={styles.post}>
      <CommunityPostAuthorRow
        post={post}
        communityTint={communityTint}
        communityIcon={communityIcon}
        onCommunityPress={onCommunityPress}
        onCompanionPress={onCompanionPress}
        onAuthorPress={onAuthorPress}
      />

      <Text
        style={[styles.bodyText, { color: colors.text }]}
        numberOfLines={bodyExpanded ? undefined : 4}
        onTextLayout={e => {
          if (!bodyExpanded && !bodyTruncated && e.nativeEvent.lines.length >= 4)
            setBodyTruncated(true);
        }}
      >
        {post.body}
      </Text>
      {!bodyExpanded && bodyTruncated && (
        <Pressable onPress={() => setBodyExpanded(true)}>
          <Text style={[styles.moreLink, { color: colors.primary }]}>more</Text>
        </Pressable>
      )}

      <View style={styles.postTagRow}>
        <CommunityPostLabelBadge post={post} />
      </View>

      {post.alertMeta && (
        <View style={styles.alertMeta}>
          <Text style={[styles.alertMetaText, { color: colors.textSecondary }]}>
            {post.alertMeta.kind === 'lost' ? 'Last seen' : 'Found at'}: {post.alertMeta.area} · {post.alertMeta.when}
          </Text>
        </View>
      )}

      {post.hasImage && (
        <View style={styles.postMedia}>
          <PhotoSlot
            height={240}
            imageKey={post.id}
            label=""
            borderRadius={radius.lg}
          />
        </View>
      )}

      <View style={styles.reactionBar}>
        <ReactionBtn
          icon={post.helpfulByMe ? 'paw' : 'paw-line'}
          count={post.helpful}
          active={post.helpfulByMe}
          activeColor={colors.primary}
          fill={post.helpfulByMe}
          onPress={onHelpful}
        />
        <ReactionBtn icon="comment" count={commentCount} activeColor={colors.accent} onPress={openComments} />
        <ReactionBtn icon="forward" count={0} activeColor={colors.accent} onPress={onShare} />
        <View style={{ flex: 1 }} />
        <ReactionBtn
          icon="bookmark"
          count={0}
          active={post.saved}
          activeColor={colors.primary}
          fill={post.saved}
          onPress={onSave}
        />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  post: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  bodyText: { fontSize: 15.5, lineHeight: 23, paddingTop: 10 },
  moreLink: { fontSize: 14, fontWeight: '600', marginTop: 3 },
  postTagRow: { paddingTop: 8 },
  alertMeta: { paddingTop: 6 },
  alertMetaText: { fontSize: 13, lineHeight: 18 },
  postMedia: { paddingTop: 12 },
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
