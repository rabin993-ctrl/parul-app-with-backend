import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { CompanionAvatar } from '../ui/Avatar';
import { getPetAvatarFrameSize } from '../ui/PawPadShape';
import { Icon } from '../icons/Icon';
import { AdoptionListing, AdoptionStatus, statusBadgeTone } from '../../data/adoptionData';

const AVATAR_SIZE = 48;
const PET_FRAME = getPetAvatarFrameSize(AVATAR_SIZE);

function statusLabel(status: AdoptionStatus): string {
  if (status === 'Adopted') return 'Successfully adopted';
  if (status === 'Urgent') return 'Urgent — needs home';
  if (status === 'Pending') return 'Application pending';
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

function ActionLink({
  label,
  onPress,
  primary,
  colors,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Pressable onPress={onPress} hitSlop={4} style={({ pressed }) => pressed && { opacity: 0.55 }}>
      <Text
        style={[
          styles.actionLink,
          { color: primary ? colors.primary : colors.textSecondary },
          primary && styles.actionLinkPrimary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AdoptionOwnerCard({
  listing,
  requestCount,
  pendingCount,
  onManageRequests,
  onEdit,
  onMarkAdopted,
}: {
  listing: AdoptionListing;
  requestCount: number;
  pendingCount: number;
  onManageRequests: () => void;
  onEdit: () => void;
  onMarkAdopted: () => void;
}) {
  const { colors } = useTheme();
  const adopted = listing.status === 'Adopted';

  return (
    <View style={styles.row}>
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
          <Text style={[styles.time, { color: colors.textTertiary }]}>{listing.postedAt}</Text>
        </View>

        <Text style={[styles.subline, { color: colors.textSecondary }]} numberOfLines={1}>
          {listing.breed}
          <Text style={{ color: colors.textTertiary }}> · </Text>
          {listing.location}
        </Text>

        <Text
          style={[styles.statusLine, { color: statusColor(listing.status, colors) }]}
          numberOfLines={1}
        >
          {statusLabel(listing.status)}
        </Text>

        {!adopted && requestCount > 0 && (
          <Pressable
            onPress={onManageRequests}
            style={({ pressed }) => [styles.requestLine, pressed && { opacity: 0.6 }]}
          >
            <Icon name="comment" size={13} color={colors.primary} />
            <Text style={[styles.requestText, { color: colors.primary }]} numberOfLines={1}>
              {requestCount} request{requestCount !== 1 ? 's' : ''}
              {pendingCount > 0 ? ` · ${pendingCount} new` : ''}
            </Text>
            <Icon name="chevronRight" size={13} color={colors.primary} />
          </Pressable>
        )}

        <View style={styles.actions}>
          {!adopted && (
            <>
              <ActionLink
                label="Manage requests"
                onPress={onManageRequests}
                primary={requestCount > 0}
                colors={colors}
              />
              <Text style={[styles.actionDot, { color: colors.textTertiary }]}>·</Text>
            </>
          )}
          <ActionLink label="Edit" onPress={onEdit} colors={colors} />
          {!adopted && (
            <>
              <Text style={[styles.actionDot, { color: colors.textTertiary }]}>·</Text>
              <ActionLink label="Mark adopted" onPress={onMarkAdopted} colors={colors} />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
  },
  avatarWrap: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  meta: { flex: 1, gap: 3, minWidth: 0 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleLine: { fontSize: 16.5, fontWeight: '700', letterSpacing: -0.2, flex: 1 },
  time: { ...typography.meta, fontSize: 12, flexShrink: 0 },
  subline: { ...typography.caption, fontSize: 12.5 },
  statusLine: { ...typography.caption, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.1 },
  requestLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  requestText: { flex: 1, fontSize: 13, fontWeight: '700' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  actionLink: { fontSize: 12.5, fontWeight: '600' },
  actionLinkPrimary: { fontWeight: '700' },
  actionDot: { fontSize: 12, fontWeight: '600' },
});
