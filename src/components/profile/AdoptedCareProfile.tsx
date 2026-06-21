import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { CompanionAvatar } from '../ui/Avatar';
import { Icon } from '../icons/Icon';
import { AdoptionCheckInsSection } from './AdoptionCheckInsSection';
import { useUserProfile } from '../../hooks/useUserProfile';
import {
  isActiveAdoptionPlacement,
  isPastRelistedPlacement,
  findActivePlacementForListing,
} from '../../utils/profileAdoptionDisplay';
import type { AdoptionUpdatePayload } from '../../data/adoptionRecords';
import { useAdoption } from '../../context/AdoptionContext';
import {
  getLatestAdopterResponse,
  getLatestPosterEndorsementUpdate,
  getPosterEndorsementCount,
  isDefaultPosterEndorsementNote,
  isPosterEndorsementNoteRequired,
  type AdoptionRecord,
  type PosterRecommendation,
} from '../../data/adoptionRecords';
import { AdoptionUserFlag } from '../ui/AdoptionUserFlag';

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
  const isActive = isActiveAdoptionPlacement(record);
  const isPastRelisted = isPastRelistedPlacement(record);
  const successorPlacement = isPastRelisted
    ? findActivePlacementForListing(records, record.adoptionPostId, record.id)
    : null;

  const counterpartyId = isAdopter ? record.posterId : record.adopterId;
  const counterpartyLabel = isAdopter ? 'From' : 'Adopted by';
  const counterparty = useUserProfile(counterpartyId);
  const poster = useUserProfile(record.posterId);
  const counterpartyHandle = counterparty?.handle ?? counterpartyId.slice(0, 8);
  const posterHandle = poster?.handle ?? record.posterId.slice(0, 8);

  const latestEndorsement = getLatestPosterEndorsementUpdate(record);
  const endorsementCount = getPosterEndorsementCount(record);
  const adopterResponse = getLatestAdopterResponse(record);

  const [selectedRec, setSelectedRec] = useState<PosterRecommendation | null>(
    () => latestEndorsement?.endorsement ?? null,
  );
  const [recText, setRecText] = useState('');
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    setSelectedRec(latestEndorsement?.endorsement ?? null);
  }, [record.id, latestEndorsement?.endorsement]);

  const showRelistedBanner = isPastRelisted;

  const noteRequired = isPosterEndorsementNoteRequired(selectedRec, endorsementCount);
  const canSubmitRec = Boolean(selectedRec) && (!noteRequired || Boolean(recText.trim()));
  const showPosterRate = isPoster && isActive && onSubmitRecommendation;
  const showAdopterResponse = isAdopter && isActive
    && latestEndorsement?.endorsement === 'not_recommended'
    && onSubmitAdopterResponse
    && !adopterResponse;

  const endorsementNote = latestEndorsement?.text
    && !isDefaultPosterEndorsementNote(latestEndorsement.text)
    ? latestEndorsement.text
    : null;
  const endorsementPositive = latestEndorsement?.endorsement === 'recommended';
  const endorsementTint = endorsementPositive ? colors.success : colors.danger;

  const handleRateChoice = (rec: PosterRecommendation) => {
    if (rec === 'not_recommended') {
      setSelectedRec(rec);
      return;
    }
    if (!isPosterEndorsementNoteRequired(rec, endorsementCount) && onSubmitRecommendation) {
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

      {showRelistedBanner ? (
        <View style={[styles.statusBanner, { backgroundColor: colors.warningBg }]}>
          <Text style={[styles.statusBannerText, { color: colors.warning }]}>
            Relisted. This placement is closed.
          </Text>
        </View>
      ) : null}

      {successorPlacement && onOpenRecord ? (
        <TextLink
          label="View current placement"
          onPress={() => onOpenRecord(successorPlacement.id)}
        />
      ) : null}

      <AdoptionCheckInsSection
        record={record}
        isAdopter={isAdopter}
        onSubmitUpdate={onSubmitUpdate}
      />

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

      {/* Previous owner recommendation — visible to adopter and visitors, not the poster who rated */}
      {latestEndorsement && !isPoster ? (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Previous owner recommendation
          </Text>
          <View
            style={[
              styles.endorsementCard,
              { backgroundColor: endorsementTint + '10', borderColor: endorsementTint + '30' },
            ]}
          >
            {onUserPress ? (
              <Pressable
                onPress={() => onUserPress(record.posterId)}
                accessibilityRole="link"
                style={({ pressed }) => [pressed && { opacity: 0.7 }, Platform.OS === 'web' && styles.linkWeb]}
              >
                <Text style={[styles.endorsementAuthor, { color: colors.primary }]}>
                  @{posterHandle}
                </Text>
              </Pressable>
            ) : (
              <Text style={[styles.endorsementAuthor, { color: colors.textSecondary }]}>
                @{posterHandle}
              </Text>
            )}
            <View style={styles.endorsementVerdict}>
              <AdoptionUserFlag
                flag={endorsementPositive ? 'recommended' : 'not_recommended'}
                size={14}
              />
              <Text style={[styles.endorsementVerdictText, { color: endorsementTint }]}>
                {endorsementPositive ? 'Recommended this adopter' : 'Does not recommend this adopter'}
              </Text>
            </View>
            {endorsementNote ? (
              <Text style={[styles.endorsementNote, { color: colors.text }]}>
                {endorsementNote}
              </Text>
            ) : null}
            {latestEndorsement.createdAt ? (
              <Text style={[styles.endorsementDate, { color: colors.textTertiary }]}>
                {latestEndorsement.createdAt}
              </Text>
            ) : null}
          </View>
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
  statusBanner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  statusBannerText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  divider: { height: StyleSheet.hairlineWidth },
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
  sectionLabel: { fontSize: 15, fontWeight: '600' },
  endorsementCard: {
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  endorsementAuthor: { fontSize: 14, fontWeight: '600' },
  endorsementVerdict: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  endorsementVerdictText: { fontSize: 14, fontWeight: '600', flex: 1 },
  endorsementNote: { fontSize: 14, lineHeight: 20 },
  endorsementDate: { fontSize: 12, lineHeight: 16 },
});
