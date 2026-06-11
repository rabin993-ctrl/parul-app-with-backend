import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { CommunityPostAuthorRow } from './CommunityPostAuthorRow';
export { CommunitySourcePill } from './CommunitySourcePill';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Icon } from '../icons/Icon';
import { IconButton } from '../ui/Button';
import { CommunityPost } from '../../data/communityPosts';
import { users } from '../../data/mockData';
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
  const author = users[post.authorId];

  return (
    <View style={styles.post}>
      <CommunityPostAuthorRow
        post={post}
        communityTint={communityTint}
        communityIcon={communityIcon}
        onCommunityPress={onCommunityPress}
        onCompanionPress={onCompanionPress}
        onAuthorPress={onAuthorPress}
        trailing={<IconButton name="more" size={32} color={colors.textSecondary} onPress={onPress} />}
      />

      <Pressable onPress={onPress}>
        <Text style={[styles.postText, { color: colors.text }]}>
          <Text style={styles.titleLine}>{post.title}</Text>
          {'\n\n'}
          {post.body}
        </Text>
      </Pressable>

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
            tint={post.imageTint ?? author.tint}
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
        <ReactionBtn icon="comment" count={post.comments} activeColor={colors.accent} onPress={openComments} />
        <ReactionBtn icon="forward" count={0} activeColor={colors.accent} onPress={onShare} />
        <View style={{ flex: 1 }} />
        <ReactionBtn
          icon="bookmark"
          count={0}
          active={post.saved}
          activeColor={colors.primary}
          onPress={onSave}
        />
      </View>

      {post.threads.length > 0 && (
        <Pressable onPress={openComments} style={styles.commentPreview}>
          <Avatar user={users[post.threads[0].userId]} size={26} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text }}>
              <Text style={styles.commentUser}>{users[post.threads[0].userId]?.name} </Text>
              <Text style={{ fontSize: 13 }}>{post.threads[0].text}</Text>
            </Text>
            {post.comments > 1 && (
              <Text style={[styles.viewAll, { color: colors.primary }]}>
                View all {post.comments} comments
              </Text>
            )}
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  post: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  postText: { fontSize: 15.5, lineHeight: 23, paddingTop: 10 },
  titleLine: { fontWeight: '800' },
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
  commentPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingBottom: 8,
    marginTop: 2,
  },
  commentUser: { fontWeight: '700', fontSize: 13 },
  viewAll: { fontSize: 12.5, fontWeight: '700', marginTop: 5 },
});
