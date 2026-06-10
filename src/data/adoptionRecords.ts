import { users } from './mockData';
import type { UpdateMilestoneId } from '../utils/adoptionUpdateSchedule';
import {
  getEvidenceState as scheduleEvidenceState,
  recomputeRecordStatus,
} from '../utils/adoptionUpdateSchedule';

export type AdoptionRecordStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'update_due'
  | 'closed';

export type AdoptionUpdateType = 'adopter_home' | 'poster_placement' | 'poster_endorsement';

export type AdoptionUpdate = {
  id: string;
  type: AdoptionUpdateType;
  authorId: string;
  text?: string;
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
  posterEndorsementRating?: number;
  nextUpdateDueAt?: string;
};

export type AdopterTrustBadge = 'trusted' | 'active' | 'new' | 'update_pending';

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
    newHome: 'Bandra flat with garden access',
    confirmedAt: fmt(daysAgo(200)),
    confirmedAtMs: daysAgo(200),
    status: 'confirmed',
    posterEndorsed: true,
    posterEndorsementRating: 5,
    completedMilestones: ['week_1', 'month_1', 'month_3'],
    updates: [
      {
        id: 'u1', type: 'adopter_home', authorId: 'you', milestoneId: 'week_1',
        text: 'First night — already claimed the sofa. Gentle and calm.',
        createdAt: fmt(daysAgo(193)), createdAtMs: daysAgo(193),
      },
      {
        id: 'u2', type: 'adopter_home', authorId: 'you', milestoneId: 'month_1',
        text: 'Month one: walks twice daily, vet check all clear.',
        createdAt: fmt(daysAgo(170)), createdAtMs: daysAgo(170),
      },
      {
        id: 'u3', type: 'poster_endorsement', authorId: 'sam',
        text: 'Would adopt to Aisha again — thoughtful updates every step.',
        createdAt: fmt(daysAgo(160)), createdAtMs: daysAgo(160),
      },
      {
        id: 'u4', type: 'adopter_home', authorId: 'you', milestoneId: 'month_3',
        text: 'Six months in — thriving, loves Max and Luna.',
        createdAt: fmt(daysAgo(20)), createdAtMs: daysAgo(20),
      },
    ],
  },
  {
    id: 'ar2',
    adoptionPostId: 'p-dev-adopt',
    chatThreadId: 't-adopt-dev',
    posterId: 'dev',
    adopterId: 'you',
    petName: 'Misty',
    species: 'cat',
    icon: 'cat',
    tint: '#7C5CBF',
    newHome: 'Quiet Bandra apartment',
    confirmedAt: fmt(daysAgo(280)),
    confirmedAtMs: daysAgo(280),
    status: 'update_due',
    posterEndorsed: false,
    completedMilestones: ['week_1'],
    updates: [
      {
        id: 'u5', type: 'adopter_home', authorId: 'you', milestoneId: 'week_1',
        text: 'Settled on the windowsill within hours.',
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
    posterEndorsementRating: 5,
    completedMilestones: ['week_1', 'month_1'],
    updates: [
      {
        id: 'u7', type: 'adopter_home', authorId: 'priya', milestoneId: 'month_1',
        text: 'Coco is purring non-stop — perfect match for our calm home.',
        createdAt: fmt(daysAgo(60)), createdAtMs: daysAgo(60),
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
    newHome: 'Bunny-experienced couple in Colaba',
    confirmedAt: fmt(daysAgo(120)),
    confirmedAtMs: daysAgo(120),
    status: 'confirmed',
    completedMilestones: ['week_1'],
    updates: [
      {
        id: 'u8', type: 'adopter_home', authorId: 'lena', milestoneId: 'week_1',
        text: 'Oreo has his own corner and a new best friend (a plush carrot).',
        createdAt: fmt(daysAgo(113)), createdAtMs: daysAgo(113),
      },
    ],
  },
];

export function filterIncomingAdopted(records: AdoptionRecord[], userId: string): AdoptionRecord[] {
  return records.filter(
    r => r.adopterId === userId && r.status !== 'pending_confirmation',
  );
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

export function getAdopterUpdateCount(record: AdoptionRecord): number {
  return record.updates.filter(u => u.type === 'adopter_home').length;
}

export function getLatestUpdate(record: AdoptionRecord): AdoptionUpdate | null {
  if (record.updates.length === 0) return null;
  return [...record.updates].sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0))[0]!;
}

export function getEvidenceState(record: AdoptionRecord) {
  return scheduleEvidenceState(record);
}

export function getAdopterTrustSummary(records: AdoptionRecord[], userId: string): AdopterTrustSummary {
  const incoming = filterIncomingAdopted(records, userId);
  const confirmed = incoming.length;
  const withRecentUpdate = incoming.filter(r => getEvidenceState(r) === 'update_on_track').length;
  const endorsed = incoming.filter(r => r.posterEndorsed).length;

  let badge: AdopterTrustBadge = 'new';
  let badgeLabel = 'New adopter';

  if (confirmed === 0) {
    badge = 'new';
    badgeLabel = 'New adopter';
  } else if (incoming.some(r => getEvidenceState(r) === 'update_due')) {
    badge = 'update_pending';
    badgeLabel = 'Update pending';
  } else if (endorsed >= 1 && withRecentUpdate >= 1) {
    badge = 'trusted';
    badgeLabel = 'Trusted adopter';
  } else if (confirmed >= 1) {
    badge = 'active';
    badgeLabel = 'Active adopter';
  }

  return { total: confirmed, confirmed, withRecentUpdate, badge, badgeLabel };
}

export function updateAttributionLabel(type: AdoptionUpdateType): string {
  switch (type) {
    case 'adopter_home': return 'From adopter';
    case 'poster_placement': return 'From foster';
    case 'poster_endorsement': return 'Foster endorsement';
    default: return '';
  }
}

export function getUserHandle(userId: string): string {
  return users[userId as keyof typeof users]?.handle ?? userId;
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
