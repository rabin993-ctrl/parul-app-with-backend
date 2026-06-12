import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import { Avatar } from '../../components/ui/Avatar';
import { Icon } from '../../components/icons/Icon';
import { Button } from '../../components/ui/Button';
import { Toast, ToastData } from '../../components/ui/Toast';
import {
  ProfileSubHeader,
  ProfileAdopterTrustStrip,
  ProfileDivider,
} from '../../components/profile/ProfileChrome';
import {
  AdoptionUpdatePromptBanner,
  PostHomeUpdateSheet,
  PreviousOwnerActionsCard,
  PreviousOwnerNotesList,
  PreviousOwnerRecommendationsList,
} from '../../components/adoption/AdoptionUpdateUI';
import { useAdoption } from '../../context/AdoptionContext';
import {
  getAdopterTrustSummary,
  getAdopterUpdateCount,
  getPosterEndorsementCount,
  getPosterEndorsementUpdates,
  getPreviousOwnerNotes,
  getUserHandle,
} from '../../data/adoptionRecords';
import { AdoptedCareTimeline } from '../../components/adoption/AdoptedCareTimeline';
import { getActivePrompt, formatDueLabel } from '../../utils/adoptionUpdateSchedule';
import { users } from '../../data/mockData';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type AdoptedDetailParams = {
  recordId: string;
  openOwnerPost?: boolean;
};

export function AdoptedDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute();
  const { recordId } = route.params as AdoptedDetailParams;
  const tabBarPad = useTabBarScrollPadding();
  const {
    records,
    submitAdopterUpdate,
    submitPosterEndorsement,
    canEndorse,
    getPromptsForUser,
  } = useAdoption();
  const record = records.find(r => r.id === recordId);

  const [updateSheetOpen, setUpdateSheetOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const activePrompt = useMemo(
    () => (record ? getActivePrompt(record) : null),
    [record],
  );

  const userPrompt = useMemo(() => {
    if (!record) return null;
    return getPromptsForUser('you').find(p => p.recordId === record.id) ?? null;
  }, [record, getPromptsForUser]);

  if (!record) return null;

  const poster = users[record.posterId as keyof typeof users];
  const adopter = users[record.adopterId as keyof typeof users];
  const trust = getAdopterTrustSummary(records, record.adopterId);
  const updateCount = getAdopterUpdateCount(record);
  const speciesLabel = record.species === 'cat' ? 'Cat' : record.species === 'dog' ? 'Dog' : record.species;
  const isAdopter = record.adopterId === 'you';
  const isPoster = record.posterId === 'you';
  const isVisitor = !isAdopter && !isPoster;
  const dueLabel = formatDueLabel(record);
  const canRate = isPoster && canEndorse(record.id, 'you');
  const endorsementCount = getPosterEndorsementCount(record);
  const ownerEndorsements = getPosterEndorsementUpdates(record);
  const ownerNotes = getPreviousOwnerNotes(record);

  const handleSubmitRecommendation = (recommendation: 'recommended' | 'not_recommended', text?: string) => {
    submitPosterEndorsement(record.id, recommendation, text);
    setToast({
      msg: recommendation === 'recommended'
        ? `Recommended @${getUserHandle(record.adopterId)}`
        : `Not recommended @${getUserHandle(record.adopterId)}`,
      icon: recommendation === 'recommended' ? 'heart' : 'alert',
      tone: recommendation === 'recommended' ? 'success' : 'danger',
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader
        title={
          isPoster
            ? 'Adoption you posted'
            : isVisitor
              ? `${adopter?.name ?? 'Adopter'}'s adoption`
              : 'Adoption story'
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarPad }]}
        showsVerticalScrollIndicator={false}
      >
        <PhotoSlot height={200} imageKey={record.id} borderRadius={radius.md} label="" />

        <Text style={[styles.petName, { color: colors.text }]}>
          {record.petName} · {speciesLabel}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          Adopted {record.confirmedAt}
          {isPoster ? ` · with @${getUserHandle(record.adopterId)}` : ''}
        </Text>

        <View style={styles.confirmRow}>
          <Avatar user={adopter ?? { name: 'Adopter', tint: record.tint }} size={28} />
          <Icon name="check" size={14} color={colors.success} />
          <Avatar user={poster ?? { name: 'Previous owner', tint: colors.primary }} size={28} />
          <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
            {isPoster
              ? `You posted · @${getUserHandle(record.adopterId)} adopted`
              : isVisitor
                ? `@${getUserHandle(record.adopterId)} adopted from @${getUserHandle(record.posterId)}`
                : `Confirmed with @${getUserHandle(record.posterId)}`}
          </Text>
        </View>

        {isPoster ? (
          <PreviousOwnerActionsCard
            record={record}
            adopterCheckIns={updateCount}
            endorsementCount={endorsementCount}
            canRate={canRate}
            onSubmitRecommendation={handleSubmitRecommendation}
          />
        ) : (
          <>
            <ProfileAdopterTrustStrip summary={trust} />
            <Text style={[styles.summaryMeta, { color: colors.textSecondary }]}>
              {updateCount === 1 ? '1 check-in posted' : `${updateCount} check-ins posted`}
              {!isVisitor && dueLabel ? (
                <Text style={{ color: record.status === 'update_due' ? colors.warning : colors.textTertiary }}>
                  {` · ${dueLabel}`}
                </Text>
              ) : null}
            </Text>
          </>
        )}

        {ownerEndorsements.length > 0 ? (
          <PreviousOwnerRecommendationsList
            endorsements={ownerEndorsements}
            isAdopter={isAdopter}
            adopterHandle={getUserHandle(record.adopterId)}
          />
        ) : null}

        {(isAdopter || isVisitor) && ownerNotes.length > 0 ? (
          <PreviousOwnerNotesList notes={ownerNotes} colors={colors} />
        ) : null}

        {isAdopter && userPrompt && (
          <AdoptionUpdatePromptBanner
            prompt={userPrompt}
            onPostUpdate={() => setUpdateSheetOpen(true)}
          />
        )}

        {isAdopter && activePrompt && (
          <Button icon="camera" onPress={() => setUpdateSheetOpen(true)}>
            Post home update
          </Button>
        )}

        <ProfileDivider />

        <AdoptedCareTimeline record={record} />
      </ScrollView>

      {activePrompt && (
        <PostHomeUpdateSheet
          visible={updateSheetOpen}
          onClose={() => setUpdateSheetOpen(false)}
          record={record}
          milestoneLabel={activePrompt.milestone.label}
          promptText={activePrompt.milestone.prompt}
          onSubmit={payload => submitAdopterUpdate(record.id, payload)}
        />
      )}

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 12, paddingTop: 4 },
  petName: { ...typography.heroName, fontSize: 18 },
  meta: { ...typography.small },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmText: { ...typography.small, flex: 1 },
  summaryMeta: { ...typography.small, fontSize: 12 },
});
