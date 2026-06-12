import React, { useMemo, useState } from 'react';
import { Empty } from '../ui/Empty';
import { ProfileAdoptedGrid } from '../profile/ProfileChrome';
import { PostHomeUpdateSheet } from './AdoptionUpdateUI';
import { useAdoption } from '../../context/AdoptionContext';
import {
  filterIncomingAdopted,
  getAdopterTrustSummary,
  type AdoptionRecord,
} from '../../data/adoptionRecords';
import { getActivePrompt } from '../../utils/adoptionUpdateSchedule';

type Props = {
  userId?: string;
  onOpenRecord: (recordId: string) => void;
  onUpdateSubmitted?: (record: AdoptionRecord) => void;
  contentWidth?: number;
};

/**
 * Shared adopter companions UI — profile "Adopted" tab and adoption hub "Adopted" tab.
 * Reads AdoptionRecord[] from AdoptionContext (same source backend will expose).
 */
export function AdoptedRecordsPanel({
  userId = 'you',
  onOpenRecord,
  onUpdateSubmitted,
  contentWidth,
}: Props) {
  const { records, getPromptsForUser, submitAdopterUpdate } = useAdoption();
  const [updateSheetRecordId, setUpdateSheetRecordId] = useState<string | null>(null);

  const items = useMemo(
    () => filterIncomingAdopted(records, userId),
    [records, userId],
  );
  const adopterTrust = useMemo(() => getAdopterTrustSummary(records, userId), [records, userId]);
  const updatePrompts = useMemo(() => getPromptsForUser(userId), [getPromptsForUser, userId]);

  if (items.length === 0) {
    return (
      <Empty
        icon="heart"
        title="No adopted companions"
        body="Confirmed adoptions you take in will appear here."
      />
    );
  }

  return (
    <>
      <ProfileAdoptedGrid
        records={items}
        adopterTrust={adopterTrust}
        updatePrompts={updatePrompts}
        onPostUpdate={setUpdateSheetRecordId}
        onOpen={onOpenRecord}
        contentWidth={contentWidth}
      />

      {updateSheetRecordId && (() => {
        const record = records.find(r => r.id === updateSheetRecordId);
        const active = record ? getActivePrompt(record) : null;
        if (!record || !active) return null;
        return (
          <PostHomeUpdateSheet
            visible
            onClose={() => setUpdateSheetRecordId(null)}
            record={record}
            milestoneLabel={active.milestone.label}
            promptText={active.milestone.prompt}
            onSubmit={payload => {
              submitAdopterUpdate(record.id, payload);
              setUpdateSheetRecordId(null);
              onUpdateSubmitted?.(record);
            }}
          />
        );
      })()}
    </>
  );
}
