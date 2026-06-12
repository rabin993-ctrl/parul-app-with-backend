import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { User } from '../../data/mockData';
import { PawPadShape } from './PawPadShape';
import { Icon } from '../icons/Icon';
import { useOptionalAdoption } from '../../context/AdoptionContext';
import { userHasPendingAdoptionUpdate } from '../../data/adoptionRecords';

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

function AdoptionUpdateAlertBadge({
  avatarSize,
  borderColor,
}: {
  avatarSize: number;
  borderColor: string;
}) {
  const { colors } = useTheme();
  const badge = Math.max(15, Math.round(avatarSize * 0.34));
  const icon = Math.max(10, Math.round(badge * 0.62));

  return (
    <View
      pointerEvents="none"
      accessibilityLabel="Adoption home update pending"
      style={[
        styles.updateAlertBadge,
        {
          width: badge,
          height: badge,
          borderRadius: badge / 2,
          backgroundColor: colors.warning,
          borderColor,
        },
      ]}
    >
      <Icon name="alert" size={icon} color="#fff" sw={2.2} />
    </View>
  );
}

interface AvatarProps {
  user: Partial<User> & { name: string; tint: string; id?: string };
  size?: number;
  ring?: boolean;
  /** undefined = auto from adoption records when user.id is known */
  adoptionUpdateAlert?: boolean;
}

export function Avatar({
  user,
  size = 44,
  ring = false,
  adoptionUpdateAlert,
}: AvatarProps) {
  const { colors } = useTheme();
  const adoption = useOptionalAdoption();
  const records = adoption?.records ?? [];
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const tint = user.tint || '#F2972E';
  const from = shade(tint, 0);
  const to = shade(tint, -14);
  const fontSize = Math.round(size * 0.36);

  const showUpdateAlert = useMemo(() => {
    if (adoptionUpdateAlert === false) return false;
    if (adoptionUpdateAlert === true) return true;
    const userId = user.id;
    if (!userId) return false;
    return userHasPendingAdoptionUpdate(records, userId);
  }, [adoptionUpdateAlert, records, user.id]);

  return (
    <View style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Text style={{ fontSize, fontWeight: '700', color: '#fff', letterSpacing: -0.5 }}>{initials}</Text>
      </LinearGradient>
      {ring && (
        <View style={[StyleSheet.absoluteFill, {
          borderRadius: size / 2,
          borderWidth: 2.5,
          borderColor: colors.surface,
        }]} pointerEvents="none" />
      )}
      {showUpdateAlert && (
        <AdoptionUpdateAlertBadge avatarSize={size} borderColor={colors.bg} />
      )}
    </View>
  );
}

interface CompanionAvatarProps {
  pet?: { icon?: string; tint: string; name?: string };
  companion?: { icon?: string; tint: string; name?: string; species?: string };
  size?: number;
}

export function CompanionAvatar({ pet: petProp, companion, size = 30 }: CompanionAvatarProps) {
  const pet = petProp ?? companion ?? { tint: '#14A697' };
  const tint = pet.tint || '#14A697';

  return (
    <PawPadShape
      size={size}
      tint={tint}
      tintDark={shade(tint, -14)}
      icon={pet.icon || 'paw'}
    />
  );
}

interface CompanionPillsProps {
  ids: string[];
  companions: Record<string, { id: string; name: string; tint: string; icon?: string }>;
  onOpen?: (id: string) => void;
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
  circle: { alignItems: 'center', justifyContent: 'center' },
  updateAlertBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    alignItems: 'center',
    justifyContent: 'center',
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
});
