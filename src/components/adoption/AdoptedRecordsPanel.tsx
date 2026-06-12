import React, { useMemo } from 'react';
import { ProfileAdoptedShowcase } from '../profile/ProfileAdoptionPanel';
import { useAdoption } from '../../context/AdoptionContext';
import { filterIncomingAdopted } from '../../data/adoptionRecords';

type Props = {
  userId?: string;
  onOpenRecord: (recordId: string) => void;
};

/**
 * Shared adopter companions UI — profile "Adopted" tab and adoption hub "Adopted" tab.
 * Reads AdoptionRecord[] from AdoptionContext (same source backend will expose).
 */
export function AdoptedRecordsPanel({
  userId = 'you',
  onOpenRecord,
}: Props) {
  const { records } = useAdoption();

  const incoming = useMemo(
    () => filterIncomingAdopted(records, userId),
    [records, userId],
  );

  return (
    <ProfileAdoptedShowcase
      incoming={incoming}
      viewMode="owner"
      onOpenRecord={onOpenRecord}
    />
  );
}
