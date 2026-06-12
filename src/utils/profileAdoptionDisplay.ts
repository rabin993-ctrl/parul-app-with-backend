import {
  getAdopterHomeUpdates,
  type AdoptionRecord,
} from '../data/adoptionRecords';
import {
  getActivePrompt,
  getCompletedMilestones,
  getConfirmedAtMs,
  getMilestoneDueMs,
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
  statusLabel: string;
  statusTone: ChatSublineTone;
};

function speciesLabel(species: string) {
  if (species === 'cat') return 'Cat';
  if (species === 'dog') return 'Dog';
  return species;
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

/** Matches CareMilestoneMeter: overdue → Update requested, active due → Check-in due. */
function profileCheckInStatus(record: AdoptionRecord): {
  statusLabel: string;
  statusTone: ChatSublineTone;
} | null {
  if (adopterOwesProfileUpdate(record)) {
    return { statusLabel: 'Update requested', statusTone: 'warning' };
  }
  const prompt = getActivePrompt(record);
  if (prompt) {
    return { statusLabel: 'Check-in due', statusTone: 'primary' };
  }
  return null;
}

function profileAdoptionStatus(record: AdoptionRecord): {
  statusLabel: string;
  statusTone: ChatSublineTone;
} {
  const closed = closedStatus(record);
  if (closed) return closed;

  const checkIn = profileCheckInStatus(record);
  if (checkIn) return checkIn;

  return { statusLabel: 'Adopted', statusTone: 'success' };
}

function profileAdoptionSubline(
  record: AdoptionRecord,
  species: string,
  datePart: string,
  _perspective: 'rehomed' | 'adopted',
  viewMode: 'owner' | 'public',
): string {
  const activePrompt = getActivePrompt(record);

  if (viewMode === 'owner' && activePrompt) {
    return profileActivePromptSubline(activePrompt);
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
  const datePart = record.confirmedAt ? ` · ${record.confirmedAt}` : '';
  const { statusLabel, statusTone } = profileAdoptionStatus(record);

  return {
    petName: record.petName,
    subline: profileAdoptionSubline(record, species, datePart, 'rehomed', viewMode),
    statusLabel,
    statusTone,
  };
}

/** Adopter view — companions adopted. Labels match Adoption → Chats Adopting segment. */
export function getAdoptedProfileDisplay(
  record: AdoptionRecord,
  viewMode: 'owner' | 'public',
): ProfileAdoptionRowDisplay {
  const species = speciesLabel(record.species);
  const datePart = record.confirmedAt ? ` · ${record.confirmedAt}` : '';
  const { statusLabel, statusTone } = profileAdoptionStatus(record);

  return {
    petName: record.petName,
    subline: profileAdoptionSubline(record, species, datePart, 'adopted', viewMode),
    statusLabel,
    statusTone,
  };
}

export function profileAdoptionSortScore(display: ProfileAdoptionRowDisplay): number {
  if (display.statusTone === 'warning') return 0;
  if (display.statusTone === 'primary') return 1;
  return 2;
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
  if (isMilestoneMissed(record, milestoneId)) return 'missed';
  if (isMilestoneSatisfiedAtDue(record, milestoneId, dueMs)) return 'satisfied';
  if (isMilestoneExcusedByEndorsement(record, dueMs)) return 'satisfied';
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

export function countProfileAdoptedMissedUpdates(
  records: AdoptionRecord[],
  userId: string,
): number {
  return records
    .filter(r => r.adopterId === userId && r.status !== 'closed' && r.status !== 'pending_confirmation')
    .reduce((sum, r) => sum + countMissedMilestones(r), 0);
}

/** Adopter owes a home check-in — aligned with milestone meter and getActivePrompt. */
export function adopterOwesProfileUpdate(record: AdoptionRecord): boolean {
  if (record.status === 'closed' || record.status === 'pending_confirmation') return false;
  const prompt = getActivePrompt(record);
  if (prompt?.overdue) return true;
  return countMissedMilestones(record) > 0;
}

