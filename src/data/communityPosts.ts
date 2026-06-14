
export type CommunityCategory =
  | 'general'
  | 'rescue'
  | 'health'
  | 'lost-found'
  | 'tips'
  | 'events';

export type AuthorProfile = {
  id: string;
  name: string;
  handle: string;
  tint: string | null;
  location?: string | null;
};

export type CommunityReply = {
  id: string;
  userId: string;
  author?: AuthorProfile;
  text: string;
  time: string;
};

export type CommunityThread = {
  id: string;
  userId: string;
  author?: AuthorProfile;
  text: string;
  time: string;
  helpful: number;
  replies: CommunityReply[];
};

export type CommunityAlertMeta = {
  kind: 'lost' | 'found';
  area: string;
  when: string;
  contact?: string;
  looksLike?: string;
};

export type CommunityPost = {
  id: string;
  title: string;
  body: string;
  category: CommunityCategory;
  composerLabel?: CommunityComposerLabel;
  alertMeta?: CommunityAlertMeta;
  authorId: string;
  author?: AuthorProfile;
  /** Attached companions (same as feed post.companions). */
  companionIds?: string[];
  /** Display names of attached companions in order */
  companionNames?: string[];
  communityId: string;
  communityName: string;
  time: string;
  loc: string;
  helpful: number;
  comments: number;
  saved: boolean;
  helpfulByMe: boolean;
  hasImage?: boolean;
  imageTint?: string;
  trendingScore: number;
  threads: CommunityThread[];
};

export const COMMUNITY_CATEGORIES: {
  id: CommunityCategory | 'all';
  label: string;
  icon: string;
  tint: string;
  bg: string;
}[] = [
  { id: 'all', label: 'All', icon: 'communities', tint: '#7C5CBF', bg: '#F0EBFA' },
  { id: 'general', label: 'General', icon: 'comment', tint: '#7C5CBF', bg: '#F0EBFA' },
  { id: 'rescue', label: 'Rescue', icon: 'shield', tint: '#E5424F', bg: '#FFE8E8' },
  { id: 'health', label: 'Health', icon: 'medical', tint: '#3B82C4', bg: '#E8F0FA' },
  { id: 'lost-found', label: 'Lost & Found', icon: 'alert', tint: '#C98E2A', bg: '#FDF6E8' },
  { id: 'tips', label: 'Tips', icon: 'sparkle', tint: '#F2972E', bg: '#FDF4E4' },
  { id: 'events', label: 'Events', icon: 'calendar', tint: '#7A5AE0', bg: '#EDE8FC' },
];

export const COMMUNITY_TOPIC_OPTIONS = COMMUNITY_CATEGORIES.filter(c => c.id !== 'all');

/** Feed-aligned composer chips (Adoption excluded — adoption tab only). */
export const COMMUNITY_COMPOSER_TAGS = [
  { id: 'lost', label: 'Lost', icon: 'alert' },
  { id: 'found', label: 'Found', icon: 'check' },
  { id: 'rescue', label: 'Rescue', icon: 'shield' },
  { id: 'meme', label: 'Meme', icon: 'sparkle' },
] as const;

export type CommunityComposerLabel =
  | 'discussion'
  | (typeof COMMUNITY_COMPOSER_TAGS)[number]['id'];

export function composerLabelToCategory(label: CommunityComposerLabel): CommunityCategory {
  switch (label) {
    case 'lost':
    case 'found':
      return 'lost-found';
    case 'rescue':
      return 'rescue';
    default:
      return 'general';
  }
}

export function categoryToComposerLabel(category: CommunityCategory): CommunityComposerLabel {
  if (category === 'rescue') return 'rescue';
  if (category === 'lost-found') return 'lost';
  return 'discussion';
}

export const COMMUNITY_COMPOSER_LABEL_META: Record<
  CommunityComposerLabel,
  { label: string; icon: string; tint: string; bg: string }
> = {
  discussion: { label: 'Discussion', icon: 'comment', tint: '#7C5CBF', bg: '#F0EBFA' },
  lost: { label: 'Lost', icon: 'alert', tint: '#C98E2A', bg: '#FDF6E8' },
  found: { label: 'Found', icon: 'check', tint: '#2FA46A', bg: '#E8F8F0' },
  rescue: { label: 'Rescue', icon: 'shield', tint: '#E5424F', bg: '#FFE8E8' },
  meme: { label: 'Meme', icon: 'sparkle', tint: '#F2972E', bg: '#FDF4E4' },
};

