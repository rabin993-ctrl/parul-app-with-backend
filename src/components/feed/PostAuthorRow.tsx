import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar, CompanionAvatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { Post } from '../../data/mockData';
import { getPostPoster } from '../../utils/postAuthor';

export function PostAuthorRow({
  post,
  size = 44,
  metaSuffix,
  onCompanionPress,
  trailing,
}: {
  post: Post;
  size?: number;
  metaSuffix?: string;
  onCompanionPress?: (companionId: string) => void;
  trailing?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const poster = getPostPoster(post);
  const metaTail = metaSuffix ? ` · ${metaSuffix}` : '';

  if (poster.type === 'companion') {
    const { companion, owner } = poster;
    const handle = companion.handle ?? companion.id;
    const meta = metaSuffix
      ? `@${handle} · with @${owner.handle} · ${post.time}${metaTail}`
      : `@${handle} · with @${owner.handle} · ${post.time} · ${post.loc}`;
    return (
      <View style={styles.row}>
        <CompanionAvatar companion={companion} size={size} ring={false} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: colors.text }]}>{companion.name}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={2}>
            {meta}
          </Text>
        </View>
        {trailing}
      </View>
    );
  }

  const { user, companion } = poster;

  return (
    <View style={styles.row}>
      <Avatar user={user} size={size} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
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
        </View>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {metaSuffix
            ? `@${user.handle} · ${post.time}${metaTail}`
            : `${post.time} · ${post.loc}`}
        </Text>
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 15.5, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 1 },
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
});
