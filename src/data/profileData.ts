import { users } from './mockData';

export type RescueStatus = 'recovered' | 'under_treatment' | 'active';

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

export const RESCUE_CASES: RescueCase[] = [
  {
    id: 'r1', userId: 'you', name: 'Milo', species: 'dog', icon: 'dog', tint: '#14A697',
    status: 'recovered', date: 'May 18, 2024', location: 'Dhanmondi, Dhaka',
    story: 'Found injured near the lake. Community rallied for treatment — now fully recovered and rehomed.',
    postId: 'p4',
  },
  {
    id: 'r2', userId: 'you', name: 'Luna', species: 'cat', icon: 'cat', tint: '#7A5AE0',
    status: 'under_treatment', date: 'Jun 2, 2024', location: 'Bandra, Mumbai',
    story: 'Stray kitten with eye infection. Under vet care; updates posted weekly to the circle.',
  },
  {
    id: 'r3', userId: 'you', name: 'Chhotu', species: 'dog', icon: 'dog', tint: '#F2972E',
    status: 'recovered', date: 'Apr 9, 2024', location: 'Juhu, Mumbai',
    story: 'Hit-and-run survivor. Fostered for six weeks before a forever family adopted him.',
  },
  {
    id: 'r4', userId: 'you', name: 'Bruno', species: 'dog', icon: 'dog', tint: '#2FA46A',
    status: 'active', date: 'Jun 8, 2024', location: 'Powai, Mumbai',
    story: 'Still searching for owner. Gentle indie, good with kids. Needs a foster home.',
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
    adoptedDate: 'Aug 30, 2023', newHome: 'Forever home in Worli',
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

export function getProfileTrust(userId: string): ProfileTrust {
  const u = users[userId];
  const flagCount = userId === 'you' ? 0 : 0;
  const rating = u?.rating ?? 0;
  const reviewCount = u?.reviews ?? 0;
  let status: ProfileTrust['status'] = 'good';
  if (flagCount >= 5 || rating < 3.5) status = 'flagged';
  else if (flagCount >= 2 || rating < 4) status = 'warning';
  else if (u?.verified && rating >= 4.8) status = 'trusted';
  return { rating, reviewCount, flagCount, status };
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

export const RESCUE_STATUS_META: Record<RescueStatus, { label: string; tint: string; bg: string; icon: string }> = {
  recovered: { label: 'Recovered', tint: '#3A9B72', bg: '#EAF7F0', icon: 'heart' },
  under_treatment: { label: 'Under Treatment', tint: '#7C5CBF', bg: '#F0EBFA', icon: 'medical' },
  active: { label: 'Active', tint: '#C98E2A', bg: '#FDF6E8', icon: 'alert' },
};