export const COMMUNITY_FILTER_TOPIC_OPTIONS: {
  id: CommunityComposerLabel;
  label: string;
  icon: string;
  tint: string;
  bg: string;
}[] = [
  { id: 'discussion', ...COMMUNITY_COMPOSER_LABEL_META.discussion },
  ...COMMUNITY_COMPOSER_TAGS.map(tag => ({
    id: tag.id,
    ...COMMUNITY_COMPOSER_LABEL_META[tag.id],
  })),
];

export function getPostComposerLabel(post: CommunityPost): CommunityComposerLabel {
  return post.composerLabel ?? categoryToComposerLabel(post.category);
}

export function getCommunityPostLabelMeta(post: CommunityPost) {
  return COMMUNITY_COMPOSER_LABEL_META[getPostComposerLabel(post)];
}

export function buildCommunityPostFromComposer(input: {
  title: string;
  body: string;
  label: CommunityComposerLabel;
  destination: { id: string; name: string };
  authorId: string;
  loc: string;
  companionIds?: string[];
  companionNames?: string[];
  hasPhoto?: boolean;
  imageTint?: string;
  alertMeta?: CommunityAlertMeta;
}): CommunityPost {
  return {
    id: `cp-${Date.now()}`,
    title: input.title.trim(),
    body: input.body.trim(),
    category: composerLabelToCategory(input.label),
    composerLabel: input.label,
    alertMeta: input.alertMeta,
    authorId: input.authorId,
    companionIds: input.companionIds?.length ? input.companionIds : undefined,
    companionNames: input.companionNames?.length ? input.companionNames : undefined,
    communityId: input.destination.id,
    communityName: input.destination.name,
    time: 'Just now',
    loc: input.loc,
    helpful: 0,
    comments: 0,
    saved: false,
    helpfulByMe: false,
    hasImage: input.hasPhoto,
    imageTint: input.imageTint,
    trendingScore: 40,
    threads: [],
  };
}

export type CommunityFeedFilter = {
  groupId: string | 'all';
  /** Empty = all topics. Otherwise match any selected label. */
  topics: CommunityComposerLabel[];
};

export const DEFAULT_COMMUNITY_FILTER: CommunityFeedFilter = {
  groupId: 'all',
  topics: [],
};

export const COMMUNITY_RULES = [
  'Be kind — we\'re all here for the animals.',
  'Share accurate health and safety info; cite sources when you can.',
  'No buying, selling, or breeding posts.',
  'Lost & Found posts need location and a clear photo when possible.',
  'Keep discussions respectful and on-topic for pet welfare.',
];

