import type { UpdateMilestoneId } from '../utils/adoptionUpdateSchedule';
import { getCachedProfile } from '../hooks/useUserProfile';
import {
  getActivePrompt,
  getCompletedMilestones,
  getConfirmedAtMs,
  getEvidenceState as scheduleEvidenceState,
  recomputeRecordStatus,
} from '../utils/adoptionUpdateSchedule';

export type AdoptionRecordStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'update_due'
  | 'closed';

export type AdoptionUpdateType =
  | 'adopter_home'
  | 'poster_placement'
  | 'poster_endorsement'
  | 'adopter_response';

export type PosterRecommendation = 'recommended' | 'not_recommended';

/** Filled in when the poster recommends without writing a note. */
export const POSTER_ENDORSEMENT_DEFAULT_RECOMMENDED_TEXT = 'Would give them another pet.';

export function isDefaultPosterEndorsementNote(text: string | undefined): boolean {
  if (!text) return false;
  return text.trim() === POSTER_ENDORSEMENT_DEFAULT_RECOMMENDED_TEXT;
}

/** Re-rating always needs a note; first-time not-recommended requires one too. */
export function isPosterEndorsementNoteRequired(
  recommendation: PosterRecommendation | null,
  endorsementCount: number,
): boolean {
  return endorsementCount >= 1 || recommendation === 'not_recommended';
}

export type AdoptionUpdate = {
  id: string;
  type: AdoptionUpdateType;
  authorId: string;
  text?: string;
  endorsement?: PosterRecommendation;
  photoCount?: number;
  hasVideo?: boolean;
  milestoneId?: UpdateMilestoneId;
  createdAt: string;
  createdAtMs?: number;
};

export type AdoptionUpdatePayload = {
  text?: string;
  photoCount?: number;
  hasVideo?: boolean;
};

export type AdoptionRecord = {
  id: string;
  adoptionPostId: string;
  chatThreadId?: string;
  posterId: string;
  adopterId: string;
  petName: string;
  species: string;
  icon: string;
  tint: string;
  newHome?: string;
  confirmedAt?: string;
  confirmedAtMs?: number;
  status: AdoptionRecordStatus;
  updates: AdoptionUpdate[];
  completedMilestones?: UpdateMilestoneId[];
  posterEndorsed?: boolean;
  posterRecommendation?: PosterRecommendation;
  nextUpdateDueAt?: string;
  closedReason?: 'relisted';
  closedAt?: string;
};

/** Auto-seeded on adopter confirm — not counted as a real home update. */
export const ADOPTION_BOOTSTRAP_UPDATE = 'First day home — settling in well.';

export type AdopterTrustBadge = 'trusted' | 'active' | 'new' | 'update_pending' | 'recommended' | 'not_recommended';

export type AdopterTrustSummary = {
  total: number;
  confirmed: number;
  withRecentUpdate: number;
  badge: AdopterTrustBadge;
  badgeLabel: string;
};

export type AdoptionUpdatePrompt = {
  id: string;
  recordId: string;
  petName: string;
  recipientId: string;
  milestoneId: UpdateMilestoneId;
  milestoneLabel: string;
  promptText: string;
  overdue: boolean;
  overdueDays: number;
};

