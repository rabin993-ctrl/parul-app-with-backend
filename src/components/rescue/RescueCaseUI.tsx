import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { PhotoSlot } from '../ui/PhotoSlot';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import {
  RESCUE_STATUS_META,
  type RescueCase,
} from '../../data/profileData';
import { useUserProfile } from '../../hooks/useUserProfile';

const TAG_PALETTE = [
  { bg: '#EAF7F0', text: '#3A9B72' },
  { bg: '#F0EBFA', text: '#7C5CBF' },
  { bg: '#FDF6E8', text: '#C98E2A' },
  { bg: '#FDF0F1', text: '#D94452' },
];

export function RescueStatusPill({
  status,
  size = 'md',
}: {
  status: RescueCase['status'];
  size?: 'sm' | 'md';
}) {
  const meta = RESCUE_STATUS_META[status];
  const compact = size === 'sm';
  const label = compact ? meta.shortLabel : meta.label;
  return (
    <View style={[
      styles.statusPill,
      compact && styles.statusPillSm,
      { backgroundColor: meta.bg },
    ]}>
      <Icon name={meta.icon} size={compact ? 10 : 12} color={meta.tint} />
      <Text style={[
        styles.statusPillText,
        compact && styles.statusPillTextSm,
        { color: meta.tint },
      ]}>
        {label}
      </Text>
    </View>
  );
}

export function RescueGridCell({
  item,
  width,
  onPress,
}: {
  item: RescueCase;
  width: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const meta = RESCUE_STATUS_META[item.status];
  const speciesLabel = item.species === 'cat' ? 'Cat' : item.species === 'dog' ? 'Dog' : item.species;
  const photoH = Math.round(width * 0.78);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gridCell,
        {
          width,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <View style={styles.gridPhotoWrap}>
        <PhotoSlot
          height={photoH}
          imageKey={item.id}
          imageIndex={item.species === 'cat' ? 1 : 0}
          borderRadius={0}
          label=""
        />
        <View style={[styles.gridStatus, { backgroundColor: meta.bg }]}>
          <View style={[styles.gridStatusDot, { backgroundColor: meta.tint }]} />
          <Text style={[styles.gridStatusText, { color: meta.tint }]} numberOfLines={1}>
            {meta.shortLabel}
          </Text>
        </View>
      </View>
      <View style={styles.gridBody}>
        <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.gridMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {speciesLabel} · {item.location.split(',')[0]?.trim() ?? item.location}
        </Text>
      </View>
    </Pressable>
  );
}

export function RescueListCard({
  item,
  onPress,
}: {
  item: RescueCase;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const meta = RESCUE_STATUS_META[item.status];
  const headline = item.headline ?? item.story.split('.')[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.listCard,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <PhotoSlot
        height={72}
        imageKey={item.id}
        borderRadius={radius.md}
        label=""
        style={{ width: 72 }}
      />
      <View style={styles.listBody}>
        <View style={styles.listTop}>
          <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <RescueStatusPill status={item.status} size="sm" />
        </View>
        <Text style={[styles.listHeadline, { color: colors.textSecondary }]} numberOfLines={1}>
          {headline}
        </Text>
        <Text style={[styles.listMeta, { color: colors.textTertiary }]}>
          {item.date} · {item.location}
        </Text>
      </View>
      <Icon name="chevronRight" size={14} color={colors.textTertiary} />
    </Pressable>
  );
}

export function RescueCaseHero({
  item,
}: {
  item: RescueCase;
}) {
  const { colors } = useTheme();
  const posterProfile = useUserProfile(item.userId);
  const poster = posterProfile ?? null;
  const headline = item.headline ?? `${item.name} — ${item.location.split(',')[0]?.trim() ?? item.location}`;
  const caseRef = item.caseId ?? `RC${item.id.replace(/\D/g, '').padStart(6, '0')}`;

  return (
    <LinearGradient
      colors={[item.tint + '28', colors.successBg]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.heroCard, { borderColor: item.tint + '30' }]}
    >
      <View style={styles.heroTop}>
        <View style={[styles.heroTypeBadge, { backgroundColor: colors.successBg }]}>
          <Icon name="shield" size={12} color={colors.success} />
          <Text style={[styles.heroTypeText, { color: colors.success }]}>Rescue Case</Text>
        </View>
        <Text style={[styles.heroCaseId, { color: colors.textTertiary }]}>ID: {caseRef}</Text>
      </View>

      <View style={styles.heroMain}>
        <View style={styles.heroCopy}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{headline}</Text>
          {poster && (
            <View style={styles.heroPoster}>
              <Avatar user={poster} size={32} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.heroPosterName, { color: colors.text }]}>
                  Posted by {poster.name.split(' ')[0]}
                </Text>
                <Text style={[styles.heroPosterMeta, { color: colors.textSecondary }]}>
                  {item.date} · {item.location}
                </Text>
              </View>
            </View>
          )}
        </View>
        <PhotoSlot
          height={96}
          imageKey={`${item.id}-hero`}
          borderRadius={radius.lg}
          label=""
          style={{ width: 96 }}
        />
      </View>

      <View style={styles.heroFooter}>
        <RescueStatusPill status={item.status} />
      </View>
    </LinearGradient>
  );
}