export const DEMO_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'cp1',
    title: 'Best indie-friendly vets in Dhanmondi?',
    body: 'Looking for a calm clinic for my nervous rescue. Bonus if they do house calls for seniors.',
    category: 'health',
    authorId: 'priya',
    companionIds: ['mochi'],
    communityId: 'c1',
    communityName: 'Dhaka Indie Lovers',
    time: '2h',
    loc: 'Dhanmondi',
    helpful: 24,
    comments: 3,
    saved: false,
    helpfulByMe: false,
    hasImage: true,
    trendingScore: 88,
    threads: [
      { id: 't1', userId: 'dev', text: 'PawsCare on Satmasjid Rd — they specialize in anxious dogs.', time: '1h', helpful: 8, replies: [] },
      { id: 't2', userId: 'omar', text: 'Second PawsCare. Dr. Chowdhury is wonderful with rescues.', time: '45m', helpful: 5, replies: [
        { id: 'r1', userId: 'priya', text: 'Thank you! Booking a consult.', time: '30m' },
      ]},
    ],
  },
  {
    id: 'cp2',
    title: 'Found a friendly tabby near the lake',
    body: 'No collar, seems well-fed but shy. Keeping her safe in a spare room until we find the owner. DM if you recognise her.',
    category: 'lost-found',
    composerLabel: 'found',
    authorId: 'priya',
    companionIds: ['mochi'],
    communityId: 'c1',
    communityName: 'Dhaka Indie Lovers',
    time: '4h',
    loc: 'Dhanmondi',
    helpful: 41,
    comments: 0,
    saved: true,
    helpfulByMe: true,
    hasImage: true,
    imageTint: '#7A5AE0',
    trendingScore: 120,
    threads: [],
  },
  {
    id: 'cp3',
    title: 'Pepper found her forever home 🐾',
    body: 'After 3 months of fostering, Pepper was adopted yesterday. Sharing in case anyone remembers her storm-drain rescue story.',
    category: 'general',
    authorId: 'dev',
    companionIds: ['pepper'],
    communityId: 'c4',
    communityName: 'Foster Network Dhaka',
    time: '6h',
    loc: 'Uttara',
    helpful: 186,
    comments: 1,
    saved: false,
    helpfulByMe: false,
    hasImage: true,
    imageTint: '#E0503F',
    trendingScore: 210,
    threads: [
      { id: 't3', userId: 'sam', text: 'So happy for Pepper! You’re a star foster.', time: '5h', helpful: 22, replies: [] },
    ],
  },
  {
    id: 'cp4',
    title: 'Morning walk group — Sat 7am Dhanmondi Lake path',
    body: 'Weekly social walk for friendly dogs. Leashes required, treats optional. Newcomers welcome!',
    category: 'events',
    authorId: 'omar',
    companionIds: ['rocky'],
    communityId: 'c1',
    communityName: 'Dhaka Indie Lovers',
    time: '8h',
    loc: 'Dhanmondi',
    helpful: 28,
    comments: 0,
    saved: false,
    helpfulByMe: false,
    hasImage: true,
    trendingScore: 65,
    threads: [],
  },
  {
    id: 'cp5',
    title: 'How to introduce a new cat to a resident dog?',
    body: 'We’re fostering a kitten for two weeks. Rocky is curious but intense. Any slow-intro tips that worked for you?',
    category: 'tips',
    authorId: 'lena',
    companionIds: ['coco'],
    communityId: 'c3',
    communityName: 'Cat Behaviour & Care',
    time: '12h',
    loc: 'Banani',
    helpful: 52,
    comments: 0,
    saved: false,
    helpfulByMe: false,
    hasImage: true,
    trendingScore: 74,
    threads: [],
  },
  {
    id: 'cp6',
    title: 'Street pup with limp — need transport volunteer',
    body: 'Spotted near Mirpur Section 10. Can cover vet costs but need someone with a car this evening.',
    category: 'rescue',
    composerLabel: 'rescue',
    authorId: 'sam',
    companionIds: ['bruno'],
    communityId: 'c4',
    communityName: 'Foster Network Dhaka',
    time: '1d',
    loc: 'Mirpur',
    helpful: 97,
    comments: 1,
    saved: false,
    helpfulByMe: false,
    hasImage: true,
    trendingScore: 145,
    threads: [
      { id: 't4', userId: 'you', text: 'I can help after 6pm — DMing you.', time: '20h', helpful: 14, replies: [] },
    ],
  },
  {
    id: 'cp7',
    title: 'What do you wish new pet parents knew?',
    body: 'Open thread for gentle advice we wish we’d heard earlier. No judgement, just learnings.',
    category: 'general',
    authorId: 'you',
    companionIds: ['max'],
    communityId: 'c2',
    communityName: 'Senior Pet Care Circle',
    time: '2d',
    loc: 'Dhanmondi',
    helpful: 63,
    comments: 0,
    saved: true,
    helpfulByMe: false,
    hasImage: true,
    trendingScore: 55,
    threads: [],
  },
];

export function getCategoryMeta(id: CommunityCategory) {
  return COMMUNITY_CATEGORIES.find(c => c.id === id) ?? COMMUNITY_CATEGORIES[1];
}

export function formatCommunityFilterSummary(
  filter: CommunityFeedFilter,
  groupName?: string,
): string {
  const groupLabel = filter.groupId === 'all'
    ? 'All groups'
    : (groupName ?? 'Group');
  const topicLabel = filter.topics.length === 0
    ? 'All topics'
    : filter.topics.map(t => COMMUNITY_COMPOSER_LABEL_META[t]?.label ?? t).join(', ');
  if (filter.groupId === 'all' && filter.topics.length === 0) return 'All groups · All topics';
  return `${groupLabel} · ${topicLabel}`;
}

export function filterCommunityPosts(
  posts: CommunityPost[],
  opts: {
    filter?: CommunityFeedFilter;
    joinedGroupIds?: string[];
    query?: string;
  },
): CommunityPost[] {
  let out = posts;

  if (opts.joinedGroupIds?.length) {
    out = out.filter(p => opts.joinedGroupIds!.includes(p.communityId));
  }

  const f = opts.filter ?? DEFAULT_COMMUNITY_FILTER;
  if (f.groupId !== 'all') {
    out = out.filter(p => p.communityId === f.groupId);
  }
  if (f.topics.length > 0) {
    out = out.filter(p => f.topics.includes(getPostComposerLabel(p)));
  }

  const q = opts.query?.trim().toLowerCase();
  if (q) {
    out = out.filter(p =>
      p.title.toLowerCase().includes(q)
      || p.body.toLowerCase().includes(q)
      || p.communityName.toLowerCase().includes(q)
    );
  }
  return out;
}

export function getCommunityPost(id: string, posts: CommunityPost[]) {
  return posts.find(p => p.id === id) ?? null;
}
