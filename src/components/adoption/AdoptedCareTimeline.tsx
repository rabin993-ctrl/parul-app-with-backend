import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { PhotoSlot } from '../ui/PhotoSlot';
import type { AdoptionRecord, AdoptionUpdate } from '../../data/adoptionRecords';
import { getAdopterHomeUpdates } from '../../data/adoptionRecords';
import {
  UPDATE_MILESTONES,
  getActivePrompt,
  getCompletedMilestones,
  type UpdateMilestoneId,
} from '../../utils/adoptionUpdateSchedule';

const MILESTONE_META: Record<UpdateMilestoneId, { short: string; icon: string }> = {
  week_1: { short: 'Wk 1', icon: 'home' },
  month_1: { short: 'Mo 1', icon: 'calendar' },
  month_3: { short: 'Mo 3', icon: 'calendar' },
  month_6: { short: 'Mo 6', icon: 'calendar' },
};

function chipState(
  id: UpdateMilestoneId,
  completed: Set<UpdateMilestoneId>,
  activeId?: UpdateMilestoneId,
): 'done' | 'current' | 'upcoming' {
  if (completed.has(id)) return 'done';
  if (id === activeId) return 'current';
  return 'upcoming';
}

const MILESTONE_BADGE: Record<UpdateMilestoneId, string> = {
  week_1: 'Week 1 check-in',
  month_1: '1-month update',
  month_3: '3-month update',
  month_6: '6-month update',
};

function milestoneBadgeLabel(id?: UpdateMilestoneId): string {
  if (!id) return 'Home update';
  return MILESTONE_BADGE[id] ?? 'Home update';
}

