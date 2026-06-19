import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Button } from '../ui/Button';
import { Icon } from '../icons/Icon';
import { Avatar } from '../ui/Avatar';
import { useUserProfile } from '../../hooks/useUserProfile';
import type { RescueCase } from '../../data/profileData';
import { RescueStatusPill } from './RescueCaseUI';

type Props = {
  item: RescueCase;
  following: boolean;
  isOwner?: boolean;
  onPress: () => void;
  onFollow: () => void;
  onShare: () => void;
};

export function RescueCaseCard({
  item,
  following,
  isOwner = false,
  onPress,
  onFollow,
  onShare,
}: Props) {
  const { colors } = useTheme();
  const poster = useUserProfile(item.userId);
  const headline = item.headline ?? item.story.split('.')[0];
  const updateCount = item.updates?.length ?? 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        shadows.sm,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.94 : 1,
        },
      ]}
    >
      <View style={styles.imageWrap}>
        <PhotoSlot
          height={168}
          imageKey={item.id}
          borderRadius={0}
          label=""
        />
        <View style={styles.imageOverlay}>
          <RescueStatusPill status={item.status} size="sm" />
        </View>
        <Pressable
          onPress={onShare}
          style={[styles.shareBtn, { backgroundColor: '#00000055' }]}
          hitSlop={8}
        >
          <Icon name="forward" size={15} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={[styles.headline, { color: colors.text }]} numberOfLines={2}>
          {headline}
        </Text>

        {poster && (
          <View style={styles.posterRow}>
            <Avatar user={poster} size={22} />
            <Text style={[styles.posterName, { color: colors.textSecondary }]} numberOfLines={1}>
              {poster.name.split(' ')[0]} · {item.location}
            </Text>
          </View>
        )}

        <View style={styles.statsRow}>
          <Stat icon="paw-line" label={`${updateCount} update${updateCount === 1 ? '' : 's'}`} colors={colors} />
          <Stat icon="user" label={`${item.followers ?? 0} following`} colors={colors} />
          <Text style={[styles.date, { color: colors.textTertiary }]}>{item.date}</Text>
        </View>

        <View style={styles.actions}>
          {isOwner ? (
            <View style={{ flex: 1 }}>
              <Button size="sm" variant="soft" onPress={onPress}>
                My case
              </Button>
            </View>
          ) : (
            <>
              <View style={{ flex: 1 }}>
                <Button
                  size="sm"
                  variant={following ? 'soft' : 'primary'}
                  onPress={onFollow}
                >
                  {following ? 'Following' : 'Follow case'}
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button size="sm" variant="soft" onPress={onPress}>
                  View case
                </Button>
              </View>
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function Stat({
  icon,
  label,
  colors,
}: {
  icon: string;
  label: string;
  colors: { textSecondary: string };
}) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={11} color={colors.textSecondary} />
      <Text style={[styles.statText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  imageWrap: { position: 'relative' },
  imageOverlay: { position: 'absolute', top: 10, left: 10 },
  shareBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 14, gap: 8 },
  headline: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  posterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  posterName: { flex: 1, fontSize: 12.5, fontWeight: '500' },
  statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11.5, fontWeight: '600' },
  date: { fontSize: 11.5, fontWeight: '500', marginLeft: 'auto' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
