import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius } from '../../theme/tokens';
import type { User } from '../../data/mockData';
import { Icon } from '../icons/Icon';
import { AdoptionOverdueRing, adoptionOverdueOuterSize } from './AdoptionOverdueRing';
import { useAdopterUpdateRequested } from '../../hooks/useAdopterPublicFlags';
import { useUserOnlineStatus } from '../../hooks/useUserPrivacyFlags';
import { PawPadShape } from './PawPadShape';
import { CachedAvatarImage } from './CachedAvatarImage';

function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = pct < 0 ? 0 : 255;
  const t = Math.abs(pct) / 100;
  r = Math.round((f - r) * t) + r;
  g = Math.round((f - g) * t) + g;
  b = Math.round((f - b) * t) + b;
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function PhotoAvatar({
  uri,
  fallbackUri,
  originalUri,
  size,
  label,
  tint,
  initials,
}: {
  uri?: string;
  fallbackUri?: string;
  originalUri?: string;
  size: number;
  label: string;
  tint: string;
  initials: string;
}) {
  const hasUri = !!(uri || fallbackUri || originalUri);
  const [failed, setFailed] = React.useState(!hasUri);
  const fontSize = Math.round(size * 0.36);
  const from = shade(tint, 0);
  const to = shade(tint, -14);

  React.useEffect(() => {
    setFailed(!hasUri);
  }, [hasUri]);

  if (failed || !hasUri) {
    return (
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        accessibilityLabel={label}
      >
        <Text style={{ fontSize, fontWeight: '700', color: '#fff', letterSpacing: -0.5 }}>
          {initials}
        </Text>
      </LinearGradient>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: tint,
      }}
    >
      <CachedAvatarImage
        avatarUrl={uri}
        avatarFallbackUrl={fallbackUri}
        avatarOriginalUrl={originalUri}
        width={size}
        height={size}
        borderRadius={size / 2}
        label={label}
        onFailed={() => setFailed(true)}
      />
    </View>
  );
}

interface AvatarProps {
  user: Partial<User> & { name: string; tint: string; id?: string };
  size?: number;
  ring?: boolean;
  /** When true, show yellow overdue ring via public adopter status. Defaults to on inside AdoptionProvider. */
  adoptionUpdateAlert?: boolean;
  /** When true, fetch public online status and show a green dot when the user is online. */
  showOnlineIndicator?: boolean;
  /** When provided, skips internal online polling (pass from parent to dedupe). */
  isOnline?: boolean;
}

export function Avatar({
  user,
  size = 44,
  ring = false,
  adoptionUpdateAlert,
  showOnlineIndicator = false,
  isOnline: isOnlineProp,
}: AvatarProps) {
  const { colors } = useTheme();
  const showOverdueRing = adoptionUpdateAlert !== false && Boolean(user.id);
  const polledOnline = useUserOnlineStatus(
    showOnlineIndicator && isOnlineProp === undefined ? user.id : undefined,
  );
  const isOnline = isOnlineProp ?? polledOnline;
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const tint = user.tint || '#F2972E';
  const avatarUri = user.avatarUrl ?? undefined;
  const fallbackUri = user.avatarFallbackUrl ?? undefined;
  const originalUri = user.avatarOriginalUrl ?? undefined;

  const photo = (
    <View style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <PhotoAvatar
        uri={avatarUri}
        fallbackUri={fallbackUri}
        originalUri={originalUri}
        size={size}
        label={`${user.name} profile photo`}
        tint={tint}
        initials={initials}
      />
      {ring ? (
        <View style={[StyleSheet.absoluteFill, {
          borderRadius: size / 2,
          borderWidth: 2.5,
          borderColor: colors.surface,
        }]} pointerEvents="none" />
      ) : null}
      {showOnlineIndicator && isOnline ? (
        <View
          style={[
            styles.onlineDot,
            {
              width: Math.max(10, Math.round(size * 0.22)),
              height: Math.max(10, Math.round(size * 0.22)),
              borderRadius: Math.max(10, Math.round(size * 0.22)) / 2,
              borderColor: colors.surface,
              right: Math.round(size * 0.02),
              bottom: Math.round(size * 0.02),
              zIndex: 2,
            },
          ]}
          pointerEvents="none"
        />
      ) : null}
    </View>
  );

  if (showOverdueRing && user.id) {
    return (
      <AdoptionOverdueRing userId={user.id} size={size}>
        {photo}
      </AdoptionOverdueRing>
    );
  }

  return photo;
}