function UpdateMediaPreview({
  update,
  tint,
  icon,
  colors,
}: {
  update: AdoptionUpdate;
  tint: string;
  icon: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const photoCount = update.photoCount ?? 0;
  const hasVideo = update.hasVideo;
  if (photoCount === 0 && !hasVideo) return null;

  const thumbHeight = photoCount === 1 ? 148 : 96;

  return (
    <View style={styles.mediaBlock}>
      <View style={[styles.mediaRow, photoCount === 1 && styles.mediaRowSingle]}>
        {Array.from({ length: photoCount }, (_, i) => (
          <PhotoSlot
            key={`photo-${i}`}
            height={thumbHeight}
            imageKey={`${update.id}-photo-${i}`}
            imageIndex={i}
            label=""
            borderRadius={radius.sm}
            style={photoCount === 1 ? styles.mediaPhotoFull : styles.mediaPhotoMulti}
          />
        ))}
      </View>
      {hasVideo ? (
        <View style={[styles.mediaVideoBadge, { backgroundColor: colors.primary }]}>
          <Icon name="play-square" size={11} color={colors.onPrimary} />
          <Text style={[styles.mediaVideoBadgeText, { color: colors.onPrimary }]}>Video</Text>
        </View>
      ) : null}
    </View>
  );
}

function MilestoneStepper({
  completed,
  activeId,
  colors,
}: {
  completed: Set<UpdateMilestoneId>;
  activeId?: UpdateMilestoneId;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.stepperWrap}>
      <View style={styles.stepperTrack}>
        {UPDATE_MILESTONES.map((m, index) => {
          const state = chipState(m.id, completed, activeId);
          const meta = MILESTONE_META[m.id];
          const nodeFg = state === 'done'
            ? colors.success
            : state === 'current'
              ? colors.warning
              : colors.textTertiary;
          const segmentDone = completed.has(m.id);
          const isLast = index === UPDATE_MILESTONES.length - 1;

          return (
            <React.Fragment key={m.id}>
              <View style={styles.stepperStop}>
                <View
                  style={[
                    styles.stepDot,
                    state === 'done' && { backgroundColor: colors.success, borderColor: colors.success },
                    state === 'current' && {
                      backgroundColor: colors.warningBg,
                      borderColor: colors.warning,
                      borderWidth: 2,
                    },
                    state === 'upcoming' && {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderStrong,
                    },
                  ]}
                >
                  {state === 'done' ? (
                    <Icon name="check" size={8} color={colors.onPrimary} />
                  ) : state === 'current' ? (
                    <View style={[styles.stepDotCore, { backgroundColor: colors.warning }]} />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    { color: state === 'upcoming' ? colors.textTertiary : nodeFg },
                    state === 'current' && styles.stepLabelActive,
                  ]}
                >
                  {meta.short}
                </Text>
              </View>

              {!isLast ? (
                <View
                  style={[
                    styles.stepSegment,
                    { backgroundColor: segmentDone ? colors.success + '55' : colors.border },
                  ]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

function MilestoneStatus({
  doneCount,
  total,
  activePrompt,
  colors,
}: {
  doneCount: number;
  total: number;
  activePrompt: ReturnType<typeof getActivePrompt>;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const allDone = doneCount >= total;
  const nextLabel = activePrompt?.milestone.label
    .replace(' check-in', '')
    .replace(' update', '');

  return (
    <View style={[styles.statusRow, { borderTopColor: colors.border }]}>
      <View style={styles.statusLeft}>
        {allDone ? (
          <Icon name="check-circle" size={13} color={colors.success} />
        ) : null}
        <Text style={[styles.statusPrimary, { color: colors.text }]}>
          {allDone ? 'All check-ins complete' : `${doneCount}/${total} complete`}
        </Text>
      </View>
      {!allDone && nextLabel ? (
        <Text
          style={[
            styles.statusDetail,
            { color: activePrompt?.overdue ? colors.warning : colors.textTertiary },
          ]}
        >
          {activePrompt?.overdue ? `${nextLabel} · overdue` : `Next · ${nextLabel}`}
        </Text>
      ) : null}
    </View>
  );
}

function TimelineEntry({
  update,
  isLast,
  tint,
  icon,
  colors,
}: {
  update: AdoptionUpdate;
  isLast: boolean;
  tint: string;
  icon: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const badgeLabel = milestoneBadgeLabel(update.milestoneId);

  return (
    <View style={styles.entryRow}>
      <View style={styles.railCol}>
        <View style={[styles.railStem, { backgroundColor: colors.border }]} />
        <View style={[styles.railDot, { backgroundColor: colors.primary, borderColor: colors.surface }]} />
        {!isLast && <View style={[styles.railStem, styles.railStemGrow, { backgroundColor: colors.border }]} />}
      </View>

      <View
        style={[
          styles.entryCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            marginBottom: isLast ? 0 : 10,
          },
        ]}
      >
        <View style={styles.entryHead}>
          <View style={[styles.entryBadge, { backgroundColor: colors.infoBg }]}>
            <Icon name="camera" size={12} color={colors.primary} />
            <Text style={[styles.entryBadgeText, { color: colors.primary }]}>{badgeLabel}</Text>
          </View>
          <Text style={[styles.entryDate, { color: colors.textTertiary }]}>{update.createdAt}</Text>
        </View>
        <UpdateMediaPreview update={update} tint={tint} icon={icon} colors={colors} />
        {update.text ? (
          <Text style={[styles.entryText, { color: colors.text }]}>{update.text}</Text>
        ) : (
          <Text style={[styles.entryText, { color: colors.textTertiary, fontStyle: 'italic' }]}>
            Photo or video update
          </Text>
        )}
      </View>
    </View>
  );
}

export function AdoptedCareTimeline({ record }: { record: AdoptionRecord }) {
  const { colors } = useTheme();
  const activePrompt = getActivePrompt(record);
  const completed = useMemo(() => new Set(getCompletedMilestones(record)), [record]);
  const doneCount = UPDATE_MILESTONES.filter(m => completed.has(m.id)).length;
  const homeUpdates = useMemo(() => getAdopterHomeUpdates(record), [record]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Care milestones</Text>
          <Text style={[styles.sectionSub, { color: colors.textTertiary }]}>
            {doneCount}/{UPDATE_MILESTONES.length} · 7 · 30 · 90 · 180 days
          </Text>
        </View>

        <MilestoneStepper
          completed={completed}
          activeId={activePrompt?.milestone.id}
          colors={colors}
        />

        <MilestoneStatus
          doneCount={doneCount}
          total={UPDATE_MILESTONES.length}
          activePrompt={activePrompt}
          colors={colors}
        />
      </View>

      <View style={styles.timelineSection}>
        <View style={styles.timelineHead}>
          <Text style={[styles.timelineTitle, { color: colors.text }]}>Update timeline</Text>
          <View style={[styles.countPill, { backgroundColor: colors.surface2 }]}>
            <Text style={[styles.countPillText, { color: colors.textSecondary }]}>
              {homeUpdates.length}
            </Text>
          </View>
        </View>

        {homeUpdates.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Icon name="camera" size={22} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No check-ins yet</Text>
            <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
              Week 1, month 1, month 3 & month 6 updates appear here
            </Text>
          </View>
        ) : (
          <View style={styles.timelineList}>
            {homeUpdates.map((update, i) => (
              <TimelineEntry
                key={update.id}
                update={update}
                isLast={i === homeUpdates.length - 1}
                tint={record.tint}
                icon={record.icon}
                colors={colors}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },

  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  sectionHead: { gap: 3 },
  sectionTitle: { ...typography.label, fontSize: 14 },
  sectionSub: { ...typography.meta, fontSize: 11 },

  stepperWrap: { paddingTop: 2 },
  stepperTrack: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepperStop: {
    alignItems: 'center',
    gap: 5,
    minWidth: 36,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stepSegment: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    marginTop: 8,
    marginHorizontal: 2,
    minWidth: 8,
  },
  stepLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  stepLabelActive: {
    fontWeight: '700',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 10,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  statusPrimary: { fontSize: 12, fontWeight: '600' },
  statusDetail: { fontSize: 11, fontWeight: '600' },

  timelineSection: { gap: 10 },
  timelineHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineTitle: { ...typography.label, fontSize: 15 },
  countPill: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  countPillText: { fontSize: 11, fontWeight: '700' },

  emptyCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  emptyTitle: { ...typography.label, fontSize: 14 },
  emptySub: { ...typography.small, textAlign: 'center', maxWidth: 240 },

  timelineList: { paddingTop: 2 },
  entryRow: { flexDirection: 'row', gap: 10 },
  railCol: { width: 18, alignItems: 'center' },
  railStem: { width: 2, height: 6, borderRadius: 1 },
  railStemGrow: { flex: 1, minHeight: 12, marginTop: 2 },
  railDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2.5,
    marginVertical: 2,
  },
  entryCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  entryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  entryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  entryBadgeText: { fontSize: 11, fontWeight: '700' },
  entryDate: { ...typography.meta, fontSize: 11 },
  entryText: { ...typography.bodySm, lineHeight: 21 },
  mediaBlock: { position: 'relative', gap: 0 },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mediaRowSingle: { width: '100%' },
  mediaPhotoFull: { width: '100%' },
  mediaPhotoMulti: { flex: 1, minWidth: '30%', maxWidth: '48%' },
  mediaVideoBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  mediaVideoBadgeText: { fontSize: 10, fontWeight: '700' },
});
