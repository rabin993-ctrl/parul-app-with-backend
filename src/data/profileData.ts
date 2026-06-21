import {
  filterIncomingAdopted,
  filterOutgoingAdoptions,
  type AdoptionRecord,
} from './adoptionRecords';

export type RescueStatus = 'recovered' | 'under_treatment' | 'active';

export type RescueUpdate = {
  id: string;
  time: string;
  text: string;
  photoCount?: number;
  /** @deprecated use photoCount / mediaUrls */
  hasPhoto?: boolean;
  mediaUrls?: string[];
};

export type RescueCase = {
  id: string;
  userId: string;
  name: string;
  species: string;
  icon: string;
  tint: string;
  status: RescueStatus;
  date: string;
  location: string;
  story: string;
  postId?: string;
  caseId?: string;
  headline?: string;
  tags?: string[];
  followers?: number;
  updates?: RescueUpdate[];
};

export type AdoptionShowcase = {
  id: string;
  userId: string;
  name: string;
  species: string;
  icon: string;
  tint: string;
  adoptedDate: string;
  newHome: string;
  story: string;
  postId?: string;
};

export type AdoptedCompanion = {
  id: string;
  userId: string;
  name: string;
  species: string;
  icon: string;
  tint: string;
  adoptedDate: string;
  note: string;
};

export type ProfileTrust = {
  rating: number;
  reviewCount: number;
  flagCount: number;
  status: 'trusted' | 'good' | 'warning' | 'flagged';
};

export const PROFILE_STATS = {
  you: { posts: 36, rescues: 12, successfulAdoptions: 8, adopted: 2 },
};

export type ProfileImpactStats = {
  rescues: number;
  rehomed: number;
  adopted: number;
  following: number;
};

/** Hero stat row — same labels and fallbacks for own profile and public profile. */
export function getProfileImpactStats(
  userId: string,
  records: AdoptionRecord[],
): ProfileImpactStats {
  const seed = userId === 'you' ? PROFILE_STATS.you : undefined;
  const rescueCount = getRescuesForUser(userId).length;
  const outgoing = filterOutgoingAdoptions(records, userId).length;
  const incoming = filterIncomingAdopted(records, userId).length;

  return {
    rescues: rescueCount || seed?.rescues || 0,
    rehomed: outgoing || seed?.successfulAdoptions || getSuccessfulAdoptionsForUser(userId).length,
    adopted: incoming || seed?.adopted || getAdoptedForUser(userId).length,
    following: 0,
  };
}

export const RESCUE_CASES: RescueCase[] = [
  {
    id: 'r1', userId: 'you', name: 'Milo', species: 'dog', icon: 'dog', tint: '#14A697',
    status: 'recovered', date: 'May 18, 2024', location: 'Dhanmondi, Dhaka',
    caseId: 'RC240518',
    headline: 'Injured Dog Found Near Dhanmondi Lake',
    tags: ['Dog', 'Resolved'],
    followers: 125,
    story: 'Found injured near the lake. Community rallied for treatment — now fully recovered and rehomed.',
    postId: 'p4',
    updates: [
      { id: 'u3', time: 'Jun 4, 11:00 AM', text: 'Fully recovered and matched with a foster family.', hasPhoto: true },
      { id: 'u2', time: 'May 20, 2:15 PM', text: 'Vet confirmed soft-tissue injury. Rest and meds started.', hasPhoto: true },
      { id: 'u1', time: 'May 18, 9:00 AM', text: 'Spotted limping near the south gate. Brought to safety.', hasPhoto: true },
    ],
  },
  {
    id: 'r2', userId: 'you', name: 'Luna', species: 'cat', icon: 'cat', tint: '#7A5AE0',
    status: 'under_treatment', date: 'Jun 2, 2024', location: 'Dhanmondi, Dhaka',
    caseId: 'RC240602',
    headline: 'Stray Kitten with Eye Infection in Dhanmondi',
    tags: ['Kitten', 'Under Treatment'],
    followers: 84,
    story: 'Stray kitten with eye infection. Under vet care; updates posted weekly to the circle.',
    updates: [
      { id: 'u1', time: 'Today, 10:30 AM', text: 'Vet checkup done. Infection confirmed. Eye drops started twice daily.', hasPhoto: true },
      { id: 'u2', time: 'Yesterday, 6:45 PM', text: 'Eating well and staying warm in foster. Appetite improving.', hasPhoto: true },
      { id: 'u3', time: 'Jun 2, 8:00 AM', text: 'Found behind the market — eyes swollen, very thin but friendly.', hasPhoto: true },
      { id: 'u4', time: 'Jun 1, 4:20 PM', text: 'Community member flagged the case. Pickup arranged.', hasPhoto: true },
    ],
  },
  {
    id: 'r3', userId: 'you', name: 'Chhotu', species: 'dog', icon: 'dog', tint: '#F2972E',
    status: 'recovered', date: 'Apr 9, 2024', location: 'Mirpur, Dhaka',
    caseId: 'RC240409',
    headline: 'Hit-and-Run Survivor Needs a Foster',
    tags: ['Dog', 'Resolved'],
    followers: 210,
    story: 'Hit-and-run survivor. Fostered for six weeks before a forever family adopted him.',
    updates: [
      { id: 'u1', time: 'May 14, 3:00 PM', text: 'Adopted by a family in Mohammadpur. Case closed.', hasPhoto: true },
      { id: 'u2', time: 'Apr 22, 9:30 AM', text: 'Mobility improving daily. Gentle walks started.', hasPhoto: true },
      { id: 'u3', time: 'Apr 9, 7:15 PM', text: 'Emergency vet visit after roadside accident.', hasPhoto: true },
    ],
  },
  {
    id: 'r4', userId: 'you', name: 'Bruno', species: 'dog', icon: 'dog', tint: '#2FA46A',
    status: 'active', date: 'Jun 8, 2024', location: 'Uttara, Dhaka',
    caseId: 'RC240608',
    headline: 'Gentle Indie Searching for Owner in Uttara',
    tags: ['Dog', 'Needs Help'],
    followers: 56,
    story: 'Still searching for owner. Gentle indie, good with kids. Needs a foster home.',
    updates: [
      { id: 'u1', time: 'Today, 1:00 PM', text: 'Flyers posted around Bashundhara. No leads yet.', hasPhoto: true },
      { id: 'u2', time: 'Jun 9, 10:00 AM', text: 'Settling in temporary shelter. Calm with children.', hasPhoto: true },
      { id: 'u3', time: 'Jun 8, 6:10 PM', text: 'Found wandering near the circle with green collar.', hasPhoto: true },
    ],
  },
];

