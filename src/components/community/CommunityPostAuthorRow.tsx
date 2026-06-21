import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from '../ui/Avatar';
import { AdoptionUserFlag } from '../ui/AdoptionUserFlag';
import { CommunityPost } from '../../data/communityPosts';
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
  const author = post.author;
  const authorUser = { id: author?.id, name: author?.name ?? author?.handle ?? 'you', tint: author?.tint ?? '#F2972E' };

  // Use explicitly stored companion data — never fall back to author's first companion
  const companionId = post.companionIds?.[0];
  const companionName = post.companionNames?.[0];
  const hasCompanion = !!(companionId && companionName);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onAuthorPress?.(post.authorId)}
        style={({ pressed }) => pressed && styles.pressed}
        disabled={!onAuthorPress}
      >
        <Avatar user={authorUser} size={size} />
      </Pressable>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.name, { color: colors.text }]}
            onPress={() => onAuthorPress?.(post.authorId)}
            suppressHighlighting
            numberOfLines={1}
          >
            {author?.name ?? author?.handle ?? post.authorId.slice(0, 8)}
          </Text>
          <AdoptionUserFlag userId={post.authorId} size={14} />
          {hasCompanion ? (
            <Text style={styles.titleLine} numberOfLines={1}>
              <Text style={{ color: colors.textTertiary, fontWeight: '400' }}> with </Text>
              <Text
                style={{ color: colors.text, fontWeight: '600' }}
                onPress={() => companionId && onCompanionPress?.(companionId)}
                suppressHighlighting
              >
                {companionName}
              </Text>
              {(post.companionIds?.length ?? 0) > 1 && (
                <Text style={{ color: colors.textTertiary, fontWeight: '400' }}>
                  {` and ${post.companionIds!.length - 1} more`}
                </Text>
              )}
            </Text>
          ) : null}
        </View>

        <View style={styles.sourceRow}>
          <CommunitySourcePill
            communityId={post.communityId}
            name={post.communityName}
            tint={communityTint}
            icon={communityIcon}
            onPress={onCommunityPress}
          />
          <Text style={[styles.time, { color: colors.textTertiary }]}>{post.time}</Text>
        </View>
      </View>

      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  pressed: { opacity: 0.7 },
  content: { flex: 1, minWidth: 0, gap: 3 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  titleLine: { fontSize: 15.5, lineHeight: 20, flexShrink: 1 },
  name: { fontWeight: '700' },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  time: { fontSize: 12.5, fontWeight: '500' },
  trailing: { marginTop: -2 },
});
