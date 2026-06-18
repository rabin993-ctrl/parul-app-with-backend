import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { CompanionAvatar } from '../ui/Avatar';
import { IconButton } from '../ui/Button';
import { getPetAvatarFrameSize } from '../ui/PawPadShape';
import { AdoptionListing, AdoptionStatus, statusBadgeTone } from '../../data/adoptionData';

const AVATAR_SIZE = 48;
const PET_FRAME = getPetAvatarFrameSize(AVATAR_SIZE);

function statusLabel(status: AdoptionStatus): string {
  if (status === 'Adopted') return 'Adopted';
  if (status === 'Urgent') return 'Urgent';
  return 'Available';
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

export function AdoptionOwnerCard({
  listing,
  requestCount,
  onManageRequests,
  onEdit,
  onRelist,
}: {
  listing: AdoptionListing;
  requestCount: number;
  onManageRequests: () => void;
  onEdit: () => void;
  onRelist?: () => void;
}) {
  const { colors } = useTheme();
  const adopted = listing.status === 'Adopted';
  const hasRequests = !adopted && requestCount > 0;
  const onContentPress = hasRequests
    ? onManageRequests
    : adopted && onRelist
      ? onRelist
      : undefined;

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.avatarWrap, { width: PET_FRAME.width, minHeight: PET_FRAME.height }]}>
        <CompanionAvatar
          pet={{ icon: listing.icon, tint: listing.tint, name: listing.name }}
          size={AVATAR_SIZE}
        />
      </View>

      <Pressable
        onPress={onContentPress}
        disabled={!onContentPress}
        style={({ pressed }) => [
          styles.meta,
          onContentPress && Platform.OS === 'web' && styles.metaWeb,
          pressed && onContentPress && styles.metaPressed,
        ]}
      >
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {listing.name}
        </Text>

        <Text style={styles.subline} numberOfLines={1}>
          <Text style={{ color: statusColor(listing.status, colors), fontWeight: '600' }}>
            {statusLabel(listing.status)}
          </Text>
          {hasRequests && (
            <>
              <Text style={{ color: colors.textTertiary }}> · </Text>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {requestCount} request{requestCount !== 1 ? 's' : ''}
              </Text>
            </>
          )}
          {adopted && onRelist && (
            <>
              <Text style={{ color: colors.textTertiary }}> · </Text>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Re-list</Text>
            </>
          )}
        </Text>
      </Pressable>

      <IconButton
        name="edit"
        size={52}
        iconSize={22}
        tone="soft"
        color={colors.textSecondary}
        onPress={onEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  meta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
    paddingVertical: 4,
  },
  metaWeb: { cursor: 'pointer' as const },
  metaPressed: { opacity: 0.72 },
  name: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  subline: { ...typography.caption, fontSize: 13, lineHeight: 18 },
});
