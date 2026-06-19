import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { CompanionAvatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { AdoptionMilestoneMeter } from './AdoptionMilestoneMeter';
import { useUserProfile } from '../../hooks/useUserProfile';
import {
  getAdoptedProfileDisplay,
  getRehomedProfileDisplay,
  getMilestoneHomeUpdate,
  getMilestoneMeterState,
  isActiveAdoptionPlacement,
  isPastRelistedPlacement,
  findActivePlacementForListing,
} from '../../utils/profileAdoptionDisplay';
import { InlinePostHomeUpdateForm } from '../adoption/AdoptionUpdateUI';
import type { AdoptionUpdatePayload } from '../../data/adoptionRecords';
import { useAdoption } from '../../context/AdoptionContext';
import {
  getLatestAdopterResponse,
  getLatestPosterEndorsementUpdate,
  getPosterEndorsementCount,
  type AdoptionRecord,
  type PosterRecommendation,
} from '../../data/adoptionRecords';
import {
  UPDATE_MILESTONES,
  canAdopterPostUpdate,
  getActivePrompt,
  type UpdateMilestoneId,
} from '../../utils/adoptionUpdateSchedule';

function TextLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      style={({ pressed }) => [
        pressed && { opacity: 0.7 },
        Platform.OS === 'web' && styles.linkWeb,
      ]}
    >
      <Text style={[styles.link, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

function MilestoneDetail({
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
      <View style={styles.detailBlock}>
        <Text style={[styles.detailLead, { color: colors.text }]}>{milestone.prompt}</Text>
        <InlinePostHomeUpdateForm
          key={`${record.id}-${milestoneId}-form`}
          record={record}
          milestoneLabel={milestone.label}
          promptText={milestone.prompt}
          onSubmit={onSubmitUpdate}
        />
      </View>
    );
  }

  if (state === 'satisfied' && update) {
    return (
      <View style={styles.detailBlock}>
        {update.text ? (
          <Text style={[styles.detailQuote, { color: colors.text }]}>{update.text}</Text>
        ) : (
          <Text style={[styles.detailMeta, { color: colors.textTertiary }]}>Update posted</Text>
        )}
        {update.createdAt ? (
          <Text style={[styles.detailMeta, { color: colors.textTertiary }]}>{update.createdAt}</Text>
        ) : null}
      </View>
    );
  }

  if (state === 'missed') {
    return (
      <Text style={[styles.detailMeta, { color: colors.textTertiary }]}>
        No update posted
      </Text>
    );
  }

  if (state === 'upcoming') {
    return (
      <Text style={[styles.detailMeta, { color: colors.textTertiary }]}>
        Not due yet
      </Text>
    );
  }

  if (state === 'due') {
    return (
      <Text style={[styles.detailMeta, { color: colors.textTertiary }]}>
        {record.status === 'closed'
          ? 'Check-ins closed'
          : 'Waiting for adopter update'}
      </Text>
    );
  }

  return null;
}

export function AdoptedCareProfile({
  record,
  viewerId,
  onSubmitUpdate,
  onSubmitRecommendation,
  onSubmitAdopterResponse,
  onUserPress,
  onOpenRecord,
  onOpenListing,
}: {
  record: AdoptionRecord;
  viewerId: string;
  onSubmitUpdate?: (payload: AdoptionUpdatePayload) => void;
  onSubmitRecommendation?: (rec: PosterRecommendation, text?: string) => void;
  onSubmitAdopterResponse?: (text: string) => void;
  onUserPress?: (userId: string) => void;
  onOpenRecord?: (recordId: string) => void;
  onOpenListing?: (listingId: string) => void;
}) {
  const { colors } = useTheme();
  const { records } = useAdoption();
  const isAdopter = record.adopterId === viewerId;
  const isPoster = record.posterId === viewerId;
  const isVisitor = !isAdopter && !isPoster;
  const isActive = isActiveAdoptionPlacement(record);
  const isPastRelisted = isPastRelistedPlacement(record);
  const successorPlacement = isPastRelisted
    ? findActivePlacementForListing(records, record.adoptionPostId, record.id)
    : null;

  const display = isPoster
    ? getRehomedProfileDisplay(record, isVisitor ? 'public' : 'owner')
    : getAdoptedProfileDisplay(record, isAdopter ? 'owner' : 'public');

  const counterpartyId = isAdopter ? record.posterId : record.adopterId;
  const counterpartyLabel = isAdopter ? 'From' : 'Adopted by';
  const counterparty = useUserProfile(counterpartyId);
  const poster = useUserProfile(record.posterId);
  const counterpartyHandle = counterparty?.handle ?? counterpartyId.slice(0, 8);
  const posterHandle = poster?.handle ?? record.posterId.slice(0, 8);

  const latestEndorsement = getLatestPosterEndorsementUpdate(record);
  const endorsementCount = getPosterEndorsementCount(record);
  const adopterResponse = getLatestAdopterResponse(record);
  const activePrompt = getActivePrompt(record);

  const [selectedMilestoneId, setSelectedMilestoneId] = useState<UpdateMilestoneId | null>(null);
  const [selectedRec, setSelectedRec] = useState<PosterRecommendation | null>(
    () => latestEndorsement?.endorsement ?? null,
  );
  const [recText, setRecText] = useState('');
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    setSelectedRec(latestEndorsement?.endorsement ?? null);
  }, [record.id, latestEndorsement?.endorsement]);

  useEffect(() => {
    const due = UPDATE_MILESTONES.find(m => getMilestoneMeterState(record, m.id) === 'due');
    setSelectedMilestoneId(due?.id ?? null);
  }, [record.id]);

  const statusLine = useMemo(() => {
    if (isPastRelisted) return 'Re-listed — this placement is closed';
    if (activePrompt) {
      if (activePrompt.overdue) {
        const d = activePrompt.overdueDays === 1 ? '1 day' : `${activePrompt.overdueDays} days`;
        return `${activePrompt.milestone.label} check-in · ${d} overdue`;
      }
      const days = Math.ceil((activePrompt.dueMs - Date.now()) / 86_400_000);
      if (days <= 1) return `${activePrompt.milestone.label} check-in · due soon`;
      return `${activePrompt.milestone.label} check-in · due in ${days} days`;
    }
    return display.subline;
  }, [activePrompt, display.subline, isPastRelisted]);

  const noteRequired = endorsementCount >= 1;
  const canSubmitRec = Boolean(selectedRec) && (!noteRequired || Boolean(recText.trim()));
  const showPosterRate = isPoster && isActive && onSubmitRecommendation;
  const showAdopterResponse = isAdopter && isActive
    && latestEndorsement?.endorsement === 'not_recommended'
    && onSubmitAdopterResponse
    && !adopterResponse;

  const handleRateChoice = (rec: PosterRecommendation) => {
    if (!noteRequired && onSubmitRecommendation) {
      onSubmitRecommendation(rec, undefined);
      setSelectedRec(rec);
      setRecText('');
      return;
    }
    setSelectedRec(rec);
  };

  return (
    <View style={styles.wrap}>
      {/* Who */}
      <View style={styles.hero}>
        <CompanionAvatar
          pet={{ icon: record.icon, tint: record.tint, name: record.petName }}
          size={52}
        />
        <View style={styles.heroBody}>
          <View style={styles.heroMeta}>
            <Text style={[styles.petName, { color: colors.text }]}>{record.petName}</Text>
            {onUserPress ? (
              <TextLink
                label={`${counterpartyLabel} @${counterpartyHandle}`}
                onPress={() => onUserPress(counterpartyId)}
              />
            ) : (
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {counterpartyLabel} @{counterpartyHandle}
              </Text>
            )}
          </View>
          {record.adoptionPostId && onOpenListing ? (
            <Pressable
              onPress={() => onOpenListing(record.adoptionPostId)}
              accessibilityRole="link"
              accessibilityLabel={`View adoption post for ${record.petName}`}
              style={({ pressed }) => [
                styles.heroListingLink,
                pressed && { opacity: 0.7 },
                Platform.OS === 'web' && styles.linkWeb,
              ]}
            >
              <Text style={[styles.heroListingText, { color: colors.primary }]}>
                View adoption post
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Status — one line */}
      <Text style={[
        styles.statusLine,
        { color: activePrompt?.overdue ? colors.warning : colors.textSecondary },
      ]}>
        {statusLine}
      </Text>

      {successorPlacement && onOpenRecord ? (
        <TextLink
          label="View current placement"
          onPress={() => onOpenRecord(successorPlacement.id)}
        />
      ) : null}

      {/* Timeline */}
      <AdoptionMilestoneMeter
        record={record}
        selectedId={selectedMilestoneId}
        onSelect={id => setSelectedMilestoneId(prev => (prev === id ? null : id))}
      />
      {selectedMilestoneId ? (
        <MilestoneDetail
          record={record}
          milestoneId={selectedMilestoneId}
          isAdopter={isAdopter}
          onSubmitUpdate={onSubmitUpdate}
        />
      ) : null}

      {showPosterRate ? (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.actionLabel, { color: colors.text }]}>
            Recommend @{counterpartyHandle}?
          </Text>
          <View style={styles.rateRow}>
            {(['recommended', 'not_recommended'] as const).map(rec => {
              const active = selectedRec === rec;
              const tint = rec === 'recommended' ? colors.success : colors.danger;
              return (
                <Pressable
                  key={rec}
                  onPress={() => handleRateChoice(rec)}
                  style={({ pressed }) => [
                    styles.rateBtn,
                    {
                      borderColor: active ? tint : colors.border,
                      backgroundColor: active ? tint + '18' : 'transparent',
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.rateBtnText, { color: active ? tint : colors.textSecondary }]}>
                    {rec === 'recommended' ? 'Yes' : 'No'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selectedRec ? (
            <>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder={noteRequired ? 'Add a note (required)' : 'Add a note (optional)'}
                placeholderTextColor={colors.textTertiary}
                value={recText}
                onChangeText={setRecText}
                multiline
              />
              <Pressable
                onPress={() => {
                  if (!canSubmitRec || !selectedRec) return;
                  onSubmitRecommendation!(selectedRec, recText.trim() || undefined);
                  setSelectedRec(null);
                  setRecText('');
                }}
                disabled={!canSubmitRec}
                style={({ pressed }) => [{ opacity: pressed ? 0.75 : !canSubmitRec ? 0.4 : 1 }]}
              >
                <Text style={[styles.submit, { color: colors.primary }]}>Submit</Text>
              </Pressable>
            </>
          ) : null}
        </>
      ) : null}

      {showAdopterResponse ? (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.actionLabel, { color: colors.text }]}>Respond to feedback</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            placeholder="Your side of the story…"
            placeholderTextColor={colors.textTertiary}
            value={responseText}
            onChangeText={setResponseText}
            multiline
          />
          <Pressable
            onPress={() => {
              if (!responseText.trim()) return;
              onSubmitAdopterResponse!(responseText.trim());
              setResponseText('');
            }}
            disabled={!responseText.trim()}
            style={({ pressed }) => [{ opacity: pressed ? 0.75 : !responseText.trim() ? 0.4 : 1 }]}
          >
            <Text style={[styles.submit, { color: colors.primary }]}>Post</Text>
          </Pressable>
        </>
      ) : null}

      {/* Feedback — only if it exists */}
      {latestEndorsement ? (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.feedbackRow}>
            <Icon
              name={latestEndorsement.endorsement === 'recommended' ? 'heart' : 'alert'}
              size={14}
              color={latestEndorsement.endorsement === 'recommended' ? colors.success : colors.warning}
            />
            <Text style={[
              styles.feedbackLabel,
              { color: latestEndorsement.endorsement === 'recommended' ? colors.success : colors.warning },
            ]}>
              {latestEndorsement.endorsement === 'recommended' ? 'Recommended' : 'Not recommended'}
              {' · '}
              <Text style={{ color: colors.textTertiary }}>@{posterHandle} · previous owner</Text>
            </Text>
          </View>
          {latestEndorsement.text ? (
            <Text style={[styles.detailQuote, { color: colors.text }]}>{latestEndorsement.text}</Text>
          ) : null}
        </>
      ) : null}

      {adopterResponse ? (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.detailMeta, { color: colors.textTertiary }]}>Adopter response</Text>
          <Text style={[styles.detailQuote, { color: colors.text }]}>{adopterResponse.text}</Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14, paddingTop: 8 },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  heroMeta: { flex: 1, gap: 4, minWidth: 0 },
  heroListingLink: {
    flexShrink: 0,
    maxWidth: 96,
    paddingVertical: 2,
  },
  heroListingText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    textAlign: 'right',
  },
  petName: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  meta: { fontSize: 14, fontWeight: '500' },
  link: { fontSize: 14, fontWeight: '600' },
  linkWeb: { cursor: 'pointer' as const },
  statusLine: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  divider: { height: StyleSheet.hairlineWidth },
  detailBlock: { gap: 10, paddingTop: 4 },
  detailLead: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  detailQuote: { fontSize: 14, lineHeight: 20 },
  detailMeta: { fontSize: 13, lineHeight: 18 },
  actionLabel: { fontSize: 15, fontWeight: '600' },
  rateRow: { flexDirection: 'row', gap: 8, alignSelf: 'flex-start' },
  rateBtn: {
    paddingVertical: 7,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  rateBtnText: { fontSize: 13, fontWeight: '600' },
  input: {
    ...typography.body,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  submit: { fontSize: 15, fontWeight: '700', alignSelf: 'flex-start' },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  feedbackLabel: { fontSize: 14, fontWeight: '600' },
});