interface CompanionAvatarProps {
  pet?: {
    id?: string;
    icon?: string;
    tint: string;
    name?: string;
    species?: string;
    avatarUrl?: string;
    avatarFallbackUrl?: string;
    avatarOriginalUrl?: string;
  };
  companion?: {
    id?: string;
    icon?: string;
    tint: string;
    name?: string;
    species?: string;
    avatarUrl?: string;
    avatarFallbackUrl?: string;
    avatarOriginalUrl?: string;
  };
  size?: number;
}

export function CompanionAvatar({ pet: petProp, companion, size = 30 }: CompanionAvatarProps) {
  const pet = petProp ?? companion ?? { tint: '#14A697' };
  const tint = pet.tint || '#14A697';
  const petKey = pet.id ?? pet.name ?? 'pet';
  const species = pet.species ?? (pet.icon === 'cat' ? 'cat' : pet.icon === 'dog' ? 'dog' : undefined);
  const avatarUri = pet.avatarUrl ?? undefined;
  const fallbackUri = pet.avatarFallbackUrl ?? undefined;
  const originalUri = pet.avatarOriginalUrl ?? undefined;
  const icon = pet.icon ?? (species === 'cat' ? 'cat' : species === 'dog' ? 'dog' : 'paw');

  return (
    <PawPadShape
      size={size}
      tint={tint}
      icon={icon}
      imageUri={avatarUri}
      fallbackUri={fallbackUri}
      originalUri={originalUri}
      imageLabel={`${pet.name ?? 'Pet'} profile photo`}
    />
  );
}

interface CompanionPillsProps {
  ids: string[];
  companions: Record<string, { id: string; name: string; tint: string; icon?: string }>;
  onOpen?: (id: string) => void;
}

export type CompanionLinkPet = {
  id: string;
  name: string;
  tint?: string;
  avatarUrl?: string;
  avatarFallbackUrl?: string;
  avatarOriginalUrl?: string;
};

