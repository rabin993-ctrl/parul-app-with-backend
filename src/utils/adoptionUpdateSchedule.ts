import {
  getPosterEndorsementUpdates,
  type AdoptionRecord,
  type AdoptionRecordStatus,
  type AdoptionUpdate,
} from '../data/adoptionRecords';

export const UPDATE_MILESTONES = [
  { id: 'week_1' as const, days: 7, label: '1-week check-in', prompt: 'Share how their first week at home went' },
  { id: 'month_1' as const, days: 30, label: '1-month update', prompt: 'Post a 1-month home update with a photo' },
  { id: 'month_3' as const, days: 90, label: '3-month update', prompt: 'Share a 3-month progress update' },
  { id: 'month_6' as const, days: 180, label: '6-month update', prompt: 'Share how they\'re settling in long-term' },
];

export type UpdateMilestoneId = (typeof UPDATE_MILESTONES)[number]['id'];

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_60_DAYS = 60 * MS_DAY;
const MS_14_DAYS = 14 * MS_DAY;

export function parseRecordDate(dateStr?: string): number {
  if (!dateStr) return 0;
  const iso = Date.parse(dateStr);
  if (!Number.isNaN(iso)) return iso;
  const parsed = Date.parse(dateStr.replace(/(\w+) (\d+), (\d+)/, '$1 $2, $3'));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function getConfirmedAtMs(record: AdoptionRecord): number {
  if (record.confirmedAtMs) return record.confirmedAtMs;
  return parseRecordDate(record.confirmedAt);
}

export function getLastAdopterUpdate(record: AdoptionRecord): AdoptionUpdate | null {
  const adopterUpdates = record.updates.filter(u => u.type === 'adopter_home');
  return adopterUpdates.length > 0 ? adopterUpdates[adopterUpdates.length - 1]! : null;
}

export function getLastAdopterUpdateMs(record: AdoptionRecord): number {
  const last = getLastAdopterUpdate(record);
  if (!last) return 0;
  if (last.createdAtMs) return last.createdAtMs;
  return parseRecordDate(last.createdAt);
}

export function getCompletedMilestones(record: AdoptionRecord): UpdateMilestoneId[] {
  return record.completedMilestones ?? [];
}

export function getNextMilestone(record: AdoptionRecord) {
  const completed = new Set(getCompletedMilestones(record));
  return UPDATE_MILESTONES.find(m => !completed.has(m.id)) ?? null;
}

export function getMilestoneDueMs(record: AdoptionRecord, milestoneId: UpdateMilestoneId): number {
  const confirmed = getConfirmedAtMs(record);
  const m = UPDATE_MILESTONES.find(x => x.id === milestoneId);
  if (!confirmed || !m) return 0;
  return confirmed + m.days * MS_DAY;
}

/** Poster feedback after a milestone due date excuses that missed check-in (recommended only). */
export function isMilestoneExcusedByEndorsement(record: AdoptionRecord, dueMs: number): boolean {
  return getPosterEndorsementUpdates(record).some(e => {
    if (e.endorsement !== 'recommended') return false;
    const endorsedMs = e.createdAtMs ?? parseRecordDate(e.createdAt);
    return endorsedMs >= dueMs;
  });
}

function isMilestoneOpen(record: AdoptionRecord, milestoneId: UpdateMilestoneId, now = Date.now()): boolean {
  const dueMs = getMilestoneDueMs(record, milestoneId);
  if (!dueMs) return false;
  if (record.nextUpdateDueAt) {
    const nextDue = parseRecordDate(record.nextUpdateDueAt);
    if (nextDue > 0 && now < nextDue) return false;
  }
  return now >= dueMs;
}

/** Next incomplete milestone that is not yet open for posting (display-only). */
export function getNextUpcomingMilestone(record: AdoptionRecord) {
  if (record.status === 'closed' || record.status === 'pending_confirmation') {
    return null;
  }
  if (!record.confirmedAt && !record.confirmedAtMs) {
    return null;
  }

  const completed = new Set(getCompletedMilestones(record));
  const lastAdopterMs = getLastAdopterUpdateMs(record);
  const now = Date.now();

  for (const milestone of UPDATE_MILESTONES) {
    if (completed.has(milestone.id)) continue;

    const dueMs = getMilestoneDueMs(record, milestone.id);

    if (lastAdopterMs >= dueMs) continue;
    if (isMilestoneExcusedByEndorsement(record, dueMs)) continue;
    if (now >= dueMs) continue;

    const daysUntil = Math.ceil((dueMs - now) / MS_DAY);
    return { milestone, dueMs, daysUntil };
  }

  return null;
}

export function getActivePrompt(record: AdoptionRecord) {
  if (record.status === 'closed' || record.status === 'pending_confirmation') {
    return null;
  }
  if (!record.confirmedAt && !record.confirmedAtMs) {
    return null;
  }

  const completed = new Set(getCompletedMilestones(record));
  const lastAdopterMs = getLastAdopterUpdateMs(record);
  const now = Date.now();

  for (const milestone of UPDATE_MILESTONES) {
    if (completed.has(milestone.id)) continue;

    const dueMs = getMilestoneDueMs(record, milestone.id);

    if (lastAdopterMs >= dueMs) continue;
    if (isMilestoneExcusedByEndorsement(record, dueMs)) continue;

    if (!isMilestoneOpen(record, milestone.id, now)) continue;

    const overdue = now >= dueMs;
    return {
      milestone,
      dueMs,
      overdue,
      overdueDays: overdue ? Math.floor((now - dueMs) / MS_DAY) : 0,
    };
  }

  return null;
}

/** Adopter may post home check-ins only while the placement is active. */
export function canAdopterPostUpdate(record: AdoptionRecord): boolean {
  if (record.status === 'closed' || record.status === 'pending_confirmation') {
    return false;
  }
  return getActivePrompt(record) != null;
}

export function isUpdateOverdue(record: AdoptionRecord): boolean {
  const prompt = getActivePrompt(record);
  return prompt?.overdue ?? false;
}

export function recomputeRecordStatus(record: AdoptionRecord): AdoptionRecordStatus {
  if (record.status === 'pending_confirmation' || record.status === 'closed') {
    return record.status;
  }
  if (!record.confirmedAt && !record.confirmedAtMs) return record.status;

  const adopterUpdates = record.updates.filter(u => u.type === 'adopter_home');
  if (adopterUpdates.length === 0) return 'confirmed';

  if (isUpdateOverdue(record)) return 'update_due';

  const lastMs = getLastAdopterUpdateMs(record);
  if (lastMs && Date.now() - lastMs < MS_60_DAYS) return 'confirmed';

  const prompt = getActivePrompt(record);
  if (prompt?.overdue) return 'update_due';

  return 'confirmed';
}

export function getEvidenceState(record: AdoptionRecord): 'confirmed' | 'update_on_track' | 'update_due' | 'no_update_yet' {
  if (record.status === 'pending_confirmation') return 'no_update_yet';
  const adopterUpdates = record.updates.filter(u => u.type === 'adopter_home');
  if (adopterUpdates.length === 0) return 'no_update_yet';

  const status = recomputeRecordStatus(record);
  if (status === 'update_due') return 'update_due';

  const lastMs = getLastAdopterUpdateMs(record);
  if (lastMs && Date.now() - lastMs < MS_60_DAYS) return 'update_on_track';
  if (isUpdateOverdue(record)) return 'update_due';
  return 'confirmed';
}

/** Previous owner can leave a note anytime after adoption is confirmed */
export function canPosterPostNote(record: AdoptionRecord, posterId: string): boolean {
  if (record.posterId !== posterId) return false;
  if (record.status === 'pending_confirmation') return false;
  return Boolean(getConfirmedAtMs(record));
}

export function canPosterAddPlacementNote(record: AdoptionRecord, posterId: string): boolean {
  if (record.posterId !== posterId) return false;
  if (record.status === 'pending_confirmation') return false;
  if (!isUpdateOverdue(record)) return false;

  const lastPlacement = [...record.updates].reverse().find(u => u.type === 'poster_placement');
  const lastAdopterMs = getLastAdopterUpdateMs(record);
  const prompt = getActivePrompt(record);
  if (!prompt) return false;

  // Foster note only if overdue 14+ days and adopter hasn't posted since due
  if (prompt.overdueDays < 14) return false;
  if (lastAdopterMs >= prompt.dueMs) return false;

  if (lastPlacement) {
    const placementMs = parseRecordDate(lastPlacement.createdAt);
    if (Date.now() - placementMs < MS_14_DAYS) return false;
  }
  return true;
}

/** Poster may recommend / not-recommend repeatedly after adoption is confirmed. */
export function canPosterEndorse(record: AdoptionRecord, posterId: string): boolean {
  if (record.posterId !== posterId) return false;
  if (record.status === 'pending_confirmation') return false;
  return Boolean(getConfirmedAtMs(record));
}

function shortMilestoneLabel(label: string): string {
  return label.replace(' check-in', '').replace(' update', '');
}

export function formatDueLabel(record: AdoptionRecord): string | null {
  const prompt = getActivePrompt(record);
  if (prompt) {
    const milestone = shortMilestoneLabel(prompt.milestone.label);
    if (prompt.overdue) {
      return `${milestone} · ${prompt.overdueDays}d overdue`;
    }
    const daysUntil = Math.ceil((prompt.dueMs - Date.now()) / MS_DAY);
    if (daysUntil <= 1) return `${milestone} due soon`;
    return `${milestone} due in ${daysUntil}d`;
  }
  const upcoming = getNextUpcomingMilestone(record);
  if (!upcoming) return null;
  const milestone = shortMilestoneLabel(upcoming.milestone.label);
  if (upcoming.daysUntil <= 1) return `${milestone} due soon`;
  return `${milestone} due in ${upcoming.daysUntil}d`;
}

export function formatUpdateDueDate(dueMs: number): string {
  return new Date(dueMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Human-readable next check-in line for inbox previews and system messages */
export function getNextUpdateSummary(record: AdoptionRecord): string | null {
  if (record.status === 'pending_confirmation' || (!record.confirmedAt && !record.confirmedAtMs)) {
    return null;
  }

  const prompt = getActivePrompt(record);
  if (prompt) {
    const dateStr = formatUpdateDueDate(prompt.dueMs);
    if (prompt.overdue) {
      return `Next update overdue · was due ${dateStr}`;
    }

    const daysUntil = Math.ceil((prompt.dueMs - Date.now()) / MS_DAY);
    if (daysUntil <= 0) return `Next update · ${dateStr}`;
    if (daysUntil === 1) return `Next update tomorrow · ${dateStr}`;
    return `Next update in ${daysUntil} days · ${dateStr}`;
  }

  const upcoming = getNextUpcomingMilestone(record);
  if (upcoming) {
    const dateStr = formatUpdateDueDate(upcoming.dueMs);
    if (upcoming.daysUntil <= 1) return `Next update tomorrow · ${dateStr}`;
    return `Next update in ${upcoming.daysUntil} days · ${dateStr}`;
  }

  {
    const remaining = UPDATE_MILESTONES.filter(m => !getCompletedMilestones(record).includes(m.id));
    if (remaining.length === 0) return 'All home check-ins complete';
    return null;
  }
}

export function getNextUpdateSummaryFromConfirmedAt(confirmedAtMs: number): string {
  const dueMs = confirmedAtMs + UPDATE_MILESTONES[0]!.days * MS_DAY;
  const daysUntil = Math.ceil((dueMs - Date.now()) / MS_DAY);
  const dateStr = formatUpdateDueDate(dueMs);
  if (daysUntil <= 0) return `Next update · ${dateStr}`;
  if (daysUntil === 1) return `Next update tomorrow · ${dateStr}`;
  return `Next update in ${daysUntil} days · ${dateStr}`;
}

export function milestoneAfterUpdate(record: AdoptionRecord, updateCreatedAtMs: number): UpdateMilestoneId | null {
  const active = getActivePrompt(record);
  if (active) return active.milestone.id;

  const completed = getCompletedMilestones(record);
  for (const m of UPDATE_MILESTONES) {
    if (completed.includes(m.id)) continue;
    const dueMs = getMilestoneDueMs(record, m.id);
    if (updateCreatedAtMs >= dueMs && isMilestoneOpen(record, m.id, updateCreatedAtMs)) {
      return m.id;
    }
  }
  return null;
}
