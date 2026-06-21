import {
  filterIncomingAdopted,
  getPosterRecommendation,
  type AdoptionRecord,
} from '../data/adoptionRecords';
import { adopterOwesProfileUpdate, isActiveAdoptionPlacement } from './profileAdoptionDisplay';

export type AdoptionTrustFlag = 'recommended' | 'not_recommended';

export type AdopterPublicStatus = {
  trustFlag: AdoptionTrustFlag | null;
  updateRequested: boolean;
};

export const EMPTY_ADOPTER_PUBLIC_STATUS: AdopterPublicStatus = {
  trustFlag: null,
  updateRequested: false,
};

export const ADOPTION_FLAG_A11Y: Record<AdoptionTrustFlag, string> = {
  recommended: 'Recommended adopter',
  not_recommended: 'Not recommended adopter',
};

export const ADOPTION_OVERDUE_A11Y = 'Update requested';

export function resolveAdopterPublicStatus(
  records: AdoptionRecord[],
  userId: string,
): AdopterPublicStatus {
  const incoming = filterIncomingAdopted(records, userId);
  if (incoming.length === 0) return EMPTY_ADOPTER_PUBLIC_STATUS;

  const activeIncoming = incoming.filter(isActiveAdoptionPlacement);
  const updateRequested = activeIncoming.some(adopterOwesProfileUpdate);

  let trustFlag: AdoptionTrustFlag | null = null;
  if (activeIncoming.some(r => getPosterRecommendation(r) === 'not_recommended')) {
    trustFlag = 'not_recommended';
  } else if (incoming.some(r => getPosterRecommendation(r) === 'recommended')) {
    trustFlag = 'recommended';
  }

  return { trustFlag, updateRequested };
}

export function isAdoptionTrustFlag(value: string | null | undefined): value is AdoptionTrustFlag {
  return value === 'recommended' || value === 'not_recommended';
}

export function hasAdopterPublicStatus(status: AdopterPublicStatus): boolean {
  return status.trustFlag != null || status.updateRequested;
}
