import React, { useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar, CompanionAvatar, CompanionLinkPills, OwnerWithCompanionAvatar, type CompanionLinkPet } from '../ui/Avatar';
import { UserNameWithAdoptionFlag } from '../ui/UserNameWithAdoptionFlag';
import type { Post, Companion } from '../../data/mockData';
import { getPostPoster } from '../../utils/postAuthor';
import { useCompanions } from '../../context/CompanionContext';
import { prefetchResolvedAvatars } from '../../lib/avatarMedia';
import { hasCompanionAvatar, mergeCompanionDisplay } from '../../utils/companionSnapshot';
import { formatPostTimeLocMeta } from '../../utils/postMeta';

function formatCompanionLabel(companions: Array<{ id: string; name: string }>): string {
  if (companions.length === 1) return companions[0].name;
  if (companions.length === 2) return `${companions[0].name} and ${companions[1].name}`;
  return `${companions[0].name}, ${companions[1].name}, and ${companions.length - 2} more`;
}

function buildWithCompanionsLabel(companions: Array<{ id: string; name: string }>): string {
  if (companions.length === 0) return '';
  return `with ${formatCompanionLabel(companions)}`;
}

function enrichCompanions(
  companions: Array<{ id: string; name: string }>,
  lookup: (id: string) => Companion | null,
  snapshots: Post['companionSnapshots'],
): CompanionLinkPet[] {
  return companions.map(c => {
    const snapshot = snapshots?.find(s => s.id === c.id);
    return mergeCompanionDisplay(c, lookup(c.id), snapshot);
  });
}

export function PostAuthorRow({
  post,
  size = 48,
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
  const { getCompanion, fetchCompanionById } = useCompanions();
  const poster = getPostPoster(post, getCompanion);
  const isCompanionPost = poster.type === 'companion';
  const user = isCompanionPost ? poster.owner : poster.user;
  const flagUserId = user.id;
  const companions = !isCompanionPost ? poster.companions : undefined;
  const displayName = isCompanionPost ? poster.companion.name : user.name;
  const hasCompanions = !isCompanionPost && !!companions && companions.length > 0;
  const companionLinks = useMemo(
    () => (hasCompanions ? enrichCompanions(companions!, getCompanion, post.companionSnapshots) : []),
    [companions, getCompanion, hasCompanions, post.companionSnapshots],
  );
  const accessibilityName = hasCompanions
    ? `${user.name} ${buildWithCompanionsLabel(companions!)}`
    : displayName;

  useEffect(() => {
    if (!hasCompanions || companionLinks.length === 0) return;
    prefetchResolvedAvatars(companionLinks);
  }, [companionLinks, hasCompanions]);

  useEffect(() => {
    if (!hasCompanions) return;
    for (const c of companionLinks) {
      if (!hasCompanionAvatar(c)) {
        void fetchCompanionById(c.id);
      }
    }
  }, [companionLinks, fetchCompanionById, hasCompanions]);

  const metaLine = formatPostTimeLocMeta({
    time: post.time,
    loc: post.loc,
    suffix: metaSuffix,
  });

  const profilePressHandler = isCompanionPost
    ? onCompanionPress
      ? () => onCompanionPress(poster.companion.id)
      : undefined
    : onUserPress
      ? () => onUserPress(user.id)
      : undefined;

  const avatarNode = isCompanionPost ? (
    <CompanionAvatar companion={poster.companion} size={size} />
  ) : (
    <Avatar user={user} size={size} />
  );

  const nameNode = isCompanionPost ? (
    <Text
      style={styles.titleLine}
      numberOfLines={1}
      accessibilityRole="text"
      accessibilityLabel={displayName}
    >
      <Text style={[styles.name, { color: colors.text }]}>
        {displayName}
      </Text>
    </Text>
  ) : (
    <UserNameWithAdoptionFlag
      userId={flagUserId}
      name={displayName}
      numberOfLines={1}
    />
  );

  return (
    <View style={styles.row}>
      {hasCompanions ? (
        <OwnerWithCompanionAvatar
          user={user}
          companion={companionLinks[0]}
          size={size}
          onUserPress={onUserPress ? () => onUserPress(user.id) : undefined}
          onCompanionPress={
            onCompanionPress ? () => onCompanionPress(companionLinks[0].id) : undefined
          }
        />
      ) : profilePressHandler ? (
        <Pressable
          onPress={profilePressHandler}
          style={({ pressed }) => pressed && styles.pressed}
          accessibilityRole="button"
          accessibilityLabel={`View ${displayName}'s profile`}
        >
          {avatarNode}
        </Pressable>
      ) : (
        avatarNode
      )}

      <View style={styles.content}>
        {hasCompanions ? (
          <View
            style={styles.titleRow}
            accessibilityRole="text"
            accessibilityLabel={accessibilityName}
          >
            <UserNameWithAdoptionFlag
              userId={flagUserId}
              name={user.name}
              onPress={onUserPress ? () => onUserPress(user.id) : undefined}
            />
            <CompanionLinkPills
              companions={companionLinks}
              onCompanionPress={onCompanionPress}
            />
          </View>
        ) : profilePressHandler ? (
          <Pressable
            onPress={profilePressHandler}
            style={({ pressed }) => pressed && styles.pressed}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`View ${displayName}'s profile`}
          >
            {nameNode}
          </Pressable>
        ) : (
          nameNode
        )}

        <Text style={[styles.time, { color: colors.textTertiary }]} numberOfLines={1}>
          {metaLine}
        </Text>
      </View>

      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 11, width: '100%' },
  pressed: { opacity: 0.7 },
  content: { flex: 1, minWidth: 0, gap: 4, justifyContent: 'center' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    minWidth: 0,
  },
  titleLine: { fontSize: 15.5, lineHeight: 20 },
  name: { fontSize: 15.5, lineHeight: 20, fontWeight: '700', flexShrink: 0 },
  time: { fontSize: 12.5, fontWeight: '500', lineHeight: 16 },
  trailing: { marginLeft: 'auto', alignSelf: 'center', flexShrink: 0 },
});
