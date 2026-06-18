import type { AdoptionRecord } from '../data/adoptionRecords';

export function performPosterRelist(
  record: AdoptionRecord,
  relistAdoptionPlacement: (recordId: string) => {
    listingId: string;
    adopterId: string;
    threadId?: string;
  } | null,
  relistListing: (listingId: string) => void,
  clearRequestOnRelist: (listingId: string, requesterId: string) => void,
  dismissThread?: (threadId: string) => void,
  threadId?: string,
): boolean {
  const result = relistAdoptionPlacement(record.id);
  if (!result) return false;
  relistListing(result.listingId);
  clearRequestOnRelist(result.listingId, result.adopterId);
  const resolvedThreadId = threadId ?? result.threadId;
  if (resolvedThreadId) dismissThread?.(resolvedThreadId);
  return true;
}
