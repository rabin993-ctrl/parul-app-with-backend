import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { User } from '../../data/mockData';
import { PawPadShape } from './PawPadShape';

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

interface AvatarProps {
  user: Partial<User> & { name: string; tint: string; verified?: boolean };
  size?: number;
  ring?: boolean;
}

export function Avatar({ user, size = 44, ring = false }: AvatarProps) {
  const { colors } = useTheme();
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const tint = user.tint || '#F2972E';
  const from = shade(tint, 0);
  const to = shade(tint, -14);
  const fontSize = Math.round(size * 0.36);

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
