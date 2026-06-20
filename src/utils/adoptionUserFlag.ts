import {
  filterIncomingAdopted,
  getPosterRecommendation,
  type AdoptionRecord,
} from '../data/adoptionRecords';
import { adopterOwesProfileUpdate, isActiveAdoptionPlacement } from './profileAdoptionDisplay';

export type AdoptionUserFlag = 'update_requested' | 'not_recommended' | 'recommended';

export const ADOPTION_FLAG_A11Y: Record<AdoptionUserFlag, string> = {
  update_requested: 'Update requested',
  recommended: 'Recommended adopter',
  not_recommended: 'Not recommended adopter',
};

export function resolveAdopterFlagFromRecords(
  records: AdoptionRecord[],
  userId: string,
): AdoptionUserFlag | null {
  const incoming = filterIncomingAdopted(records, userId);
  if (incoming.length === 0) return null;

  const activeIncoming = incoming.filter(isActiveAdoptionPlacement);

  if (activeIncoming.some(adopterOwesProfileUpdate)) {
    return 'update_requested';
  }
  if (activeIncoming.some(r => getPosterRecommendation(r) === 'not_recommended')) {
    return 'not_recommended';
  }
  if (incoming.some(r => getPosterRecommendation(r) === 'recommended')) {
    return 'recommended';
  }
  return null;
}

export function isAdoptionUserFlag(value: string | null | undefined): value is AdoptionUserFlag {
  return value === 'update_requested'
    || value === 'not_recommended'
    || value === 'recommended';
}