const now = Date.now();
const daysAgo = (d: number) => now - d * 24 * 60 * 60 * 1000;
const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const ADOPTION_RECORDS: AdoptionRecord[] = [
  {
    id: 'ar1',
    adoptionPostId: 'p-sam-adopt',
    chatThreadId: 't-adopt-sam',
    posterId: 'sam',
    adopterId: 'you',
    petName: 'Chhotu',
    species: 'dog',
    icon: 'dog',
    tint: '#2FA46A',
    newHome: 'Dhanmondi flat with garden access',
    confirmedAt: fmt(daysAgo(200)),
    confirmedAtMs: daysAgo(200),
    status: 'confirmed',
    posterEndorsed: true,
    posterRecommendation: 'recommended',
    completedMilestones: ['week_1', 'month_1', 'month_3'],
    updates: [
      {
        id: 'u1', type: 'adopter_home', authorId: 'you', milestoneId: 'week_1',
        text: 'First night — already claimed the sofa. Gentle and calm.',
        photoCount: 2,
        createdAt: fmt(daysAgo(193)), createdAtMs: daysAgo(193),
      },
      {
        id: 'u2', type: 'adopter_home', authorId: 'you', milestoneId: 'month_1',
        text: 'Month one: walks twice daily, vet check all clear.',
        photoCount: 1,
        createdAt: fmt(daysAgo(170)), createdAtMs: daysAgo(170),
      },
      {
        id: 'u3', type: 'poster_endorsement', authorId: 'sam',
        endorsement: 'recommended',
        text: 'Would adopt to Aisha again — thoughtful updates every step.',
        createdAt: fmt(daysAgo(10)), createdAtMs: daysAgo(10),
      },
      {
        id: 'u4', type: 'adopter_home', authorId: 'you', milestoneId: 'month_3',
        text: 'Three months in — thriving in the garden, loves Max and Luna.',
        photoCount: 2,
        hasVideo: true,
        createdAt: fmt(daysAgo(110)), createdAtMs: daysAgo(110),
      },
    ],
  },
  {
    id: 'ar-olive',
    adoptionPostId: 'a4',
    chatThreadId: 't-adopt-olive',
    posterId: 'lena',
    adopterId: 'you',
    petName: 'Olive',
    species: 'cat',
    icon: 'cat',
    tint: '#2FA46A',
    newHome: 'Banani quiet apartment',
    confirmedAt: fmt(daysAgo(6)),
    confirmedAtMs: daysAgo(6),
    status: 'confirmed',
    completedMilestones: [],
    updates: [
      {
        id: 'u-olive-bootstrap',
        type: 'adopter_home',
        authorId: 'you',
        text: ADOPTION_BOOTSTRAP_UPDATE,
        createdAt: fmt(daysAgo(6)),
        createdAtMs: daysAgo(6),
      },
    ],
  },
  {
    id: 'ar-mochi',
    adoptionPostId: 'a2',
    chatThreadId: 't-adopt-mochi',
    posterId: 'sam',
    adopterId: 'you',
    petName: 'Mochi',
    species: 'cat',
    icon: 'cat',
    tint: '#7A5AE0',
    newHome: 'Mirpur flat with a sunny windowsill',
    confirmedAt: fmt(daysAgo(3)),
    confirmedAtMs: daysAgo(3),
    status: 'confirmed',
    completedMilestones: [],
    updates: [
      {
        id: 'u-mochi-bootstrap',
        type: 'adopter_home',
        authorId: 'you',
        text: ADOPTION_BOOTSTRAP_UPDATE,
        createdAt: fmt(daysAgo(3)),
        createdAtMs: daysAgo(3),
      },
    ],
  },
  {
    id: 'ar2',
    adoptionPostId: 'p-dev-adopt',
    chatThreadId: 't-adopt-dev',
    posterId: 'dev',
    adopterId: 'you',
    petName: 'Willow',
    species: 'cat',
    icon: 'cat',
    tint: '#7C5CBF',
    newHome: 'Quiet Dhanmondi apartment',
    confirmedAt: fmt(daysAgo(280)),
    confirmedAtMs: daysAgo(280),
    status: 'update_due',
    posterEndorsed: false,
    completedMilestones: ['week_1'],
    updates: [
      {
        id: 'u5', type: 'adopter_home', authorId: 'you', milestoneId: 'week_1',
        text: 'Settled on the windowsill within hours.',
        photoCount: 1,
        createdAt: fmt(daysAgo(273)), createdAtMs: daysAgo(273),
      },
      {
        id: 'u6', type: 'poster_placement', authorId: 'dev',
        text: 'Placed with Aisha — no recent home update yet, last contact 3 wks ago.',
        createdAt: fmt(daysAgo(21)), createdAtMs: daysAgo(21),
      },
    ],
  },
  {
    id: 'ar3',
    adoptionPostId: 'p-you-adopt',
    chatThreadId: 't-adopt-priya',
    posterId: 'you',
    adopterId: 'priya',
    petName: 'Coco',
    species: 'cat',
    icon: 'cat',
    tint: '#D9489A',
    newHome: 'Now with Nila & family',
    confirmedAt: fmt(daysAgo(90)),
    confirmedAtMs: daysAgo(90),
    status: 'confirmed',
    posterEndorsed: true,
    posterRecommendation: 'recommended',
    completedMilestones: ['week_1', 'month_1', 'month_3'],
    updates: [
      {
        id: 'u7', type: 'adopter_home', authorId: 'priya', milestoneId: 'month_1',
        text: 'Coco is purring non-stop — perfect match for our calm home.',
        photoCount: 2,
        createdAt: fmt(daysAgo(60)), createdAtMs: daysAgo(60),
      },
      {
        id: 'u7b', type: 'adopter_home', authorId: 'priya', milestoneId: 'month_3',
        text: 'Three months in — Coco owns every sunny spot in the apartment.',
        photoCount: 2,
        createdAt: fmt(daysAgo(5)), createdAtMs: daysAgo(5),
      },
    ],
  },
  {
    id: 'ar-bruno',
    adoptionPostId: 'a5',
    chatThreadId: 't-adopt-bruno',
    posterId: 'you',
    adopterId: 'omar',
    petName: 'Bruno',
    species: 'dog',
    icon: 'dog',
    tint: '#F2972E',
    newHome: 'Dhanmondi family home',
    confirmedAt: fmt(daysAgo(45)),
    confirmedAtMs: daysAgo(45),
    status: 'update_due',
    completedMilestones: ['week_1'],
    updates: [
      {
        id: 'u-bruno-w1', type: 'adopter_home', authorId: 'omar', milestoneId: 'week_1',
        text: 'Bruno claimed the sofa on day one.',
        photoCount: 1,
        createdAt: fmt(daysAgo(38)), createdAtMs: daysAgo(38),
      },
    ],
  },
  {
    id: 'ar4',
    adoptionPostId: 'p-you-adopt2',
    chatThreadId: 't-adopt-lena',
    posterId: 'you',
    adopterId: 'lena',
    petName: 'Oreo',
    species: 'rabbit',
    icon: 'dog',
    tint: '#7C5CBF',
    newHome: 'Bunny-experienced couple in Banani',
    confirmedAt: fmt(daysAgo(120)),
    confirmedAtMs: daysAgo(120),
    status: 'update_due',
    completedMilestones: ['week_1'],
    updates: [
      {
        id: 'u8', type: 'adopter_home', authorId: 'lena', milestoneId: 'week_1',
        text: 'Oreo has his own corner and a new best friend (a plush carrot).',
        photoCount: 1,
        hasVideo: true,
        createdAt: fmt(daysAgo(113)), createdAtMs: daysAgo(113),
      },
      {
        id: 'u8e', type: 'poster_endorsement', authorId: 'you',
        endorsement: 'recommended',
        text: 'Lena keeps Oreo\'s space spotless and sends cheerful updates.',
        createdAt: fmt(daysAgo(30)), createdAtMs: daysAgo(30),
      },
    ],
  },
];

