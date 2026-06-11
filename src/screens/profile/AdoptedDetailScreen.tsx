import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { PhotoSlot } from '../../components/ui/PhotoSlot';
import { Avatar } from '../../components/ui/Avatar';
import { Stars } from '../../components/ui/Stars';
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
  PreviousOwnerPostSheet,
  PreviousOwnerActionsCard,
  PreviousOwnerNotesList,
} from '../../components/adoption/AdoptionUpdateUI';
import { useAdoption } from '../../context/AdoptionContext';
import {
  getAdopterTrustSummary,
  getAdopterUpdateCount,
  getPosterEndorsementUpdate,
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
  const { recordId, openOwnerPost: openOwnerPostOnMount } = route.params as AdoptedDetailParams;
  const tabBarPad = useTabBarScrollPadding();
  const {
    records,
    submitAdopterUpdate,
    submitPosterPlacement,
    submitPosterEndorsement,
    canPostOwnerNote,
    canEndorse,
    getPromptsForUser,
  } = useAdoption();
  const record = records.find(r => r.id === recordId);

  const [updateSheetOpen, setUpdateSheetOpen] = useState(false);
  const [ownerPostOpen, setOwnerPostOpen] = useState(false);
  const [ownerPostMode, setOwnerPostMode] = useState<'note' | 'recommend'>('note');
  const [toast, setToast] = useState<ToastData | null>(null);

  const activePrompt = useMemo(
    () => (record ? getActivePrompt(record) : null),
    [record],
  );

  const userPrompt = useMemo(() => {
    if (!record) return null;
    return getPromptsForUser('you').find(p => p.recordId === record.id) ?? null;
  }, [record, getPromptsForUser]);

  useEffect(() => {
    if (openOwnerPostOnMount && record?.posterId === 'you') {
      setOwnerPostOpen(true);
    }
  }, [openOwnerPostOnMount, record?.posterId]);

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
  const canPostNote = isPoster && canPostOwnerNote(record.id, 'you');
  const canRecommend = isPoster && canEndorse(record.id, 'you');
  const ownerEndorsement = getPosterEndorsementUpdate(record);
  const ownerNotes = getPreviousOwnerNotes(record);

  const handleOpenOwnerPost = (mode: 'note' | 'recommend' = 'note') => {
    setOwnerPostMode(mode);
    setOwnerPostOpen(true);
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
        <PhotoSlot height={200} tint={record.tint} borderRadius={radius.md} label={record.petName} icon={record.icon} />

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
            canPostNote={canPostNote}
            canRecommend={canRecommend}
            onPost={handleOpenOwnerPost}
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

        {record.posterEndorsed && record.posterEndorsementRating ? (
          <View style={[styles.ownerNoteCard, { backgroundColor: colors.successBg, borderColor: colors.success + '35' }]}>
            <View style={styles.ownerNoteHead}>
              <View style={[styles.ownerNoteIcon, { backgroundColor: colors.success + '22' }]}>
                <Icon name="heart" size={14} color={colors.success} />
              </View>
              <View style={styles.ownerNoteCopy}>
                <Text style={[styles.ownerNoteTitle, { color: colors.success }]}>
                  {isAdopter
                    ? 'Previous owner recommends you'
                    : `Previous owner recommends @${getUserHandle(record.adopterId)}`}
                </Text>
                <Stars value={record.posterEndorsementRating} size={13} />
              </View>
            </View>
            {ownerEndorsement?.text ? (
              <Text style={[styles.ownerNoteText, { color: colors.text }]}>{ownerEndorsement.text}</Text>
            ) : null}
            {ownerEndorsement?.createdAt ? (
              <Text style={[styles.ownerNoteDate, { color: colors.textTertiary }]}>{ownerEndorsement.createdAt}</Text>
            ) : null}
          </View>
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

      <PreviousOwnerPostSheet
        visible={ownerPostOpen}
        onClose={() => setOwnerPostOpen(false)}
        record={record}
        canRecommend={canRecommend}
        initialMode={ownerPostMode}
        onSubmitNote={text => {
          submitPosterPlacement(record.id, text);
          setToast({ msg: `Note posted for ${record.petName}`, icon: 'check', tone: 'success' });
        }}
        onSubmitRecommend={(rating, text) => {
          submitPosterEndorsement(record.id, rating, text);
          setToast({ msg: `Recommendation posted for @${getUserHandle(record.adopterId)}`, icon: 'heart', tone: 'success' });
        }}
      />

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
  ownerNoteCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  ownerNoteHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ownerNoteIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerNoteCopy: { flex: 1, gap: 4 },
  ownerNoteTitle: { ...typography.label, fontSize: 13 },
  ownerNoteText: { ...typography.bodySm, lineHeight: 21 },
  ownerNoteDate: { ...typography.meta, fontSize: 11 },
});
