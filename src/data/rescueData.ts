import type { Post } from './mockData';
import { RESCUE_CASES, RESCUE_STATUS_META, type RescueCase, type RescueStatus } from './profileData';

export type RescueSpecies = 'all' | 'dog' | 'cat' | 'other';

export type RescueScope = 'nearby' | 'all';

export type RescueContentType = 'all' | 'rescue' | 'cases';

export type RescueHubTab = 'browse' | 'following' | 'my-cases';

export type RescueFilters = {
  species: RescueSpecies;
  status: RescueStatus | 'all';
  scope: RescueScope;
  contentType: RescueContentType;
};

export const DEFAULT_RESCUE_FILTERS: RescueFilters = {
  species: 'all',
  status: 'all',
  scope: 'all',
  contentType: 'all',
};

export const RESCUE_CONTENT_OPTIONS = [
  { id: 'all' as const, label: 'All', icon: 'paw' },
  { id: 'rescue' as const, label: 'Rescue', icon: 'megaphone' },
  { id: 'cases' as const, label: 'Cases', icon: 'shield' },
] as const;

export const RESCUE_SPECIES_OPTIONS = [
  { id: 'all', label: 'Any', icon: 'paw' },
  { id: 'dog', label: 'Dogs', icon: 'dog' },
  { id: 'cat', label: 'Cats', icon: 'cat' },
  { id: 'other', label: 'Other', icon: 'paw-line' },
] as const;

export const RESCUE_SCOPE_OPTIONS = [
  { id: 'nearby' as const, label: 'Near me', icon: 'mapPin' },
  { id: 'all' as const, label: 'Everywhere', icon: 'communities' },
];

export function formatRescueFilterSummary(filters: RescueFilters): string {
  const scope = RESCUE_SCOPE_OPTIONS.find(o => o.id === filters.scope)?.label ?? 'Everywhere';
  const species = RESCUE_SPECIES_OPTIONS.find(o => o.id === filters.species)?.label ?? 'Any';
  const content = RESCUE_CONTENT_OPTIONS.find(o => o.id === filters.contentType)?.label ?? 'All';
  const parts = [scope, species, content];
  if (filters.contentType === 'cases' && filters.status !== 'all') {
    const status = RESCUE_STATUS_META[filters.status]?.label;
    if (status) parts.push(status);
  }
  return parts.join(' · ');
}

export const RESCUE_LOCATIONS = [
  'Dhanmondi, Dhaka',
  'Gulshan, Dhaka',
  'Uttara, Dhaka',
  'Mirpur, Dhaka',
  'Banani, Dhaka',
  'Mohammadpur, Dhaka',
  'Old Dhaka',
  'Bashundhara, Dhaka',
] as const;

const USER_NEARBY_KEYWORDS = ['dhaka', 'dhanmondi', 'gulshan', 'uttara', 'mirpur', 'banani', 'mohammadpur', 'bashundhara'];

export const COMMUNITY_RESCUE_CASES: RescueCase[] = [
  {
    id: 'r5', userId: 'sam', name: 'Moti', species: 'dog', icon: 'dog', tint: '#2FA46A',
    status: 'active', date: 'Jun 9, 2024', location: 'Mirpur, Dhaka',
    caseId: 'RC240609',
    headline: 'Abandoned Puppy Near Mirpur DOHS Park',
    tags: ['Dog', 'Needs Help'],
    followers: 92,
    story: 'Small indie puppy found alone near the park gate. Needs foster and vet check.',
    postId: 'p-rescue-moti',
    updates: [
      { id: 'u1', time: 'Today, 8:00 AM', text: 'Fed and hydrated. Vet appointment booked for tomorrow.', hasPhoto: true },
      { id: 'u2', time: 'Yesterday, 5:30 PM', text: 'Found shivering near the park entrance. Brought to safety.', hasPhoto: true },
    ],
  },
  {
    id: 'r6', userId: 'karim', name: 'Noori', species: 'cat', icon: 'cat', tint: '#E0503F',
    status: 'under_treatment', date: 'Jun 5, 2024', location: 'Dhanmondi, Dhaka',
    caseId: 'RC240605',
    headline: 'Cat Hit by Rickshaw — Needs Surgery Fund',
    tags: ['Cat', 'Under Treatment'],
    followers: 164,
    story: 'Community raising funds for leg surgery. Updates posted daily from the clinic.',
    postId: 'p-rescue-noori',
    updates: [
      { id: 'u1', time: 'Today, 11:00 AM', text: 'Surgery scheduled for Friday. Fund at 78% of goal.', hasPhoto: true },
      { id: 'u2', time: 'Jun 6, 9:00 AM', text: 'X-rays confirm fracture. Stable and eating.', hasPhoto: true },
    ],
  },
  {
    id: 'r7', userId: 'dev', name: 'Storm', species: 'dog', icon: 'dog', tint: '#7A5AE0',
    status: 'active', date: 'Jun 7, 2024', location: 'Uttara, Dhaka',
    caseId: 'RC240607',
    headline: 'Dog Trapped in Construction Site',
    tags: ['Dog', 'Needs Help'],
    followers: 41,
    story: 'Workers heard barking underground. Needs rescue team and transport.',
    updates: [
      { id: 'u1', time: 'Today, 2:00 PM', text: 'Site manager allowing access at 6 PM. Volunteers needed.', hasPhoto: true },
    ],
  },
];