/** Confirmed adoption history — permanent public profile record; never user-deletable. */
export function isPermanentAdoptionRecord(record: AdoptionRecord): boolean {
  return record.status !== 'pending_confirmation'
    && Boolean(record.confirmedAt ?? record.confirmedAtMs);
}

/**
 * Profile "Adopted" tab — all confirmed adoptions for a user, including closed.
 * Backend: GET /users/:id/adopted-records (no hide/delete; immutable once confirmed).
 */
export function filterIncomingAdopted(records: AdoptionRecord[], userId: string): AdoptionRecord[] {
  return records.filter(
    r => r.adopterId === userId && r.status !== 'pending_confirmation',
  );
}

/** Active adoptions only — update prompts, overdue badges (excludes closed). */
export function filterConfirmedIncomingAdopted(records: AdoptionRecord[], userId: string): AdoptionRecord[] {
  return records.filter(
    r => r.adopterId === userId && (r.status === 'confirmed' || r.status === 'update_due'),
  );
}

/** Block client patches that would hide or undo a confirmed adoption. */
export function enforceAdoptionRecordIntegrity(
  before: AdoptionRecord,
  after: AdoptionRecord,
): AdoptionRecord {
  if (!isPermanentAdoptionRecord(before)) return after;

  const posterRelistClose = after.status === 'closed'
    && after.closedReason === 'relisted'
    && before.posterId === after.posterId
    && isPermanentAdoptionRecord(before);
  const blockedClosed = after.status === 'closed' && before.status !== 'closed' && !posterRelistClose;

  return {
    ...after,
    posterId: before.posterId,
    adopterId: before.adopterId,
    confirmedAt: before.confirmedAt ?? after.confirmedAt,
    confirmedAtMs: before.confirmedAtMs ?? after.confirmedAtMs,
    status: after.status === 'pending_confirmation' || blockedClosed
      ? before.status
      : after.status,
  };
}

