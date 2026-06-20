import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { CompanionAvatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { getPetAvatarFrameSize } from '../ui/PawPadShape';
import { AdoptionStatusTag } from './AdoptionStatusTag';
import { useUserProfile } from '../../hooks/useUserProfile';
import type { AdoptionRecord } from '../../data/adoptionRecords';
import type { ProfileAdoptionRowDisplay } from '../../utils/profileAdoptionDisplay';

const AVATAR = 44;
const FRAME = getPetAvatarFrameSize(AVATAR);

export function ProfileAdoptionShowcaseRow({
  record,
  display,
  onPress,
  counterpartyUserId,
  counterpartyLabel = 'Adopted by',
  muted = false,
}: {
  record: AdoptionRecord;
  display: ProfileAdoptionRowDisplay;
  onPress: () => void;
  counterpartyUserId?: string;
  counterpartyLabel?: string;
  muted?: boolean;
  onOpenListing?: (listingId: string) => void;
}) {
  const { colors } = useTheme();
  const counterparty = useUserProfile(counterpartyUserId);
  const opacity = muted ? 0.75 : 1;

  const subline = useMemo(() => {
    if (!counterpartyUserId) return display.subline;
    const handle = counterparty?.handle ?? counterpartyUserId.slice(0, 8);
    const who = `${counterpartyLabel} @${handle}`;
    return display.subline ? `${who} · ${display.subline}` : who;
  }, [counterparty?.handle, counterpartyLabel, counterpartyUserId, display.subline]);

  const a11yWho = counterpartyUserId
    ? `, ${counterpartyLabel} @${counterparty?.handle ?? counterpartyUserId.slice(0, 8)}`
    : '';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${display.petName}${a11yWho}${display.statusLabel ? `, ${display.statusLabel}` : ''}`}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: colors.border,
          opacity: pressed ? opacity * 0.7 : opacity,
        },
        Platform.OS === 'web' && styles.rowWeb,
      ]}
    >
      <View style={[styles.avatarWrap, { width: FRAME.width }]}>
        <CompanionAvatar
          pet={{ icon: record.icon, tint: record.tint, name: record.petName }}
          size={AVATAR}
        />
      </View>

      <View style={styles.meta}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: muted ? colors.textSecondary : colors.text }]}
            numberOfLines={1}
          >
            {display.petName}
          </Text>
          {display.statusLabel && display.statusTone ? (
            <AdoptionStatusTag label={display.statusLabel} tone={display.statusTone} />
          ) : null}
        </View>
        <Text style={[styles.subline, { color: colors.textTertiary }]} numberOfLines={2}>
          {subline}
        </Text>
      </View>
      <Icon name="chevronRight" size={14} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowWeb: { cursor: 'pointer' as const },
  avatarWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  meta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  title: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  subline: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
