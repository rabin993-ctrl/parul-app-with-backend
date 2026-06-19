import React, { useMemo } from 'react';
import { ProfileAdoptedShowcase } from '../profile/ProfileAdoptionPanel';
import { useAdoption } from '../../context/AdoptionContext';
import { filterIncomingAdopted } from '../../data/adoptionRecords';

type Props = {
  userId: string;
  onOpenRecord: (recordId: string) => void;
  onOpenListing?: (listingId: string) => void;
};

export function AdoptedRecordsPanel({
  userId,
  onOpenRecord,
  onOpenListing,
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
      onOpenListing={onOpenListing}
    />
  );
}