/** Owner avatar with companion photo badge attached at bottom-right. */
export function OwnerWithCompanionAvatar({
  user,
  companion,
  size = 44,
  onUserPress,
  onCompanionPress,
}: {
  user: Partial<User> & { name: string; tint: string; id?: string };
  companion: CompanionLinkPet;
  size?: number;
  onUserPress?: () => void;
  onCompanionPress?: () => void;
}) {
  const { colors } = useTheme();
  const updateRequested = useAdopterUpdateRequested(user.id);
  const avatarOuter = adoptionOverdueOuterSize(size, updateRequested);
  const badgeSize = Math.max(20, Math.round(size * 0.48));
  const tint = companion.tint ?? colors.primary;
  const initials = companion.name.slice(0, 1).toUpperCase();
  const badgePad = Math.round(badgeSize * 0.28);
  const badgeStyle = [
    styles.ownerCompanionBadge,
    {
      width: badgeSize,
      height: badgeSize,
      borderRadius: badgeSize / 2,
      borderColor: colors.surface,
      zIndex: 2,
    },
  ];
  const companionBadge = (
    <PhotoAvatar
      uri={companion.avatarUrl}
      fallbackUri={companion.avatarFallbackUrl}
      originalUri={companion.avatarOriginalUrl}
      size={badgeSize}
      label={`${companion.name} profile photo`}
      tint={tint}
      initials={initials}
    />
  );

  return (
    <View
      style={[
        styles.ownerCompanionWrap,
        { width: avatarOuter + badgePad, height: avatarOuter + badgePad },
      ]}
      pointerEvents="box-none"
    >
      {onUserPress ? (
        <Pressable
          onPress={onUserPress}
          style={({ pressed }) => [pressed && { opacity: 0.7 }, { zIndex: 1 }]}
          accessibilityRole="button"
          accessibilityLabel={`View ${user.name}'s profile`}
        >
          <Avatar user={user} size={size} />
        </Pressable>
      ) : (
        <View style={{ zIndex: 1 }}>
          <Avatar user={user} size={size} />
        </View>
      )}
      {onCompanionPress ? (
        <Pressable
          onPress={onCompanionPress}
          hitSlop={8}
          style={({ pressed }) => [
            ...badgeStyle,
            { opacity: pressed ? 0.78 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`View ${companion.name}'s profile`}
        >
          {companionBadge}
        </Pressable>
      ) : (
        <View style={badgeStyle}>
          {companionBadge}
        </View>
      )}
    </View>
  );
}

/** Themed pill — companion name + chevron; photo lives on owner avatar badge. */
export function CompanionLinkPill({
  companion,
  onPress,
  maxNameWidth = 72,
}: {
  companion: CompanionLinkPet;
  onPress?: () => void;
  maxNameWidth?: number;
}) {
  const { colors } = useTheme();

  const pill = (
    <View
      style={[
        styles.linkPill,
        {
          backgroundColor: colors.primary + '14',
          borderColor: colors.primary + '32',
        },
      ]}
    >
      <Text
        style={[styles.linkPillName, { color: colors.primary, maxWidth: maxNameWidth }]}
        numberOfLines={1}
      >
        {companion.name}
      </Text>
      <Icon name="chevronRight" size={9} color={colors.primary} sw={2.5} />
    </View>
  );

  if (!onPress) return pill;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [{ opacity: pressed ? 0.78 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`View ${companion.name}'s profile`}
    >
      {pill}
    </Pressable>
  );
}

export function CompanionLinkPills({
  companions,
  onCompanionPress,
  maxVisible = 2,
}: {
  companions: CompanionLinkPet[];
  onCompanionPress?: (companionId: string) => void;
  maxVisible?: number;
}) {
  const { colors } = useTheme();
  if (companions.length === 0) return null;

  const visible = companions.slice(0, maxVisible);
  const overflow = companions.length - visible.length;

  return (
    <View style={styles.linkPillsRow}>
      {visible.map(c => (
        <CompanionLinkPill
          key={c.id}
          companion={c}
          onPress={onCompanionPress ? () => onCompanionPress(c.id) : undefined}
        />
      ))}
      {overflow > 0 ? (
        <View
          style={[
            styles.linkPillOverflow,
            { backgroundColor: colors.primary + '14', borderColor: colors.primary + '32' },
          ]}
        >
          <Text style={[styles.linkPillOverflowText, { color: colors.primary }]}>
            +{overflow}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function CompanionPills({ ids, companions, onOpen }: CompanionPillsProps) {
  const { colors } = useTheme();
  if (!ids.length) return null;
  return (
    <View style={styles.pillsRow}>
      <Text style={[styles.pillsWith, { color: colors.textSecondary }]}>with</Text>
      {ids.map(id => {
        const c = companions[id];
        if (!c) return null;
        return (
          <View key={id} style={[styles.pill, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <CompanionAvatar pet={c} size={18} />
            <Text style={[styles.pillName, { color: colors.text }]}>{c.name}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  onlineDot: {
    position: 'absolute',
    backgroundColor: '#22C55E',
    borderWidth: 2,
  },
  pillsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 5 },
  pillsWith: { fontSize: 12.5, fontWeight: '500' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 2,
    paddingRight: 9,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillName: { fontSize: 12.5, fontWeight: '600' },
  linkPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    flexShrink: 1,
  },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 120,
  },
  linkPillName: { fontSize: 11, fontWeight: '700', flexShrink: 1, lineHeight: 14 },
  ownerCompanionWrap: { position: 'relative', flexShrink: 0 },
  ownerCompanionBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderWidth: 2.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkPillOverflow: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkPillOverflowText: { fontSize: 10.5, fontWeight: '700', lineHeight: 14 },
});
