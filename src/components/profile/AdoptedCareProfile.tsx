import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Platform, Animated, Easing,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { CompanionAvatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { AdoptionStatusTag } from './AdoptionStatusTag';
import {
  getAdoptedProfileDisplay,
  getRehomedProfileDisplay,
  countMissedMilestones,
  getMilestoneHomeUpdate,
  getMilestoneMeterState,
} from '../../utils/profileAdoptionDisplay';
import { InlinePostHomeUpdateForm } from '../adoption/AdoptionUpdateUI';
import type { AdoptionUpdatePayload } from '../../data/adoptionRecords';
import {
  getLatestAdopterResponse,
  getLatestPosterEndorsementUpdate,
  getPosterEndorsementCount,
  getPosterEndorsementUpdates,
  getUserHandle,
  type AdoptionRecord,
  type PosterRecommendation,
} from '../../data/adoptionRecords';
import {
  UPDATE_MILESTONES,
  getCompletedMilestones,
  type UpdateMilestoneId,
} from '../../utils/adoptionUpdateSchedule';
import type { ChatSublineTone } from '../../utils/chatThreadMeta';

const MILESTONE_SHORT: Record<UpdateMilestoneId, string> = {
  week_1: 'Wk 1',
  month_1: 'Mo 1',
  month_3: 'Mo 3',
  month_6: 'Mo 6',
};

function MeterSegment({
  tone,
  fillColor,
  trackColor,
}: {
  tone: 'idle' | 'success' | 'warning';
  fillColor: string;
  trackColor: string;
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
    <View style={styles.meterSegmentTrack}>
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
}: {
  state: ReturnType<typeof getMilestoneMeterState>;
  selected: boolean;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const selectScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state !== 'due') {
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
  }, [pulse, state]);

  useEffect(() => {
    Animated.spring(selectScale, {
      toValue: selected ? 1.08 : 1,
      friction: 7,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [selectScale, selected]);

  const labelColor = selected
    ? colors.primary
    : state === 'satisfied'
      ? colors.success
      : state === 'missed'
        ? colors.warning
        : state === 'due'
          ? colors.primary
          : colors.textTertiary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${state}`}
      style={({ pressed }) => [
        styles.meterStop,
        { opacity: pressed ? 0.72 : 1 },
        Platform.OS === 'web' && styles.meterItemWeb,
      ]}
    >
      <Animated.View style={[styles.meterNodeWrap, { transform: [{ scale: selectScale }] }]}>
        {state === 'due' ? (
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <View style={[styles.meterDotDue, { borderColor: colors.primary }]}>
              <View style={[styles.meterDotCore, { backgroundColor: colors.primary }]} />
            </View>
          </Animated.View>
        ) : state === 'missed' ? (
          <Icon name="alert" size={12} color={colors.warning} />
        ) : state === 'satisfied' ? (
          <View style={[styles.meterDot, { backgroundColor: colors.success }]} />
        ) : (
          <View style={[styles.meterDot, styles.meterDotUpcoming, { borderColor: colors.borderStrong }]} />
        )}
      </Animated.View>
      <Text
        style={[
          styles.meterLabel,
          { color: labelColor },
          selected && styles.meterLabelSelected,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function CareMilestoneMeter({
  record,
  selectedId,
  onSelect,
}: {
  record: AdoptionRecord;
  selectedId: UpdateMilestoneId | null;
  onSelect: (id: UpdateMilestoneId) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.meterTrack}>
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
              onPress={() => onSelect(m.id)}
              colors={colors}
            />
            {!isLast ? (
              <MeterSegment
                tone={segmentTone}
                fillColor={segmentFill}
                trackColor={colors.border}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function MilestoneDetailPanel({
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

  if (state === 'missed') {
    return (
      <Text style={[styles.milestonePanelText, { color: colors.textTertiary }]}>
        No update
      </Text>
    );
  }

  if (state === 'due' && isAdopter && onSubmitUpdate) {
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
    const media = [
      update.photoCount ? `${update.photoCount} photo${update.photoCount === 1 ? '' : 's'}` : null,
      update.hasVideo ? 'video' : null,
    ].filter(Boolean).join(' · ');
    return (
      <View style={styles.milestonePanelBlock}>
        {update.text ? (
          <Text style={[styles.milestonePanelQuote, { color: colors.text }]}>{update.text}</Text>
        ) : null}
        <Text style={[styles.milestonePanelText, { color: colors.textTertiary }]}>
          {media || 'Update posted'}{update.createdAt ? ` · ${update.createdAt}` : ''}
        </Text>
      </View>
    );
  }

  if (state === 'upcoming') {
    return (
      <Text style={[styles.milestonePanelText, { color: colors.textTertiary }]}>
        Not due yet
      </Text>
    );
  }

  if (state === 'due') {
    return (
      <Text style={[styles.milestonePanelText, { color: colors.textTertiary }]}>
        Check-in due
      </Text>
    );
  }

  return null;
}

function InlineRecommendation({
  label,
  tone,
  quote,
  by,
  when,
}: {
  label: string;
  tone: ChatSublineTone;
  quote?: string;
  by?: string;
  when?: string;
}) {
  const { colors } = useTheme();
  const tint = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.danger;

  return (
    <View style={styles.recBlock}>
      <View style={styles.recHead}>
        <Icon name={tone === 'success' ? 'heart' : 'alert'} size={14} color={tint} />
        <Text style={[styles.recLabel, { color: tint }]}>{label}</Text>
      </View>
      {quote ? (
        <Text style={[styles.recQuote, { color: colors.text }]}>{quote}</Text>
      ) : null}
      {by ? (
        <Text style={[styles.recBy, { color: colors.textTertiary }]}>
          {by} · previous owner{when ? ` · ${when}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

export function AdoptedCareProfile({
  record,
  viewerId,
  onSubmitUpdate,
  onSubmitRecommendation,
  onSubmitAdopterResponse,
}: {
  record: AdoptionRecord;
  viewerId: string;
  onSubmitUpdate?: (payload: AdoptionUpdatePayload) => void;
  onSubmitRecommendation?: (rec: PosterRecommendation, text?: string) => void;
  onSubmitAdopterResponse?: (text: string) => void;
}) {
  const { colors } = useTheme();
  const isAdopter = record.adopterId === viewerId;
  const isPoster = record.posterId === viewerId;
  const isVisitor = !isAdopter && !isPoster;

  const display = isPoster
    ? getRehomedProfileDisplay(record, isVisitor ? 'public' : 'owner')
    : getAdoptedProfileDisplay(record, isVisitor ? 'public' : 'owner');

  const missed = countMissedMilestones(record);
  const completed = getCompletedMilestones(record).length;
  const total = UPDATE_MILESTONES.length;
  const latestEndorsement = getLatestPosterEndorsementUpdate(record);
  const endorsementCount = getPosterEndorsementCount(record);
  const adopterResponse = getLatestAdopterResponse(record);

  const [selectedMilestoneId, setSelectedMilestoneId] = useState<UpdateMilestoneId | null>(null);
  const [selectedRec, setSelectedRec] = useState<PosterRecommendation | null>(null);
  const [recText, setRecText] = useState('');
  const [responseText, setResponseText] = useState('');

  const toggleMilestone = (id: UpdateMilestoneId) => {
    setSelectedMilestoneId(prev => (prev === id ? null : id));
  };

  const careSummary = useMemo(() => {
    if (missed > 0) {
      return `${completed} of ${total} check-ins · ${missed} missed`;
    }
    if (completed >= total) return `All ${total} check-ins complete`;
    return `${completed} of ${total} check-ins on time`;
  }, [completed, total, missed]);

  const noteRequired = endorsementCount >= 1;
  const canSubmitRec = Boolean(selectedRec) && (!noteRequired || Boolean(recText.trim()));
  const showAdopterResponse = isAdopter
    && latestEndorsement?.endorsement === 'not_recommended'
    && onSubmitAdopterResponse;

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <CompanionAvatar
          pet={{ icon: record.icon, tint: record.tint, name: record.petName }}
          size={52}
        />
        <View style={styles.heroMeta}>
          <Text style={[styles.petName, { color: colors.text }]}>{record.petName}</Text>
          <Text style={[styles.subline, { color: colors.textTertiary }]}>{display.subline}</Text>
        </View>
        <AdoptionStatusTag label={display.statusLabel} tone={display.statusTone} />
      </View>

      <Text style={[styles.careSummary, { color: missed > 0 ? colors.warning : colors.textSecondary }]}>
        {careSummary}
      </Text>

      <CareMilestoneMeter
        record={record}
        selectedId={selectedMilestoneId}
        onSelect={toggleMilestone}
      />

      {latestEndorsement ? (
        <InlineRecommendation
          label={latestEndorsement.endorsement === 'recommended' ? 'Recommended' : 'Not recommended'}
          tone={latestEndorsement.endorsement === 'recommended' ? 'success' : 'danger'}
          quote={latestEndorsement.text}
          by={`@${getUserHandle(record.posterId)}`}
          when={latestEndorsement.createdAt}
        />
      ) : isVisitor ? (
        <Text style={[styles.noRec, { color: colors.textTertiary }]}>
          No feedback from previous owner yet
        </Text>
      ) : null}

      {selectedMilestoneId ? (
        <MilestoneDetailPanel
          record={record}
          milestoneId={selectedMilestoneId}
          isAdopter={isAdopter}
          onSubmitUpdate={onSubmitUpdate}
        />
      ) : null}

      {adopterResponse ? (
        <View style={[styles.responseBlock, { borderLeftColor: colors.primary }]}>
          <Text style={[styles.responseLabel, { color: colors.textTertiary }]}>Adopter&apos;s response</Text>
          <Text style={[styles.responseText, { color: colors.text }]}>{adopterResponse.text}</Text>
        </View>
      ) : null}

      {showAdopterResponse && !adopterResponse ? (
        <View style={styles.responseForm}>
          <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
            Share your side
          </Text>
          <TextInput
            style={[
              styles.formInput,
              { color: colors.text, borderBottomColor: colors.border },
            ]}
            placeholder="Explain what happened…"
            placeholderTextColor={colors.textTertiary}
            value={responseText}
            onChangeText={setResponseText}
            multiline
          />
          <Pressable
            onPress={() => {
              if (!responseText.trim()) return;
              onSubmitAdopterResponse(responseText.trim());
              setResponseText('');
            }}
            disabled={!responseText.trim()}
            style={({ pressed }) => [{ opacity: pressed ? 0.75 : !responseText.trim() ? 0.4 : 1 }]}
          >
            <Text style={[styles.submitLink, { color: colors.primary }]}>Post response</Text>
          </Pressable>
        </View>
      ) : null}

      {isPoster && onSubmitRecommendation ? (
        <View style={styles.posterRate}>
          <View style={styles.rateChoices}>
            {(['recommended', 'not_recommended'] as const).map(rec => {
              const active = selectedRec === rec;
              const tint = rec === 'recommended' ? colors.success : colors.danger;
              return (
                <Pressable
                  key={rec}
                  onPress={() => setSelectedRec(rec)}
                  style={({ pressed }) => [
                    styles.rateChoice,
                    {
                      borderBottomColor: active ? tint : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={[
                    styles.rateChoiceText,
                    { color: active ? tint : colors.textSecondary },
                  ]}>
                    {rec === 'recommended' ? 'Recommend' : 'Not recommended'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selectedRec ? (
            <>
              <TextInput
                style={[
                  styles.formInput,
                  { color: colors.text, borderBottomColor: colors.border },
                ]}
                placeholder={noteRequired ? 'Why this rating? (required)' : 'Add a note (optional)'}
                placeholderTextColor={colors.textTertiary}
                value={recText}
                onChangeText={setRecText}
                multiline
              />
              <Pressable
                onPress={() => {
                  if (!canSubmitRec || !selectedRec) return;
                  onSubmitRecommendation(selectedRec, recText.trim() || undefined);
                  setSelectedRec(null);
                  setRecText('');
                }}
                disabled={!canSubmitRec}
                style={({ pressed }) => [{ opacity: pressed ? 0.75 : !canSubmitRec ? 0.4 : 1 }]}
              >
                <Text style={[
                  styles.submitLink,
                  { color: selectedRec === 'recommended' ? colors.success : colors.danger },
                ]}>
                  Submit feedback
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}

      {isVisitor && getPosterEndorsementUpdates(record).length > 1 ? (
        <View style={styles.history}>
          <Text style={[styles.historyLabel, { color: colors.textTertiary }]}>Earlier feedback</Text>
          {getPosterEndorsementUpdates(record).slice(0, -1).reverse().map(item => (
            <Text
              key={item.id}
              style={[styles.historyItem, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {item.endorsement === 'recommended' ? '✓' : '✗'} {item.text ?? '—'} · {item.createdAt}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14, paddingTop: 4 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroMeta: { flex: 1, gap: 2, minWidth: 0 },
  petName: { ...typography.title, fontSize: 17 },
  subline: { ...typography.small, fontSize: 12.5 },
  careSummary: { ...typography.small, fontWeight: '600' },
  meterTrack: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 2,
  },
  meterStop: {
    alignItems: 'center',
    gap: 5,
    minWidth: 34,
    zIndex: 1,
  },
  meterNodeWrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterItemWeb: { cursor: 'pointer' as const },
  meterDot: { width: 8, height: 8, borderRadius: 4 },
  meterDotUpcoming: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  meterDotDue: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  meterLabelSelected: { fontWeight: '800' },
  milestonePanelBlock: { gap: 4 },
  milestonePanelQuote: { ...typography.small, fontSize: 14, lineHeight: 20 },
  milestonePanelText: { ...typography.small, fontSize: 12.5 },
  recBlock: { gap: 6 },
  recHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  recLabel: { fontSize: 14, fontWeight: '700' },
  recQuote: { ...typography.small, fontSize: 14, lineHeight: 20 },
  recBy: { ...typography.meta, fontSize: 11 },
  noRec: { ...typography.small, fontSize: 12.5 },
  responseBlock: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    gap: 4,
  },
  responseLabel: { ...typography.meta, fontSize: 11, fontWeight: '700' },
  responseText: { ...typography.small, fontSize: 13.5, lineHeight: 19 },
  responseForm: { gap: 8 },
  posterRate: { gap: 10, paddingTop: 4 },
  formLabel: { ...typography.small, fontWeight: '600' },
  formInput: {
    ...typography.body,
    fontSize: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  submitLink: { ...typography.link, fontWeight: '700', alignSelf: 'flex-start' },
  rateChoices: { flexDirection: 'row', gap: 16 },
  rateChoice: {
    paddingBottom: 6,
    borderBottomWidth: 2,
  },
  rateChoiceText: { fontSize: 14, fontWeight: '700' },
  history: { gap: 6, paddingTop: 4 },
  historyLabel: { ...typography.meta, fontSize: 11, fontWeight: '700' },
  historyItem: { ...typography.small, fontSize: 12 },
});
