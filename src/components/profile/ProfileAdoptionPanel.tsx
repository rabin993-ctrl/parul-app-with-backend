import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { Empty } from '../ui/Empty';
import { ProfileAdoptionShowcaseRow } from './ProfileAdoptionShowcaseRow';
import {
  getRehomedProfileDisplay,
  getAdoptedProfileDisplay,
  partitionAdoptionPlacements,
  sortAdoptionRecordsForProfile,
} from '../../utils/profileAdoptionDisplay';
import type { AdoptionRecord } from '../../data/adoptionRecords';

function ProfileAdoptionSection({
  title,
  records,
  viewMode,
  getDisplay,
  counterpartyLabel,
  getCounterpartyId,
  onOpenRecord,
  onOpenListing,
  muted = false,
}: {
  title?: string;
  records: AdoptionRecord[];
  viewMode: 'owner' | 'public';
  getDisplay: (record: AdoptionRecord, viewMode: 'owner' | 'public') => ReturnType<typeof getRehomedProfileDisplay>;
  counterpartyLabel: string;
  getCounterpartyId: (record: AdoptionRecord) => string;
  onOpenRecord: (recordId: string) => void;
  onOpenListing?: (listingId: string) => void;
  muted?: boolean;
}) {
  const { colors } = useTheme();

  if (records.length === 0) return null;

  return (
    <View style={styles.section}>
      {title ? (
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
          {title}
        </Text>
      ) : null}
      {records.map(record => {
        const display = getDisplay(record, viewMode);
        return (
          <ProfileAdoptionShowcaseRow
            key={record.id}
            record={record}
            display={display}
            counterpartyUserId={getCounterpartyId(record)}
            counterpartyLabel={counterpartyLabel}
            muted={muted}
            onOpenListing={onOpenListing}
            onPress={() => onOpenRecord(record.id)}
          />
        );
      })}
    </View>
  );
}

export type ProfileRehomedShowcaseProps = {
  records: AdoptionRecord[];
  viewMode: 'owner' | 'public';
  onOpenRecord: (recordId: string) => void;
  onOpenListing?: (listingId: string) => void;
};

/** Rehomed tab — active placements first, then past (re-listed) history. */
export function ProfileRehomedShowcase({
  records,
  viewMode,
  onOpenRecord,
  onOpenListing,
}: ProfileRehomedShowcaseProps) {
  const { active, past } = useMemo(() => partitionAdoptionPlacements(records), [records]);

  const sortedActive = useMemo(
    () => sortAdoptionRecordsForProfile(active, viewMode, getRehomedProfileDisplay),
    [active, viewMode],
  );
  const sortedPast = useMemo(
    () => sortAdoptionRecordsForProfile(past, viewMode, getRehomedProfileDisplay),
    [past, viewMode],
  );

  if (records.length === 0) {
    return (
      <Empty
        icon="adoption"
        title="No rehomed pets yet"
        body={
          viewMode === 'owner'
            ? 'Pets you place in new homes will appear here after confirmation.'
            : undefined
        }
      />
    );
  }

  const showSectionTitles = sortedActive.length > 0 && sortedPast.length > 0;

  return (
    <View style={styles.showcase}>
      <ProfileAdoptionSection
        title={showSectionTitles ? 'Active placements' : undefined}
        records={sortedActive}
        viewMode={viewMode}
        getDisplay={getRehomedProfileDisplay}
        counterpartyLabel="Adopted by"
        getCounterpartyId={record => record.adopterId}
        onOpenRecord={onOpenRecord}
        onOpenListing={onOpenListing}
      />
      <ProfileAdoptionSection
        title={showSectionTitles ? 'Past placements' : undefined}
        records={sortedPast}
        viewMode={viewMode}
        getDisplay={getRehomedProfileDisplay}
        counterpartyLabel="Adopted by"
        getCounterpartyId={record => record.adopterId}
        onOpenRecord={onOpenRecord}
        onOpenListing={onOpenListing}
        muted
      />
    </View>
  );
}

export type ProfileAdoptedShowcaseProps = {
  incoming: AdoptionRecord[];
  viewMode: 'owner' | 'public';
  onOpenRecord: (recordId: string) => void;
  onOpenListing?: (listingId: string) => void;
};

/** Adopted tab — current adoptions first, then past (re-listed) history. */
export function ProfileAdoptedShowcase({
  incoming,
  viewMode,
  onOpenRecord,
  onOpenListing,
}: ProfileAdoptedShowcaseProps) {
  const { active, past } = useMemo(() => partitionAdoptionPlacements(incoming), [incoming]);

  const sortedActive = useMemo(
    () => sortAdoptionRecordsForProfile(active, viewMode, getAdoptedProfileDisplay),
    [active, viewMode],
  );
  const sortedPast = useMemo(
    () => sortAdoptionRecordsForProfile(past, viewMode, getAdoptedProfileDisplay),
    [past, viewMode],
  );

  if (incoming.length === 0) {
    return (
      <Empty
        icon="heart"
        title="No adopted companions"
        body={
          viewMode === 'owner'
            ? 'Confirmed adoptions you take in will appear here.'
            : 'Confirmed adoptions they take in will appear here.'
        }
      />
    );
  }

  const showSectionTitles = sortedActive.length > 0 && sortedPast.length > 0;

  return (
    <View style={styles.showcase}>
      <ProfileAdoptionSection
        title={showSectionTitles ? 'Current adoptions' : undefined}
        records={sortedActive}
        viewMode={viewMode}
        getDisplay={getAdoptedProfileDisplay}
        counterpartyLabel="From"
        getCounterpartyId={record => record.posterId}
        onOpenRecord={onOpenRecord}
        onOpenListing={onOpenListing}
      />
      <ProfileAdoptionSection
        title={showSectionTitles ? 'Past adoptions' : undefined}
        records={sortedPast}
        viewMode={viewMode}
        getDisplay={getAdoptedProfileDisplay}
        counterpartyLabel="From"
        getCounterpartyId={record => record.posterId}
        onOpenRecord={onOpenRecord}
        onOpenListing={onOpenListing}
        muted
      />
    </View>
  );
}

const styles = StyleSheet.create({
  showcase: { gap: 0 },
  section: { gap: 0 },
  sectionTitle: {
    ...typography.sectionLabel,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.25,
    textTransform: 'uppercase',
    paddingTop: 4,
    paddingBottom: 6,
  },
});
