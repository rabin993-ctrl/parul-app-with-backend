import {
  getAdopterHomeUpdates,
  type AdoptionRecord,
} from '../data/adoptionRecords';
import {
  getActivePrompt,
  getCompletedMilestones,
  getConfirmedAtMs,
  getMilestoneDueMs,
  getNextUpcomingMilestone,
  isMilestoneExcusedByEndorsement,
  parseRecordDate,
  UPDATE_MILESTONES,
  type UpdateMilestoneId,
} from './adoptionUpdateSchedule';

export { isMilestoneExcusedByEndorsement };
import type { ChatSublineTone } from './chatThreadMeta';

export type ProfileAdoptionRowDisplay = {
  petName: string;
  subline: string;
  statusLabel?: string;
  statusTone?: ChatSublineTone;
};

function speciesLabel(species: string) {
  if (species === 'cat') return 'Cat';
  if (species === 'dog') return 'Dog';
  return species;
}

function formatProfileDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function speciesDateSubline(species: string, datePart: string): string {
  return `${species}${datePart}`;
}

/** Same milestone + due copy as Adoption → Chats check-in bar. */
export function profileActivePromptSubline(
  prompt: NonNullable<ReturnType<typeof getActivePrompt>>,
): string {
  const milestone = prompt.milestone.label;
  if (prompt.overdue) {
    const overdueLabel = prompt.overdueDays === 1
      ? '1 day overdue'
      : `${prompt.overdueDays} days overdue`;
    return `${milestone} · ${overdueLabel}`;
  }
  const daysUntil = Math.ceil((prompt.dueMs - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysUntil <= 1) return `${milestone} · due soon`;
  return `${milestone} · due in ${daysUntil}d`;
}

function profileRehomedStatus(record: AdoptionRecord): {
  statusLabel?: string;
  statusTone?: ChatSublineTone;
} {
  const closed = closedStatus(record);
  if (closed) return closed;
  return {};
}

function profileAdoptedStatus(record: AdoptionRecord): {
  statusLabel?: string;
  statusTone?: ChatSublineTone;
} {
  const closed = closedStatus(record);
  if (closed) return closed;
  return {};
}

function profileAdoptionSubline(
  record: AdoptionRecord,
  species: string,
  datePart: string,
  _perspective: 'rehomed' | 'adopted',
  viewMode: 'owner' | 'public',
): string {
  if (record.status === 'closed') {
    const endedLabel = record.closedReason === 'relisted' ? 'Re-listed' : 'Closed';
    const when = formatProfileDate(record.closedAt ?? record.confirmedAt);
    return `${species} · ${endedLabel}${when ? ` · ${when}` : ''}`;
  }

  const activePrompt = getActivePrompt(record);
  const upcoming = getNextUpcomingMilestone(record);

  if (viewMode === 'owner' && activePrompt) {
    return profileActivePromptSubline(activePrompt);
  }

  if (viewMode === 'owner' && upcoming) {
    const milestone = upcoming.milestone.label;
    if (upcoming.daysUntil <= 1) return `${milestone} · due soon`;
    return `${milestone} · due in ${upcoming.daysUntil}d`;
  }

  return speciesDateSubline(species, datePart);
}

function closedStatus(record: AdoptionRecord): { statusLabel: string; statusTone: ChatSublineTone } | null {
  if (record.status !== 'closed') return null;
  return {
    statusLabel: record.closedReason === 'relisted' ? 'Re-listed' : 'Closed',
    statusTone: 'default',
  };
}

/** Poster view — pets rehomed. Labels match Adoption → Chats Rehoming segment. */
export function getRehomedProfileDisplay(
  record: AdoptionRecord,
  viewMode: 'owner' | 'public',
): ProfileAdoptionRowDisplay {
  const species = speciesLabel(record.species);
  const datePart = record.confirmedAt
    ? ` · ${formatProfileDate(record.confirmedAt) ?? record.confirmedAt}`
    : '';
  const { statusLabel, statusTone } = profileRehomedStatus(record);

  return {
    petName: record.petName,
    subline: profileAdoptionSubline(record, species, datePart, 'rehomed', viewMode),
    ...(statusLabel ? { statusLabel, statusTone } : {}),
  };
}

/** Adopter view — companions adopted. Labels match Adoption → Chats Adopting segment. */
export function getAdoptedProfileDisplay(
  record: AdoptionRecord,
  viewMode: 'owner' | 'public',
): ProfileAdoptionRowDisplay {
  const species = speciesLabel(record.species);
  const datePart = record.confirmedAt
    ? ` · ${formatProfileDate(record.confirmedAt) ?? record.confirmedAt}`
    : '';
  const { statusLabel, statusTone } = profileAdoptedStatus(record);

  return {
    petName: record.petName,
    subline: profileAdoptionSubline(record, species, datePart, 'adopted', viewMode),
    ...(statusLabel ? { statusLabel, statusTone } : {}),
  };
}

export function profileAdoptionSortScore(display: ProfileAdoptionRowDisplay): number {
  if (display.statusTone === 'default') return 1;
  if (display.statusLabel) return 0;
  return 2;
}

/** Placement still in progress — adopter may owe check-ins. */
export function isActiveAdoptionPlacement(record: AdoptionRecord): boolean {
  return record.status !== 'closed' && record.status !== 'pending_confirmation';
}

/** Ended when the poster re-listed the pet for a new home. */
export function isPastRelistedPlacement(record: AdoptionRecord): boolean {
  return record.status === 'closed' && record.closedReason === 'relisted';
}

export function partitionAdoptionPlacements(records: AdoptionRecord[]): {
  active: AdoptionRecord[];
  past: AdoptionRecord[];
} {
  const active: AdoptionRecord[] = [];
  const past: AdoptionRecord[] = [];
  for (const record of records) {
    if (isActiveAdoptionPlacement(record)) active.push(record);
    else past.push(record);
  }
  return { active, past };
}

/** Active placements first, then urgency; past sorted by most recent confirmation. */
export function sortAdoptionRecordsForProfile(
  records: AdoptionRecord[],
  viewMode: 'owner' | 'public',
  getDisplay: (record: AdoptionRecord, viewMode: 'owner' | 'public') => ProfileAdoptionRowDisplay,
): AdoptionRecord[] {
  return [...records].sort((a, b) => {
    const aActive = isActiveAdoptionPlacement(a);
    const bActive = isActiveAdoptionPlacement(b);
    if (aActive !== bActive) return aActive ? -1 : 1;

    if (aActive && bActive) {
      return profileAdoptionSortScore(getDisplay(a, viewMode))
        - profileAdoptionSortScore(getDisplay(b, viewMode));
    }

    const aMs = a.confirmedAtMs ?? 0;
    const bMs = b.confirmedAtMs ?? 0;
    return bMs - aMs;
  });
}

/** Newer active placement on the same listing after a re-list. */
export function findActivePlacementForListing(
  records: AdoptionRecord[],
  listingId: string,
  excludeRecordId: string,
): AdoptionRecord | null {
  return records.find(
    r => r.adoptionPostId === listingId
      && r.id !== excludeRecordId
      && isActiveAdoptionPlacement(r),
  ) ?? null;
}

function isMilestoneSatisfiedAtDue(record: AdoptionRecord, milestoneId: UpdateMilestoneId, dueMs: number): boolean {
  const completed = new Set(getCompletedMilestones(record));
  const adopterUpdates = getAdopterHomeUpdates(record);
  return completed.has(milestoneId)
    || adopterUpdates.some(
      u => u.milestoneId === milestoneId || (u.createdAtMs ?? 0) >= dueMs,
    );
}

export type MilestoneMeterState = 'satisfied' | 'missed' | 'due' | 'upcoming';

export function isMilestoneSatisfied(record: AdoptionRecord, milestoneId: UpdateMilestoneId): boolean {
  const dueMs = getMilestoneDueMs(record, milestoneId);
  return isMilestoneSatisfiedAtDue(record, milestoneId, dueMs);
}

export function getMilestoneMeterState(
  record: AdoptionRecord,
  milestoneId: UpdateMilestoneId,
): MilestoneMeterState {
  const dueMs = getMilestoneDueMs(record, milestoneId);
  if (isMilestoneSatisfiedAtDue(record, milestoneId, dueMs)) return 'satisfied';
  if (isMilestoneExcusedByEndorsement(record, dueMs)) return 'satisfied';
  if (record.status === 'closed' || record.status === 'pending_confirmation') {
    return 'upcoming';
  }
  if (isMilestoneMissed(record, milestoneId)) return 'missed';
  const active = getActivePrompt(record);
  if (active?.milestone.id === milestoneId) return 'due';
  return 'upcoming';
}

export function getMilestoneHomeUpdate(
  record: AdoptionRecord,
  milestoneId: UpdateMilestoneId,
) {
  const dueMs = getMilestoneDueMs(record, milestoneId);
  const updates = getAdopterHomeUpdates(record);
  return updates.find(u => u.milestoneId === milestoneId)
    ?? updates.find(u => (u.createdAtMs ?? parseRecordDate(u.createdAt)) >= dueMs);
}

/** Milestone is overdue, no adopter check-in, and not excused by post-due owner feedback. */
export function isMilestoneMissed(record: AdoptionRecord, milestoneId: UpdateMilestoneId): boolean {
  if (record.status === 'closed' || record.status === 'pending_confirmation') return false;
  if (!getConfirmedAtMs(record)) return false;

  const dueMs = getMilestoneDueMs(record, milestoneId);
  if (Date.now() < dueMs) return false;
  if (isMilestoneSatisfiedAtDue(record, milestoneId, dueMs)) return false;
  if (isMilestoneExcusedByEndorsement(record, dueMs)) return false;
  return true;
}

/** Count milestones past due without check-in (minus post-due owner feedback excuses). */
export function countMissedMilestones(record: AdoptionRecord): number {
  return UPDATE_MILESTONES.filter(m => isMilestoneMissed(record, m.id)).length;
}

/** Active placement where adopter owes an overdue or currently due home check-in. */
export function adopterNeedsCheckIn(record: AdoptionRecord): boolean {
  if (record.status === 'closed' || record.status === 'pending_confirmation') return false;
  if (countMissedMilestones(record) > 0) return true;
  return getActivePrompt(record) != null;
}

/**
 * Profile/tab alert count — missed milestones weigh individually;
 * an upcoming due check-in counts as 1 per pet.
 */
export function countProfileAdoptedMissedUpdates(
  records: AdoptionRecord[],
  userId: string,
): number {
  return records
    .filter(r => r.adopterId === userId && adopterNeedsCheckIn(r))
    .reduce((sum, r) => {
      const missed = countMissedMilestones(r);
      return sum + (missed > 0 ? missed : 1);
    }, 0);
}

/** Adopter owes a home check-in — aligned with milestone meter and getActivePrompt. */
export function adopterOwesProfileUpdate(record: AdoptionRecord): boolean {
  if (record.status === 'closed' || record.status === 'pending_confirmation') return false;
  const prompt = getActivePrompt(record);
  if (prompt?.overdue) return true;
  return countMissedMilestones(record) > 0;
}

