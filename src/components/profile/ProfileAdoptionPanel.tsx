import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Empty } from '../ui/Empty';
import { ProfileAdoptionShowcaseRow } from './ProfileAdoptionShowcaseRow';
import {
  getRehomedProfileDisplay,
  getAdoptedProfileDisplay,
  profileAdoptionSortScore,
} from '../../utils/profileAdoptionDisplay';
import type { AdoptionRecord } from '../../data/adoptionRecords';

export type ProfileRehomedShowcaseProps = {
  records: AdoptionRecord[];
  viewMode: 'owner' | 'public';
  onOpenRecord: (recordId: string) => void;
};

/** Rehomed tab — every pet you placed in a new home. */
export function ProfileRehomedShowcase({
  records,
  viewMode,
  onOpenRecord,
}: ProfileRehomedShowcaseProps) {
  const sorted = useMemo(
    () => [...records].sort((a, b) => {
      const da = getRehomedProfileDisplay(a, viewMode);
      const db = getRehomedProfileDisplay(b, viewMode);
      return profileAdoptionSortScore(da) - profileAdoptionSortScore(db);
    }),
    [records, viewMode],
  );

  if (sorted.length === 0) {
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

  return (
    <View>
      {sorted.map(record => {
        const display = getRehomedProfileDisplay(record, viewMode);
        return (
          <ProfileAdoptionShowcaseRow
            key={record.id}
            record={record}
            display={display}
            onPress={() => onOpenRecord(record.id)}
          />
        );
      })}
    </View>
  );
}

export type ProfileAdoptedShowcaseProps = {
  incoming: AdoptionRecord[];
  viewMode: 'owner' | 'public';
  onOpenRecord: (recordId: string) => void;
};

/** Adopted tab — companions you took in only. */
export function ProfileAdoptedShowcase({
  incoming,
  viewMode,
  onOpenRecord,
}: ProfileAdoptedShowcaseProps) {
  const sorted = useMemo(
    () => [...incoming].sort((a, b) => {
      const da = getAdoptedProfileDisplay(a, viewMode);
      const db = getAdoptedProfileDisplay(b, viewMode);
      return profileAdoptionSortScore(da) - profileAdoptionSortScore(db);
    }),
    [incoming, viewMode],
  );

  if (sorted.length === 0) {
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

  return (
    <View>
      {sorted.map(record => {
        const display = getAdoptedProfileDisplay(record, viewMode);
        return (
          <ProfileAdoptionShowcaseRow
            key={record.id}
            record={record}
            display={display}
            onPress={() => onOpenRecord(record.id)}
          />
        );
      })}
    </View>
  );
}
