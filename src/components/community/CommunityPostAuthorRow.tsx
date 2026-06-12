import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar } from '../ui/Avatar';
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
        style={({ pressed }) => pressed && styles.pressed}
        disabled={!onAuthorPress}
      >
        <Avatar user={author} size={size} />
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.titleLine} numberOfLines={1}>
          <Text
            style={[styles.name, { color: colors.text }]}
            onPress={() => onAuthorPress?.(post.authorId)}
            suppressHighlighting
          >
            {author.name}
          </Text>
          {companion ? (
            <>
              <Text style={{ color: colors.textTertiary, fontWeight: '400' }}> with </Text>
              <Text
                style={{ color: colors.text, fontWeight: '600' }}
                onPress={() => onCompanionPress?.(companion.id)}
                suppressHighlighting
              >
                {companion.name}
              </Text>
            </>
          ) : null}
        </Text>

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
  titleLine: { fontSize: 15.5, lineHeight: 20 },
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