/** Yellow alert badge on avatars when an adopter owes an overdue home update. */
export function userHasPendingAdoptionUpdate(records: AdoptionRecord[], userId: string): boolean {
  return records.some(r => {
    if (r.adopterId !== userId) return false;
    if (r.status === 'closed' || r.status === 'pending_confirmation') return false;
    if (recomputeRecordStatus(r) === 'update_due') return true;
    const prompt = getActivePrompt(r);
    return prompt?.overdue ?? false;
  });
}

export function filterOutgoingAdoptions(records: AdoptionRecord[], userId: string): AdoptionRecord[] {
  return records.filter(r => r.posterId === userId && r.status !== 'pending_confirmation');
}

export function getAdoptionRecordById(records: AdoptionRecord[], id: string): AdoptionRecord | null {
  return records.find(r => r.id === id) ?? null;
}

export function syncAllRecordStatuses(records: AdoptionRecord[]): AdoptionRecord[] {
  return records.map(r => ({
    ...r,
    status: recomputeRecordStatus(r),
  }));
}

export function adopterFollowedThrough(record: AdoptionRecord): boolean {
  const voluntary = record.updates.filter(
    u => u.type === 'adopter_home' && u.text !== ADOPTION_BOOTSTRAP_UPDATE,
  );
  if (voluntary.length > 0) return true;
  return getCompletedMilestones(record).length > 0;
}

/** Poster may re-list any time after they marked the pet adopted. Adopters never can. */
export function canPosterRelistAdoption(record: AdoptionRecord, posterId: string): boolean {
  if (!posterId || record.posterId !== posterId) return false;
  if (record.status === 'closed' || record.status === 'pending_confirmation') return false;
  return Boolean(getConfirmedAtMs(record));
}

export function getAdoptionRecordForListing(
  records: AdoptionRecord[],
  listingId: string,
  posterId?: string,
): AdoptionRecord | undefined {
  if (posterId) {
    return records.find(
      r => r.adoptionPostId === listingId && r.posterId === posterId,
    );
  }
  return records.find(r => r.adoptionPostId === listingId);
}

export function getAdopterUpdateCount(record: AdoptionRecord): number {
  return record.updates.filter(u => u.type === 'adopter_home').length;
}

export function getAdopterHomeUpdates(record: AdoptionRecord): AdoptionUpdate[] {
  return record.updates
    .filter(u => u.type === 'adopter_home')
    .sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));
}

export function getPosterEndorsementUpdates(record: AdoptionRecord): AdoptionUpdate[] {
  return record.updates.filter(u => u.type === 'poster_endorsement');
}

export function getPosterEndorsementCount(record: AdoptionRecord): number {
  return getPosterEndorsementUpdates(record).length;
}

/** @deprecated Use getLatestPosterEndorsementUpdate */
export function getPosterEndorsementUpdate(record: AdoptionRecord): AdoptionUpdate | null {
  return getLatestPosterEndorsementUpdate(record);
}

export function getLatestPosterEndorsementUpdate(record: AdoptionRecord): AdoptionUpdate | null {
  const all = getPosterEndorsementUpdates(record);
  if (all.length > 0) return all[all.length - 1]!;
  if (record.posterRecommendation) {
    return {
      id: `${record.id}-poster-rec`,
      type: 'poster_endorsement',
      authorId: record.posterId,
      endorsement: record.posterRecommendation,
      text: undefined,
      createdAt: record.confirmedAt ?? '',
    };
  }
  return null;
}

