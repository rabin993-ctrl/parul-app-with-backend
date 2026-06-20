import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { PhotoSlot } from '../ui/PhotoSlot';
import type { AdoptionUpdate } from '../../data/adoptionRecords';
import type { UpdateMilestoneId } from '../../utils/adoptionUpdateSchedule';
import { getAdoptionUpdateCaption } from '../../utils/adoptionUpdateText';

const MILESTONE_BADGE: Record<UpdateMilestoneId, string> = {
  week_1: 'Week 1 check-in',
  month_1: '1-month update',
  month_3: '3-month update',
  month_6: '6-month update',
};

const COMPACT_THUMB_HEIGHT = 68;
const COMPACT_THUMB_MAX = 3;

function milestoneBadgeLabel(id?: UpdateMilestoneId): string {
  if (!id) return 'Home update';
  return MILESTONE_BADGE[id] ?? 'Home update';
}

function MediaChip({
  icon,
  label,
  colors,
}: {
  icon: string;
  label: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.chip, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
      <Icon name={icon} size={11} color={colors.textSecondary} />
      <Text style={[styles.chipText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function AdoptionHomeUpdateCard({
  update,
  variant = 'compact',
}: {
  update: AdoptionUpdate;
  variant?: 'compact' | 'full' | 'timeline';
}) {
  const { colors } = useTheme();
  const photoCount = update.photoCount ?? 0;
  const hasVideo = Boolean(update.hasVideo);
  const caption = getAdoptionUpdateCaption(update.text);
  const badgeLabel = milestoneBadgeLabel(update.milestoneId);
  const visiblePhotos = Math.min(photoCount, COMPACT_THUMB_MAX);
  const overflowCount = photoCount > COMPACT_THUMB_MAX ? photoCount - COMPACT_THUMB_MAX : 0;
  const isTimeline = variant === 'timeline';
  const isCompact = variant === 'compact' || isTimeline;
  const thumbHeight = isCompact ? COMPACT_THUMB_HEIGHT : (photoCount === 1 ? 148 : 96);

  return (
    <View
      style={[
        isTimeline ? styles.cardTimeline : styles.card,
        !isTimeline && {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {!isTimeline ? (
        <View style={styles.head}>
          <View style={[styles.badge, { backgroundColor: colors.infoBg }]}>
            <Icon name="camera" size={12} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]} numberOfLines={1}>
              {badgeLabel}
            </Text>
          </View>
          {update.createdAt ? (
            <View style={styles.dateRow}>
              <Icon name="calendar" size={11} color={colors.textTertiary} />
              <Text style={[styles.dateText, { color: colors.textTertiary }]} numberOfLines={1}>
                {update.createdAt}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {photoCount > 0 ? (
        <View style={styles.thumbRow}>
          {Array.from({ length: visiblePhotos }, (_, i) => (
            <PhotoSlot
              key={`photo-${i}`}
              height={thumbHeight}
              imageKey={`${update.id}-photo-${i}`}
              imageIndex={i}
              label=""
              borderRadius={radius.sm}
              style={styles.thumb}
            />
          ))}
          {overflowCount > 0 ? (
            <View
              style={[
                styles.overflowPill,
                { backgroundColor: colors.surface2, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.overflowText, { color: colors.textSecondary }]}>
                +{overflowCount}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {(photoCount > 0 || hasVideo) ? (
        <View style={styles.chipRow}>
          {photoCount > 0 ? (
            <MediaChip
              icon="camera"
              label={`${photoCount} photo${photoCount === 1 ? '' : 's'}`}
              colors={colors}
            />
          ) : null}
          {hasVideo ? (
            <MediaChip icon="play-square" label="Video" colors={colors} />
          ) : null}
        </View>
      ) : null}

      {caption ? (
        <Text style={[styles.caption, { color: colors.text }]}>{caption}</Text>
      ) : null}

      {!caption && photoCount === 0 && !hasVideo ? (
        <Text style={[styles.caption, { color: colors.textTertiary, fontStyle: 'italic' }]}>
          Update posted
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
  },
  cardTimeline: {
    gap: 8,
    paddingTop: 2,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    flexShrink: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  dateText: { ...typography.meta, fontSize: 11 },
  thumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  thumb: {
    flex: 1,
    minWidth: 64,
    maxWidth: 120,
  },
  overflowPill: {
    minWidth: 44,
    height: 68,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  overflowText: { fontSize: 13, fontWeight: '700' },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  caption: { ...typography.bodySm, lineHeight: 21 },
});
