import React, { useMemo, useState } from 'react';
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
import {
  ProfileSubHeader,
  ProfileAdopterTrustStrip,
  StatusBadge,
  ProfileDivider,
} from '../../components/profile/ProfileChrome';
import {
  AdoptionUpdatePromptBanner,
  PostHomeUpdateSheet,
  PosterPlacementSheet,
  PosterEndorseSheet,
} from '../../components/adoption/AdoptionUpdateUI';
import { useAdoption } from '../../context/AdoptionContext';
import {
  getAdopterTrustSummary,
  getAdopterUpdateCount,
  getUserHandle,
  updateAttributionLabel,
} from '../../data/adoptionRecords';
import { getActivePrompt, formatDueLabel } from '../../utils/adoptionUpdateSchedule';
import { users } from '../../data/mockData';
import type { ProfileStackParamList } from '../../navigation/ProfileNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';

type Route = RouteProp<ProfileStackParamList, 'AdoptedDetail'>;

export function AdoptedDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<Route>();
  const tabBarPad = useTabBarScrollPadding();
  const {
    records,
    submitAdopterUpdate,
    submitPosterPlacement,
    submitPosterEndorsement,
    canAddPlacementNote,
    canEndorse,
    getPromptsForUser,
  } = useAdoption();
  const record = records.find(r => r.id === route.params.recordId);

  const [updateSheetOpen, setUpdateSheetOpen] = useState(false);
  const [placementSheetOpen, setPlacementSheetOpen] = useState(false);
  const [endorseSheetOpen, setEndorseSheetOpen] = useState(false);

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
  const dueLabel = formatDueLabel(record);
  const showPlacement = isPoster && canAddPlacementNote(record.id, 'you');
  const showEndorse = isPoster && canEndorse(record.id, 'you');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Adoption story" />

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
        </Text>

        <View style={styles.confirmRow}>
          <Avatar user={adopter ?? { name: 'Adopter', tint: record.tint }} size={28} showBadge={false} />
          <Icon name="check" size={14} color={colors.success} />
          <Avatar user={poster ?? { name: 'Foster', tint: colors.primary }} size={28} showBadge={false} />
          <Text style={[styles.confirmText, { color: colors.textSecondary }]}>
            Confirmed with @{getUserHandle(record.posterId)}
          </Text>
        </View>

        {isAdopter && <ProfileAdopterTrustStrip summary={trust} />}

        <View style={styles.chips}>
          <StatusBadge label="Mutual confirm" tint={colors.success} bg={colors.successBg} />
          <Text style={[styles.chipMeta, { color: colors.textSecondary }]}>📸 {updateCount} updates</Text>
          {dueLabel && (
            <Text style={[styles.chipMeta, { color: record.status === 'update_due' ? colors.warning : colors.textSecondary }]}>
              · {dueLabel}
            </Text>
          )}
        </View>

        {record.posterEndorsed && record.posterEndorsementRating && (
          <View style={styles.endorseRow}>
            <Stars value={record.posterEndorsementRating} size={14} />
            <Text style={[styles.endorseText, { color: colors.textSecondary }]}>
              Foster would adopt to them again
            </Text>
          </View>
        )}

        {isAdopter && userPrompt && (
          <AdoptionUpdatePromptBanner
            prompt={userPrompt}
            onPostUpdate={() => setUpdateSheetOpen(true)}
          />
        )}

        {(isAdopter || showPlacement || showEndorse) && (
          <View style={styles.actions}>
            {isAdopter && activePrompt && (
              <Button icon="camera" onPress={() => setUpdateSheetOpen(true)}>
                Post home update
              </Button>
            )}
            {showPlacement && (
              <Button variant="soft" onPress={() => setPlacementSheetOpen(true)}>
                Add placement note
              </Button>
            )}
            {showEndorse && (
              <Button variant="soft" icon="heart" onPress={() => setEndorseSheetOpen(true)}>
                Endorse adopter
              </Button>
            )}
          </View>
        )}

        <ProfileDivider />

        <Text style={[styles.section, { color: colors.textTertiary }]}>UPDATE TIMELINE</Text>

        {record.updates.length === 0 ? (
          <Text style={[styles.emptyTimeline, { color: colors.textTertiary }]}>
            Awaiting first home update
          </Text>
        ) : (
          record.updates.map((update, i) => (
            <View
              key={update.id}
              style={[
                styles.timelineItem,
                { borderBottomColor: colors.border },
                i === record.updates.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.timelineHead}>
                <View style={[
                  styles.timelineDot,
                  { backgroundColor: update.type === 'adopter_home' ? colors.primary : colors.textTertiary },
                ]} />
                <Text style={[styles.timelineAttr, { color: colors.textTertiary }]}>
                  {updateAttributionLabel(update.type)} · {update.createdAt}
                </Text>
              </View>
              <Text style={[styles.timelineBody, { color: colors.text }]}>{update.text}</Text>
            </View>
          ))
        )}
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

      <PosterPlacementSheet
        visible={placementSheetOpen}
        onClose={() => setPlacementSheetOpen(false)}
        record={record}
        onSubmit={text => submitPosterPlacement(record.id, text)}
      />

      <PosterEndorseSheet
        visible={endorseSheetOpen}
        onClose={() => setEndorseSheetOpen(false)}
        record={record}
        onSubmit={(rating, text) => submitPosterEndorsement(record.id, rating, text)}
      />
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
  chips: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  chipMeta: { ...typography.caption },
  endorseRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  endorseText: { ...typography.small },
  actions: { gap: 8 },
  section: { ...typography.sectionLabel, marginTop: 4 },
  emptyTimeline: { ...typography.small, fontStyle: 'italic' },
  timelineItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  timelineHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  timelineAttr: { ...typography.meta },
  timelineBody: { ...typography.bodySm, lineHeight: 21, paddingLeft: 16 },
});