export const SUCCESSFUL_ADOPTIONS: AdoptionShowcase[] = [
  {
    id: 'sa1', userId: 'you', name: 'Coco', species: 'cat', icon: 'cat', tint: '#D9489A',
    adoptedDate: 'Mar 14, 2024', newHome: 'Now with Nila & family',
    story: 'Shy Persian found on a rainy night — matched with a calm household after two meet-and-greets.',
  },
  {
    id: 'sa2', userId: 'you', name: 'Oreo', species: 'rabbit', icon: 'dog', tint: '#7C5CBF',
    adoptedDate: 'Jan 22, 2024', newHome: 'Found a loving home',
    story: 'Posted to the adoption hub; adopted within a week by a bunny-experienced couple.',
  },
  {
    id: 'sa3', userId: 'you', name: 'Tuffy', species: 'hamster', icon: 'dog', tint: '#E2941A',
    adoptedDate: 'Nov 5, 2023', newHome: 'Now with Arjun & Meera',
    story: 'Small pet, big personality. Rehomed after owner relocated abroad.',
  },
  {
    id: 'sa4', userId: 'you', name: 'Bella', species: 'dog', icon: 'dog', tint: '#14A697',
    adoptedDate: 'Aug 30, 2023', newHome: 'Forever home in Mohammadpur',
    story: 'Senior lab mix — perfect match with retirees who wanted a gentle companion.',
  },
];

export const ADOPTED_COMPANIONS: AdoptedCompanion[] = [
  {
    id: 'ad1', userId: 'you', name: 'Max', species: 'dog', icon: 'dog', tint: '#F2972E',
    adoptedDate: 'Jan 2022', note: 'Golden retriever · first adoption milestone',
  },
  {
    id: 'ad2', userId: 'you', name: 'Luna', species: 'cat', icon: 'cat', tint: '#7A5AE0',
    adoptedDate: 'Jun 2022', note: 'Indie shorthair · windowsill supervisor',
  },
];

export function getProfileTrust(_userId: string): ProfileTrust {
  return { rating: 0, reviewCount: 0, flagCount: 0, status: 'good' };
}

export function getRescuesForUser(userId: string) {
  return RESCUE_CASES.filter(r => r.userId === userId);
}

export function getSuccessfulAdoptionsForUser(userId: string) {
  return SUCCESSFUL_ADOPTIONS.filter(a => a.userId === userId);
}

export function getAdoptedForUser(userId: string) {
  return ADOPTED_COMPANIONS.filter(a => a.userId === userId);
}

export function getRescueById(id: string) {
  return RESCUE_CASES.find(r => r.id === id) ?? null;
}


export function getAdoptionShowcaseById(id: string) {
  return SUCCESSFUL_ADOPTIONS.find(a => a.id === id) ?? null;
}

export type RescueStatusMeta = {
  label: string;
  shortLabel: string;
  description: string;
  tint: string;
  bg: string;
  icon: string;
};

export const RESCUE_STATUS_META: Record<RescueStatus, RescueStatusMeta> = {
  active: {
    label: 'Needs Help',
    shortLabel: 'Needs Help',
    description: 'Still open — looking for a foster, owner, transport, or other community support.',
    tint: '#C98E2A',
    bg: '#FDF6E8',
    icon: 'megaphone',
  },
  under_treatment: {
    label: 'Under Treatment',
    shortLabel: 'Under Treatment',
    description: 'Animal is under active treatment with a vet or carer. Updates are posted as care progresses.',
    tint: '#7C5CBF',
    bg: '#F0EBFA',
    icon: 'medical',
  },
  recovered: {
    label: 'Resolved',
    shortLabel: 'Resolved',
    description: 'Animal is safe. This case is closed with a clear outcome shared publicly.',
    tint: '#3A9B72',
    bg: '#EAF7F0',
    icon: 'check-circle',
  },
};

export function formatRescueUpdateTime(date = new Date()): string {
  const now = new Date();
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  if (date.toDateString() === now.toDateString()) return `Today, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${day}, ${time}`;
}

export function getRescueLastUpdate(item: RescueCase): string | null {
  return item.updates?.[0]?.time ?? null;
}
