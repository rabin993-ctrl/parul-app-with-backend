import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar, CompanionAvatar } from '../ui/Avatar';
import type { Post } from '../../data/mockData';
import { getPostPoster } from '../../utils/postAuthor';
import { useCompanions } from '../../context/CompanionContext';

function formatCompanionLabel(companions: Array<{ id: string; name: string }>): string {
  if (companions.length === 1) return companions[0].name;
  if (companions.length === 2) return `${companions[0].name} and ${companions[1].name}`;
  return `${companions[0].name}, ${companions[1].name}, and ${companions.length - 2} more`;
}

export function PostAuthorRow({
  post,
  size = 44,
  metaSuffix,
  onUserPress,
  onCompanionPress,
  trailing,
}: {
  post: Post;
  size?: number;
  metaSuffix?: string;
  onUserPress?: (userId: string) => void;
  onCompanionPress?: (companionId: string) => void;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const { getCompanion } = useCompanions();
  const poster = getPostPoster(post, getCompanion);
  const isCompanionPost = poster.type === 'companion';
  const user = isCompanionPost ? poster.owner : poster.user;
  const companions = !isCompanionPost ? poster.companions : undefined;
  const displayName = isCompanionPost ? poster.companion.name : user.name;

  const metaLine = metaSuffix ? `${post.time} · ${metaSuffix}` : post.time;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => (
          isCompanionPost
            ? onCompanionPress?.(poster.companion.id)
            : onUserPress?.(user.id)
        )}
        style={({ pressed }) => pressed && styles.pressed}
        disabled={isCompanionPost ? !onCompanionPress : !onUserPress}
        accessibilityRole="button"
        accessibilityLabel={`View ${displayName}'s profile`}
      >
        {isCompanionPost ? (
          <CompanionAvatar companion={poster.companion} size={size} />
        ) : (
          <Avatar user={user} size={size} />
        )}
      </Pressable>

      <View style={styles.content}>
        <Text
          style={styles.titleLine}
          numberOfLines={1}
          accessibilityRole="text"
          accessibilityLabel={displayName}
        >
          <Text
            style={[styles.name, { color: colors.text }]}
            onPress={() => (
              isCompanionPost
                ? onCompanionPress?.(poster.companion.id)
                : onUserPress?.(user.id)
            )}
            suppressHighlighting
          >
            {displayName}
          </Text>
          {!isCompanionPost && companions && companions.length > 0 ? (
            <>
              <Text style={{ color: colors.textTertiary, fontWeight: '400' }}> with </Text>
              {companions.length === 1 ? (
                <Text
                  style={{ color: colors.text, fontWeight: '600' }}
                  onPress={() => onCompanionPress?.(companions[0].id)}
                  suppressHighlighting
                >
                  {companions[0].name}
                </Text>
              ) : companions.length === 2 ? (
                <>
                  <Text
                    style={{ color: colors.text, fontWeight: '600' }}
                    onPress={() => onCompanionPress?.(companions[0].id)}
                    suppressHighlighting
                  >
                    {companions[0].name}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontWeight: '400' }}> and </Text>
                  <Text
                    style={{ color: colors.text, fontWeight: '600' }}
                    onPress={() => onCompanionPress?.(companions[1].id)}
                    suppressHighlighting
                  >
                    {companions[1].name}
                  </Text>
                </>
              ) : (
                <Text
                  style={{ color: colors.text, fontWeight: '600' }}
                  onPress={() => onCompanionPress?.(companions[0].id)}
                  suppressHighlighting
                >
                  {formatCompanionLabel(companions)}
                </Text>
              )}
            </>
          ) : null}
        </Text>

        <Text style={[styles.time, { color: colors.textTertiary }]} numberOfLines={1}>
          {metaLine}
        </Text>
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
  time: { fontSize: 12.5, fontWeight: '500', marginTop: 4 },
  trailing: { marginTop: -2 },
});