export const ALL_RESCUE_CASES: RescueCase[] = [...RESCUE_CASES, ...COMMUNITY_RESCUE_CASES];

export function getRescueCaseById(id: string): RescueCase | null {
  return ALL_RESCUE_CASES.find(c => c.id === id) ?? null;
}

function isNearbyCase(item: RescueCase): boolean {
  return isNearbyRescueLocation(item.location);
}

export function filterRescueCases(
  cases: RescueCase[],
  opts: {
    query?: string;
    filters?: Partial<RescueFilters>;
    tab?: RescueHubTab;
    followedIds?: Set<string>;
    currentUserId?: string | null;
  },
): RescueCase[] {
  const filters = { ...DEFAULT_RESCUE_FILTERS, ...opts.filters };
  const q = opts.query?.trim().toLowerCase() ?? '';

  let list = cases;

  if (opts.tab === 'following' && opts.followedIds) {
    list = list.filter(c => opts.followedIds!.has(c.id));
  } else if (opts.tab === 'my-cases' && opts.currentUserId) {
    list = list.filter(c => c.userId === opts.currentUserId);
  } else if (opts.tab === 'browse') {
    list = list.filter(c => c.status !== 'recovered');
  }

  if (filters.scope === 'nearby' && opts.tab !== 'my-cases') {
    list = list.filter(isNearbyCase);
  }

  if (filters.species !== 'all') {
    list = list.filter(c => {
      if (filters.species === 'other') return c.species !== 'dog' && c.species !== 'cat';
      return c.species === filters.species;
    });
  }

  if (filters.contentType === 'cases' && filters.status !== 'all') {
    list = list.filter(c => c.status === filters.status);
  }

  if (q) {
    list = list.filter(c => {
      const hay = [
        c.name,
        c.headline,
        c.story,
        c.location,
        c.caseId,
        c.species,
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  return list;
}

export function countActiveRescueFilters(filters: RescueFilters): number {
  let n = 0;
  if (filters.species !== 'all') n += 1;
  if (filters.contentType === 'cases' && filters.status !== 'all') n += 1;
  if (filters.scope !== 'all') n += 1;
  if (filters.contentType !== 'all') n += 1;
  return n;
}

export function isNearbyRescueLocation(location: string): boolean {
  const loc = location.toLowerCase();
  return USER_NEARBY_KEYWORDS.some(k => loc.includes(k));
}

export function isRescueFeedPost(post: Post): boolean {
  return post.label === 'rescue' || post.tag === 'rescue';
}

export function filterRescueFeedPosts(
  posts: Post[],
  opts: {
    filters?: Partial<RescueFilters>;
    postIdToCaseId?: Map<string, string>;
    visibleCaseIds?: Set<string>;
    dedupeAgainstCases?: boolean;
  },
): Post[] {
  const filters = { ...DEFAULT_RESCUE_FILTERS, ...opts.filters };
  const { postIdToCaseId, visibleCaseIds, dedupeAgainstCases = false } = opts;

  return posts.filter(post => {
    if (!isRescueFeedPost(post)) return false;
    if (filters.scope === 'nearby' && !isNearbyRescueLocation(post.loc)) return false;
    if (dedupeAgainstCases && postIdToCaseId && visibleCaseIds) {
      const linkedCaseId = postIdToCaseId.get(post.id);
      if (linkedCaseId && visibleCaseIds.has(linkedCaseId)) return false;
    }
    return true;
  });
}
