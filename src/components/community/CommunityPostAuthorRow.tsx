import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { CommunityPost } from '../../data/communityPosts';
import { users } from '../../data/mockData';
import { getCommunityPostCompanion } from '../../utils/postAuthor';
import { CommunitySourcePill } from './CommunitySourcePill';

export function CommunityPostAuthorRow({
  post,
  communityTint,
  communityIcon,
  onCommunityPress,
  onCompanionPress,
  onAuthorPress,
  trailing,
  size = 44,
}: {
  post: CommunityPost;
  communityTint: string;
  communityIcon: string;
  onCommunityPress?: () => void;
  onCompanionPress?: (companionId: string) => void;
  onAuthorPress?: (userId: string) => void;
  trailing?: React.ReactNode;
  size?: number;
}) {
  const { colors } = useTheme();
  const author = users[post.authorId];
  const companion = getCommunityPostCompanion(post);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onAuthorPress?.(post.authorId)}
        style={({ pressed }) => pressed && { opacity: 0.7 }}
        disabled={!onAuthorPress}
      >
        <Avatar user={author} size={size} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameRow}>
          <Pressable
            onPress={() => onAuthorPress?.(post.authorId)}
            disabled={!onAuthorPress}
            style={({ pressed }) => pressed && { opacity: 0.7 }}
          >
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{author.name}</Text>
          </Pressable>
          {companion && (
            <Pressable
              onPress={() => onCompanionPress?.(companion.id)}
              style={({ pressed }) => [
                styles.companionPill,
                { backgroundColor: colors.surface2, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`View ${companion.name}'s profile`}
            >
              <Text style={[styles.companionPillText, { color: colors.textSecondary }]}>{companion.name}</Text>
              <Icon name="chevronRight" size={10} color={colors.textTertiary} />
            </Pressable>
          )}
          {trailing}
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.metaPrefix, { color: colors.textSecondary }]}>in </Text>
          <CommunitySourcePill
            communityId={post.communityId}
            name={post.communityName}
            tint={communityTint}
            icon={communityIcon}
            onPress={onCommunityPress}
          />
          <Text style={[styles.metaSuffix, { color: colors.textSecondary }]} numberOfLines={1}>
            {' · '}{post.time} · {post.loc}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  companionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  companionPillText: { fontSize: 11.5, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2, gap: 0 },
  metaPrefix: { fontSize: 12.5 },
  metaSuffix: { fontSize: 12.5, flexShrink: 1 },
});
