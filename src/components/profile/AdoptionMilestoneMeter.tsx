import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Icon } from '../icons/Icon';
import { getMilestoneMeterState } from '../../utils/profileAdoptionDisplay';
import { UPDATE_MILESTONES, type UpdateMilestoneId } from '../../utils/adoptionUpdateSchedule';
import type { AdoptionRecord } from '../../data/adoptionRecords';

export const MILESTONE_SHORT: Record<UpdateMilestoneId, string> = {
  week_1: 'Wk 1',
  month_1: 'Mo 1',
  month_3: 'Mo 3',
  month_6: 'Mo 6',
};

function MeterSegment({
  tone,
  fillColor,
  trackColor,
  compact,
}: {
  tone: 'idle' | 'success' | 'warning';
  fillColor: string;
  trackColor: string;
  compact?: boolean;
}) {
  const fill = useRef(new Animated.Value(tone === 'idle' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: tone === 'idle' ? 0 : 1,
      duration: tone === 'idle' ? 220 : 480,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fill, tone]);

  return (
    <View style={[styles.meterSegmentTrack, compact && styles.meterSegmentTrackCompact]}>
      <View style={[styles.meterSegmentBase, { backgroundColor: trackColor }]} />
      {tone !== 'idle' ? (
        <Animated.View
          style={[
            styles.meterSegmentFill,
            { backgroundColor: fillColor, opacity: fill },
          ]}
        />
      ) : null}
    </View>
  );
}

function MeterNode({
  state,
  selected,
  label,
  onPress,
  colors,
  compact,
  interactive,
}: {
  state: ReturnType<typeof getMilestoneMeterState>;
  selected: boolean;
  label: string;
  onPress?: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  compact?: boolean;
  interactive?: boolean;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const selectScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!interactive || state !== 'due') {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.22,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [interactive, pulse, state]);

  useEffect(() => {
    if (!interactive) return;
    Animated.spring(selectScale, {
      toValue: selected ? 1.08 : 1,
      friction: 7,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [interactive, selectScale, selected]);

  const labelColor = selected
    ? colors.primary
    : state === 'satisfied'
      ? colors.success
      : state === 'missed'
        ? colors.warning
        : state === 'due'
          ? colors.primary
          : colors.textTertiary;

  const dotSize = compact ? 7 : 8;
  const dueRing = compact ? 10 : 12;

  const node = (
    <>
      <Animated.View style={[styles.meterNodeWrap, interactive && { transform: [{ scale: selectScale }] }]}>
        {state === 'due' ? (
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <View style={[styles.meterDotDue, { width: dueRing, height: dueRing, borderRadius: dueRing / 2, borderColor: colors.primary }]}>
              <View style={[styles.meterDotCore, { backgroundColor: colors.primary }]} />
            </View>
          </Animated.View>
        ) : state === 'missed' ? (
          <Icon name="alert" size={compact ? 10 : 12} color={colors.warning} />
        ) : state === 'satisfied' ? (
          <View style={[styles.meterDot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, backgroundColor: colors.success }]} />
        ) : (
          <View style={[styles.meterDot, styles.meterDotUpcoming, { width: dotSize, height: dotSize, borderRadius: dotSize / 2, borderColor: colors.borderStrong }]} />
        )}
      </Animated.View>
      <Text
        style={[
          compact ? styles.meterLabelCompact : styles.meterLabel,
          { color: labelColor },
          selected && styles.meterLabelSelected,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </>
  );

  if (!interactive || !onPress) {
    return <View style={[styles.meterStop, compact && styles.meterStopCompact]}>{node}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${state}`}
      style={({ pressed }) => [
        styles.meterStop,
        compact && styles.meterStopCompact,
        { opacity: pressed ? 0.72 : 1 },
        Platform.OS === 'web' && styles.meterItemWeb,
      ]}
    >
      {node}
    </Pressable>
  );
}

type MeterProps = {
  record: AdoptionRecord;
  compact?: boolean;
  selectedId?: UpdateMilestoneId | null;
  onSelect?: (id: UpdateMilestoneId) => void;
};

export function AdoptionMilestoneMeter({
  record,
  compact = false,
  selectedId = null,
  onSelect,
}: MeterProps) {
  const { colors } = useTheme();
  const interactive = Boolean(onSelect);

  return (
    <View style={[styles.meterTrack, compact && styles.meterTrackCompact]}>
      {UPDATE_MILESTONES.map((m, index) => {
        const state = getMilestoneMeterState(record, m.id);
        const isLast = index === UPDATE_MILESTONES.length - 1;
        const segmentTone = state === 'satisfied'
          ? 'success'
          : state === 'missed'
            ? 'warning'
            : 'idle';
        const segmentFill = state === 'satisfied'
          ? colors.success + '88'
          : state === 'missed'
            ? colors.warning + '66'
            : colors.border;

        return (
          <React.Fragment key={m.id}>
            <MeterNode
              state={state}
              selected={selectedId === m.id}
              label={MILESTONE_SHORT[m.id]}
              onPress={onSelect ? () => onSelect(m.id) : undefined}
              colors={colors}
              compact={compact}
              interactive={interactive}
            />
            {!isLast ? (
              <MeterSegment
                tone={segmentTone}
                fillColor={segmentFill}
                trackColor={colors.border}
                compact={compact}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  meterTrack: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 2,
  },
  meterTrackCompact: {
    paddingTop: 0,
  },
  meterStop: {
    alignItems: 'center',
    gap: 5,
    minWidth: 34,
    zIndex: 1,
  },
  meterStopCompact: {
    minWidth: 30,
    gap: 4,
  },
  meterNodeWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterItemWeb: { cursor: 'pointer' as const },
  meterDot: {},
  meterDotUpcoming: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  meterDotDue: {
    borderWidth: 2,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterDotCore: { width: 4, height: 4, borderRadius: 2 },
  meterSegmentTrack: {
    flex: 1,
    height: 2,
    marginTop: 6,
    marginHorizontal: 2,
    minWidth: 10,
    justifyContent: 'center',
  },
  meterSegmentTrackCompact: {
    marginTop: 5,
    minWidth: 6,
  },
  meterSegmentBase: {
    ...StyleSheet.absoluteFill,
    borderRadius: 1,
    opacity: 0.55,
  },
  meterSegmentFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 1,
  },
  meterLabel: { fontSize: 9.5, fontWeight: '600', textAlign: 'center' },
  meterLabelCompact: { fontSize: 9, fontWeight: '600', textAlign: 'center' },
  meterLabelSelected: { fontWeight: '800' },
});
