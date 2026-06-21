import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import { AdoptionUserFlag } from '../ui/AdoptionUserFlag';
import { Icon } from '../icons/Icon';
import {
  PROFILE_HERO_AVATAR_SIZE,
  PROFILE_HERO_AVATAR_TEXT_GAP,
  PROFILE_HERO_IDENTITY_TEXT_NUDGE,
  PROFILE_IDENTITY_RAIL_MAX,
} from './profileHeroTokens';

export function ProfileIdentityRail({
  avatarSlot,
  mode,
  name,
  userId,
  bio,
  location,
}: {
  avatarSlot?: React.ReactNode;
  mode: 'display' | 'avatarOnly' | 'textOnly';
  name?: string;
  userId?: string;
  bio?: string | null;
  location?: string | null;
}) {
  const { colors } = useTheme();
  const bioText = bio?.trim();
  const locationText = location?.trim();

  const identityText = name ? (
    <View style={styles.railInnerColumn}>
      <View style={styles.nameRow}>
        <Text
          style={[styles.name, { color: colors.text }]}
          numberOfLines={2}
        >
          {name}
        </Text>
        {userId ? <AdoptionUserFlag userId={userId} size={14} /> : null}
      </View>
      {bioText || locationText ? (
        <View style={styles.bioLocationRow}>
          {bioText ? (
            <Text
              style={[styles.bio, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {bioText}
            </Text>
          ) : null}
          {bioText && locationText ? (
            <Text style={[styles.bioLocationSep, { color: colors.textTertiary }]}>·</Text>
          ) : null}
          {locationText ? (
            <View style={styles.locationRow}>
              <Icon name="mapPin" size={12} color={colors.textSecondary} sw={2.2} />
              <Text
                style={[styles.location, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {locationText}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  ) : null;

  if (mode === 'textOnly') {
    return identityText;
  }

  return (
    <View style={styles.railOuter}>
      {avatarSlot ? <View style={styles.avatarSlot}>{avatarSlot}</View> : null}
      {mode === 'display' ? identityText : null}
    </View>
  );
}

const styles = StyleSheet.create({
  railOuter: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    maxWidth: PROFILE_IDENTITY_RAIL_MAX,
    gap: PROFILE_HERO_AVATAR_TEXT_GAP,
  },
  avatarSlot: {
    width: PROFILE_HERO_AVATAR_SIZE,
    alignItems: 'flex-start',
  },
  railInnerColumn: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
    maxWidth: PROFILE_IDENTITY_RAIL_MAX,
    gap: spacing.xs,
    marginLeft: PROFILE_HERO_IDENTITY_TEXT_NUDGE,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: PROFILE_IDENTITY_RAIL_MAX,
  },
  name: {
    flexShrink: 1,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.35,
    textAlign: 'left',
  },
  bio: {
    flexShrink: 1,
    fontSize: 12.5,
    lineHeight: 17,
    textAlign: 'left',
  },
  bioLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: PROFILE_IDENTITY_RAIL_MAX,
  },
  bioLocationSep: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  location: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'left',
  },
});
