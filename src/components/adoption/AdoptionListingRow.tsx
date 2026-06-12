import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { CompanionAvatar } from '../ui/Avatar';
import { getPetAvatarFrameSize } from '../ui/PawPadShape';
import { Icon } from '../icons/Icon';
import { users } from '../../data/mockData';
import {
  AdoptionListing,
  AdoptionStatus,
  statusBadgeTone,
} from '../../data/adoptionData';

const AVATAR_SIZE = 48;
const PET_FRAME = getPetAvatarFrameSize(AVATAR_SIZE);

function statusLabel(status: AdoptionStatus): string {
  if (status === 'Adopted') return 'Successfully adopted';
  if (status === 'Urgent') return 'Urgent — needs home';
  return 'Available for adoption';
}

function statusColor(
  status: AdoptionStatus,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  const tone = statusBadgeTone(status);
  switch (tone) {
    case 'danger': return colors.lost;
    case 'warning': return colors.warning;
    case 'success': return colors.success;
    default: return colors.textSecondary;
  }
}

export function AdoptionListingRow({
  listing,
  saved,
  onPress,
  onSave,
}: {
  listing: AdoptionListing;
  saved: boolean;
  onPress: () => void;
  onSave: () => void;
}) {
  const { colors } = useTheme();
  const owner = users[listing.userId as keyof typeof users];
  const adopted = listing.status === 'Adopted';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.avatarWrap, { width: PET_FRAME.width, minHeight: PET_FRAME.height }]}>
        <CompanionAvatar
          pet={{ icon: listing.icon, tint: listing.tint, name: listing.name }}
          size={AVATAR_SIZE}
        />
      </View>

      <View style={styles.meta}>
        <View style={styles.topRow}>
          <Text style={[styles.titleLine, { color: colors.text }]} numberOfLines={1}>
            {listing.name}
          </Text>
          <View style={styles.trailing}>
            <Text style={[styles.time, { color: colors.textTertiary }]}>{listing.postedAt}</Text>
            {!adopted && (
              <Pressable
                onPress={e => {
                  e.stopPropagation?.();
                  onSave();
                }}
                hitSlop={8}
                style={({ pressed }) => [pressed && { opacity: 0.5 }]}
              >
                <Icon
                  name="heart"
                  size={16}
                  color={saved ? colors.accent : colors.textTertiary}
                  fill={saved ? colors.accent : 'none'}
                />
              </Pressable>
            )}
          </View>
        </View>

        <Text style={[styles.subline, { color: colors.textSecondary }]} numberOfLines={1}>
          {listing.breed}
          <Text style={{ color: colors.textTertiary }}> · </Text>
          {listing.loc}
          {owner ? (
            <>
              <Text style={{ color: colors.textTertiary }}> · </Text>
              <Text style={{ color: colors.primary }}>@{owner.handle}</Text>
            </>
          ) : null}
        </Text>

        <Text
          style={[styles.statusLine, { color: statusColor(listing.status, colors) }]}
          numberOfLines={1}
        >
          {statusLabel(listing.status)}
        </Text>

        <Text
          style={[styles.preview, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {listing.personality}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: { opacity: 0.7 },
  avatarWrap: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  meta: { flex: 1, gap: 3, minWidth: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titleLine: { fontSize: 16.5, fontWeight: '700', letterSpacing: -0.2, flex: 1 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  time: { ...typography.meta, fontSize: 12 },
  subline: { ...typography.caption, fontSize: 12.5 },
  statusLine: { ...typography.caption, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.1 },
  preview: { ...typography.small, fontSize: 14, lineHeight: 19, marginTop: 1 },
});
