import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { Badge } from '../ui/Badge';
import { Stars } from '../ui/Stars';
import {
  ConsultStatus,
  VetProfile,
  statusLabel,
  statusTone,
} from '../../data/vetData';

export function VetModeCard({
  title,
  body,
  icon,
  tint,
  badge,
  onPress,
}: {
  title: string;
  body: string;
  icon: string;
  tint: string;
  badge?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.9 : 1 },
        shadows.sm,
      ]}
    >
      <View style={[styles.modeIcon, { backgroundColor: tint + '16' }]}>
        <Icon name={icon} size={24} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.modeTitleRow}>
          <Text style={[styles.modeTitle, { color: colors.text }]}>{title}</Text>
          {badge && <Badge tone="danger" icon="alert">{badge}</Badge>}
        </View>
        <Text style={[styles.modeBody, { color: colors.textSecondary }]}>{body}</Text>
      </View>
      <Icon name="chevronRight" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

export function VetListCard({
  vet,
  onPress,
  selected,
}: {
  vet: VetProfile;
  onPress: () => void;
  selected?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.vetCard,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? colors.primary + '55' : colors.border,
          opacity: pressed ? 0.92 : 1,
        },
        shadows.sm,
      ]}
    >
      <View style={[styles.vetAvatar, { backgroundColor: vet.tint + '22' }]}>
        <Icon name="medical" size={22} color={vet.tint} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.vetNameRow}>
          <Text style={[styles.vetName, { color: colors.text }]} numberOfLines={1}>{vet.name}</Text>
        </View>
        <Text style={[styles.vetSpec, { color: colors.textSecondary }]} numberOfLines={1}>
          {vet.specialization}
        </Text>
        <View style={styles.vetMeta}>
          <Stars value={vet.rating} size={11} />
          <Text style={[styles.vetMetaText, { color: colors.textTertiary }]}>
            {vet.reviews} · ~{vet.responseMins} min
          </Text>
        </View>
      </View>
      <View style={styles.vetRight}>
        <Text style={[styles.vetFee, { color: colors.text }]}>₹{vet.fee}</Text>
        <Badge tone={vet.available ? 'success' : 'neutral'}>
          {vet.available ? 'Available' : 'Busy'}
        </Badge>
      </View>
    </Pressable>
  );
}

export function VetAssignedCard({ vet, responseLabel }: { vet: VetProfile; responseLabel: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.assignedCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.md]}>
      <View style={[styles.assignedAvatar, { backgroundColor: vet.tint + '20' }]}>
        <Icon name="medical" size={28} color={vet.tint} />
      </View>
      <Text style={[styles.assignedName, { color: colors.text }]}>{vet.name}</Text>
      <Text style={[styles.assignedTitle, { color: colors.textSecondary }]}>{vet.title}</Text>
      <Text style={[styles.assignedSpec, { color: colors.textSecondary }]}>{vet.specialization}</Text>
      <View style={styles.assignedStats}>
        <View style={styles.stat}>
          <Stars value={vet.rating} size={12} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>{vet.rating} ({vet.reviews})</Text>
        </View>
        <View style={styles.stat}>
          <Icon name="clock" size={14} color={colors.primary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>{responseLabel}</Text>
        </View>
        <View style={styles.stat}>
          <Icon name="vaccine" size={14} color={colors.primary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>₹{vet.fee} consult</Text>
        </View>
      </View>
    </View>
  );
}

export function ConsultStatusTracker({ status }: { status: ConsultStatus }) {
  const { colors } = useTheme();
  const steps: ConsultStatus[] = [
    'finding_vet',
    'vet_assigned',
    'payment_pending',
    'payment_completed',
    'session_ready',
    'active',
    'completed',
  ];
  const normalized = status === 'payment_failed' ? 'payment_pending' : status === 'cancelled' ? 'completed' : status;
  const idx = Math.max(0, steps.indexOf(normalized));

  return (
    <View style={styles.tracker}>
      {steps.map((step, i) => {
        const done = i <= idx && status !== 'cancelled' && status !== 'payment_failed';
        const active = i === idx;
        return (
          <View key={step} style={styles.trackStep}>
            <View style={[
              styles.trackDot,
              {
                backgroundColor: done ? colors.primary : colors.surface2,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}>
              {done && <Icon name="check" size={10} color="#fff" />}
            </View>
            {i < steps.length - 1 && (
              <View style={[styles.trackLine, { backgroundColor: i < idx ? colors.primary : colors.border }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

export function ConsultStatusBanner({ status }: { status: ConsultStatus }) {
  const { colors } = useTheme();
  const tone = statusTone(status);
  const toneColors = {
    success: { bg: colors.successBg, text: colors.success },
    warning: { bg: colors.warningBg, text: colors.warning },
    danger: { bg: colors.dangerBg, text: colors.danger },
    primary: { bg: colors.infoBg, text: colors.primary },
    neutral: { bg: colors.surface2, text: colors.textSecondary },
  }[tone];

  return (
    <View style={[styles.statusBanner, { backgroundColor: toneColors.bg }]}>
      <Text style={[styles.statusBannerText, { color: toneColors.text }]}>{statusLabel(status)}</Text>
    </View>
  );
}

export function FeeBreakdownCard({
  consultFee,
  platformFee,
  total,
}: {
  consultFee: number;
  platformFee: number;
  total: number;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.feeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <FeeRow label="Consultation fee" amount={consultFee} colors={colors} />
      <FeeRow label="Platform fee" amount={platformFee} colors={colors} />
      <View style={[styles.feeDivider, { backgroundColor: colors.border }]} />
      <FeeRow label="Total payable" amount={total} colors={colors} bold />
    </View>
  );
}

function FeeRow({
  label,
  amount,
  colors,
  bold,
}: {
  label: string;
  amount: number;
  colors: ReturnType<typeof useTheme>['colors'];
  bold?: boolean;
}) {
  return (
    <View style={styles.feeRow}>
      <Text style={[styles.feeLabel, { color: bold ? colors.text : colors.textSecondary, fontWeight: bold ? '800' : '600' }]}>
        {label}
      </Text>
      <Text style={[styles.feeAmount, { color: colors.text, fontWeight: bold ? '800' : '700' }]}>
        ₹{amount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  modeIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  modeTitle: { fontSize: 16, fontWeight: '800' },
  modeBody: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  vetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  vetAvatar: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vetNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  vetName: { fontSize: 15, fontWeight: '700' },
  vetSpec: { fontSize: 12.5, marginTop: 2 },
  vetMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  vetMetaText: { fontSize: 11.5 },
  vetRight: { alignItems: 'flex-end', gap: 6 },
  vetFee: { fontSize: 15, fontWeight: '800' },
  assignedCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 6,
  },
  assignedAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  assignedName: { fontSize: 18, fontWeight: '800' },
  assignedTitle: { fontSize: 13 },
  assignedSpec: { fontSize: 12.5, textAlign: 'center' },
  assignedStats: { gap: 8, marginTop: 10, width: '100%' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  statText: { fontSize: 12.5 },
  tracker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  trackStep: { flexDirection: 'row', alignItems: 'center' },
  trackDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackLine: { width: 18, height: 2 },
  statusBanner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    alignSelf: 'center',
  },
  statusBannerText: { fontSize: 13, fontWeight: '700' },
  feeCard: { padding: 14, borderRadius: radius.lg, borderWidth: 1, gap: 10 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeLabel: { fontSize: 13.5 },
  feeAmount: { fontSize: 14 },
  feeDivider: { height: 1 },
});
