import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../icons/Icon';
import { InlinePostHomeUpdateForm } from '../adoption/AdoptionUpdateUI';
import { AdoptionHomeUpdateCard } from '../adoption/AdoptionHomeUpdateCard';
import type { AdoptionRecord, AdoptionUpdatePayload } from '../../data/adoptionRecords';
import {
  getMilestoneHomeUpdate,
  getMilestoneMeterState,
} from '../../utils/profileAdoptionDisplay';
import {
  UPDATE_MILESTONES,
  canAdopterPostUpdate,
  getActivePrompt,
  type UpdateMilestoneId,
} from '../../utils/adoptionUpdateSchedule';

function milestoneSubtitle(
  record: AdoptionRecord,
  milestoneId: UpdateMilestoneId,
  state: ReturnType<typeof getMilestoneMeterState>,
): string {
  const activePrompt = getActivePrompt(record);
  const update = getMilestoneHomeUpdate(record, milestoneId);

  if (state === 'satisfied' && update?.createdAt) {
    return update.createdAt;
  }
  if (state === 'due') {
    if (activePrompt?.milestone.id === milestoneId) {
      if (activePrompt.overdue) {
        const d = activePrompt.overdueDays === 1 ? '1 day' : `${activePrompt.overdueDays} days`;
        return `Overdue · ${d}`;
      }
      const days = Math.ceil((activePrompt.dueMs - Date.now()) / 86_400_000);
      if (days <= 1) return 'Due soon';
      return `Due in ${days} days`;
    }
    return 'Due now';
  }
  if (state === 'missed') return 'No update posted';
  if (state === 'upcoming') return 'Not due yet';
  return '';
}

function stemColor(
  state: ReturnType<typeof getMilestoneMeterState>,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  if (state === 'satisfied') return colors.success + '66';
  if (state === 'missed') return colors.warning + '44';
  if (state === 'due') return colors.primary + '44';
  return colors.border;
}

function TimelineNode({
  state,
  colors,
}: {
  state: ReturnType<typeof getMilestoneMeterState>;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state !== 'due') {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, state]);

  const dot = (
    <View
      style={[
        styles.nodeDot,
        state === 'satisfied' && { backgroundColor: colors.success, borderColor: colors.success },
        state === 'due' && {
          backgroundColor: colors.primary + '14',
          borderColor: colors.primary,
          borderWidth: 2,
        },
        state === 'missed' && {
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
      {state === 'satisfied' ? (
        <Icon name="check" size={9} color={colors.onPrimary} />
      ) : state === 'due' ? (
        <View style={[styles.nodeCore, { backgroundColor: colors.primary }]} />
      ) : state === 'missed' ? (
        <Icon name="alert" size={9} color={colors.warning} />
      ) : null}
    </View>
  );

  if (state === 'due') {
    return <Animated.View style={{ transform: [{ scale: pulse }] }}>{dot}</Animated.View>;
  }

  return dot;
}

function MilestoneRowBody({
  record,
  milestoneId,
  isAdopter,
  onSubmitUpdate,
}: {
  record: AdoptionRecord;
  milestoneId: UpdateMilestoneId;
  isAdopter: boolean;
  onSubmitUpdate?: (payload: AdoptionUpdatePayload) => void;
}) {
  const { colors } = useTheme();
  const state = getMilestoneMeterState(record, milestoneId);
  const milestone = UPDATE_MILESTONES.find(m => m.id === milestoneId)!;
  const update = getMilestoneHomeUpdate(record, milestoneId);

  if (state === 'due' && isAdopter && onSubmitUpdate && canAdopterPostUpdate(record)) {
    return (
      <InlinePostHomeUpdateForm
        key={`${record.id}-${milestoneId}-form`}
        record={record}
        milestoneLabel={milestone.label}
        promptText={milestone.prompt}
        onSubmit={onSubmitUpdate}
      />
    );
  }

  if (state === 'satisfied' && update) {
    return <AdoptionHomeUpdateCard update={update} variant="timeline" />;
  }

  if (state === 'due') {
    return (
      <Text style={[styles.rowMeta, { color: colors.textTertiary }]}>
        {record.status === 'closed'
          ? 'Check-ins closed'
          : 'Waiting for adopter update'}
      </Text>
    );
  }

  if (state === 'missed') {
    return (
      <Text style={[styles.rowMeta, { color: colors.warning }]}>
        No update posted
      </Text>
    );
  }

  return null;
}

function MilestoneTimelineRow({
  record,
  milestoneId,
  label,
  isLast,
  isAdopter,
  onSubmitUpdate,
}: {
  record: AdoptionRecord;
  milestoneId: UpdateMilestoneId;
  label: string;
  isLast: boolean;
  isAdopter: boolean;
  onSubmitUpdate?: (payload: AdoptionUpdatePayload) => void;
}) {
  const { colors } = useTheme();
  const state = getMilestoneMeterState(record, milestoneId);
  const subtitle = milestoneSubtitle(record, milestoneId, state);
  const milestone = UPDATE_MILESTONES.find(m => m.id === milestoneId)!;
  const showPrompt = state === 'due' && isAdopter && canAdopterPostUpdate(record);
  const hasBody = state === 'satisfied'
    || state === 'missed'
    || state === 'due';

  const subtitleColor = state === 'due'
    ? colors.primary
    : state === 'missed'
      ? colors.warning
      : state === 'satisfied'
        ? colors.textTertiary
        : colors.textTertiary;

  return (
    <View style={styles.timelineRow}>
      <View style={styles.railCol}>
        <TimelineNode state={state} colors={colors} />
        {!isLast ? (
          <View
            style={[
              styles.railStemGrow,
              { backgroundColor: stemColor(state, colors) },
            ]}
          />
        ) : null}
      </View>

      <View style={[styles.rowContent, isLast && styles.rowContentLast]}>
        <View style={styles.rowHead}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>{label}</Text>
          {subtitle ? (
            <Text style={[styles.rowSub, { color: subtitleColor }]}>{subtitle}</Text>
          ) : null}
        </View>
        {showPrompt ? (
          <Text style={[styles.rowPrompt, { color: colors.textSecondary }]}>
            {milestone.prompt}
          </Text>
        ) : null}
        {hasBody ? (
          <MilestoneRowBody
            record={record}
            milestoneId={milestoneId}
            isAdopter={isAdopter}
            onSubmitUpdate={onSubmitUpdate}
          />
        ) : null}
      </View>
    </View>
  );
}

export function AdoptionCheckInsSection({
  record,
  isAdopter,
  onSubmitUpdate,
}: {
  record: AdoptionRecord;
  isAdopter: boolean;
  onSubmitUpdate?: (payload: AdoptionUpdatePayload) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Home updates</Text>

      <View style={styles.timeline}>
        {UPDATE_MILESTONES.map((m, index) => (
          <MilestoneTimelineRow
            key={m.id}
            record={record}
            milestoneId={m.id}
            label={m.label}
            isLast={index === UPDATE_MILESTONES.length - 1}
            isAdopter={isAdopter}
            onSubmitUpdate={onSubmitUpdate}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    paddingTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  timeline: {
    paddingTop: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  railCol: {
    width: 20,
    alignItems: 'center',
  },
  railStemGrow: {
    width: 2,
    flex: 1,
    minHeight: 12,
    marginTop: 2,
    borderRadius: 1,
  },
  nodeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  nodeCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    paddingTop: 1,
    paddingBottom: 16,
  },
  rowContentLast: {
    paddingBottom: 0,
  },
  rowHead: {
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.15,
    lineHeight: 19,
  },
  rowSub: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  rowPrompt: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  rowMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
});