export function getPosterRecommendation(record: AdoptionRecord): PosterRecommendation | null {
  const latest = getLatestPosterEndorsementUpdate(record);
  if (latest?.endorsement) return latest.endorsement;
  if (record.posterRecommendation) return record.posterRecommendation;
  if (record.posterEndorsed) return 'recommended';
  return null;
}

export function getPreviousOwnerNotes(record: AdoptionRecord): AdoptionUpdate[] {
  return record.updates
    .filter(u => u.type === 'poster_placement')
    .sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));
}

export function getLatestUpdate(record: AdoptionRecord): AdoptionUpdate | null {
  const adopter = getAdopterHomeUpdates(record);
  if (adopter.length === 0) return null;
  return adopter[adopter.length - 1]!;
}

export function getEvidenceState(record: AdoptionRecord) {
  return scheduleEvidenceState(record);
}

export function getAdopterTrustSummary(records: AdoptionRecord[], userId: string): AdopterTrustSummary {
  const incoming = filterIncomingAdopted(records, userId);
  const confirmed = incoming.length;
  const withRecentUpdate = incoming.filter(r => getEvidenceState(r) === 'update_on_track').length;
  const endorsed = incoming.filter(r => getPosterRecommendation(r) === 'recommended').length;
  const activeIncoming = incoming.filter(
    r => r.status !== 'closed' && r.status !== 'pending_confirmation',
  );

  let badge: AdopterTrustBadge = 'new';
  let badgeLabel = 'New adopter';

  if (confirmed === 0) {
    badge = 'new';
    badgeLabel = 'New adopter';
  } else if (activeIncoming.some(r => recomputeRecordStatus(r) === 'update_due' || getActivePrompt(r)?.overdue)) {
    badge = 'update_pending';
    badgeLabel = 'Update overdue';
  } else if (activeIncoming.some(r => getActivePrompt(r) != null)) {
    badge = 'update_pending';
    badgeLabel = 'Check-in due';
  } else if (activeIncoming.some(r => getPosterRecommendation(r) === 'not_recommended')) {
    badge = 'not_recommended';
    badgeLabel = 'Not recommended';
  } else if (incoming.some(r => getPosterRecommendation(r) === 'recommended')) {
    badge = 'recommended';
    badgeLabel = 'Recommended';
  } else if (endorsed >= 1 && withRecentUpdate >= 1) {
    badge = 'trusted';
    badgeLabel = 'Trusted adopter';
  } else if (confirmed >= 1) {
    badge = 'active';
    badgeLabel = 'Active adopter';
  }

  return { total: confirmed, confirmed, withRecentUpdate, badge, badgeLabel };
}

export function getAdopterResponseUpdates(record: AdoptionRecord): AdoptionUpdate[] {
  return record.updates.filter(u => u.type === 'adopter_response');
}

export function getLatestAdopterResponse(record: AdoptionRecord): AdoptionUpdate | null {
  const all = getAdopterResponseUpdates(record);
  return all.length > 0 ? all[all.length - 1]! : null;
}

export function updateAttributionLabel(type: AdoptionUpdateType): string {
  switch (type) {
    case 'adopter_home': return 'From adopter';
    case 'poster_placement': return 'Previous owner note';
    case 'poster_endorsement': return 'Previous owner';
    case 'adopter_response': return 'Adopter response';
    default: return '';
  }
}

/** Sync handle lookup — prefer {@link useUserProfile} in UI so handles load from Supabase. */
export function getUserHandle(userId: string): string {
  return getCachedProfile(userId)?.handle ?? userId.slice(0, 8);
}

// Legacy helpers
export function getOutgoingAdoptions(userId: string) {
  return filterOutgoingAdoptions(ADOPTION_RECORDS, userId);
}
export function getIncomingAdopted(userId: string) {
  return filterIncomingAdopted(ADOPTION_RECORDS, userId);
}
export function getAdoptionRecordByIdLegacy(id: string) {
  return getAdoptionRecordById(ADOPTION_RECORDS, id);
}