export function RescueCaseMetaStrip({ item }: { item: RescueCase }) {
  const { colors } = useTheme();
  const updateCount = item.updates?.length ?? 0;

  return (
    <View style={[styles.metaStrip, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
      <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
        {updateCount} update{updateCount === 1 ? '' : 's'}
      </Text>
      <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
      <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
        {item.followers ?? 0} following
      </Text>
    </View>
  );
}

export function RescueActionRow({
  following = false,
  helpOffered = false,
  helpAccepted = false,
  onFollow,
  onHelp,
  onShare,
}: {
  following?: boolean;
  helpOffered?: boolean;
  helpAccepted?: boolean;
  onFollow?: () => void;
  onHelp?: () => void;
  onShare?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.actionWrap}>
      <View style={styles.actionButtonRow}>
        <Button
          variant={following ? 'soft' : 'outline'}
          size="sm"
          icon="paw-line"
          style={{ flex: 1 }}
          onPress={onFollow}
        >
          {following ? 'Following' : 'Follow case'}
        </Button>
        <Button
          variant={helpOffered ? 'soft' : 'primary'}
          size="sm"
          icon="heart"
          style={{ flex: 1 }}
          onPress={onHelp}
        >
          {helpAccepted ? 'Help accepted' : helpOffered ? 'Offer sent' : 'Offer help'}
        </Button>
      </View>
      <View style={styles.shareStrip}>
        <Pressable
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel="Share case"
          style={({ pressed }) => [
            styles.shareBtn,
            { opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Icon name="forward" size={18} color={colors.textSecondary} />
          <Text style={[styles.shareLabel, { color: colors.textSecondary }]}>Share</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function RescueTagsRow({ tags }: { tags: string[] }) {
  return (
    <View style={styles.tagsRow}>
      {tags.map((tag, i) => {
        const palette = TAG_PALETTE[i % TAG_PALETTE.length];
        return (
          <View key={tag} style={[styles.tag, { backgroundColor: palette.bg }]}>
            <Text style={[styles.tagText, { color: palette.text }]}>{tag}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  statusPillSm: { paddingHorizontal: 7, paddingVertical: 3, gap: 4 },
  statusPillText: { fontSize: 11.5, fontWeight: '700' },
  statusPillTextSm: { fontSize: 9.5 },
  gridCell: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  gridPhotoWrap: { position: 'relative' },
  gridStatus: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    maxWidth: '88%',
  },
  gridStatusDot: { width: 6, height: 6, borderRadius: 3 },
  gridStatusText: { fontSize: 9, fontWeight: '700' },
  gridBody: { paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  gridName: { fontSize: 13.5, fontWeight: '700' },
  gridMeta: { fontSize: 11, fontWeight: '500' },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listBody: { flex: 1, minWidth: 0, gap: 3 },
  listTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  listName: { fontSize: 15, fontWeight: '700', flex: 1 },
  listHeadline: { fontSize: 13, fontWeight: '500' },
  listMeta: { fontSize: 11.5 },
  heroCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  heroTypeText: { fontSize: 11.5, fontWeight: '700' },
  heroCaseId: { fontSize: 11, fontWeight: '600' },
  heroMain: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  heroCopy: { flex: 1, minWidth: 0, gap: 10 },
  heroTitle: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  heroPoster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroPosterName: { fontSize: 13, fontWeight: '600' },
  heroPosterMeta: { fontSize: 11.5, marginTop: 1 },
  heroFooter: { flexDirection: 'row' },
  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaDivider: { width: StyleSheet.hairlineWidth, height: 14 },
  metaItem: { fontSize: 12, fontWeight: '600' },
  actionWrap: { gap: 10 },
  actionButtonRow: { flexDirection: 'row', gap: 8 },
  shareStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  shareLabel: { fontSize: 13.5, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: radius.full },
  tagText: { fontSize: 12, fontWeight: '700' },
});
