import { users } from './mockData';

export type CommunityCategory =
  | 'general'
  | 'rescue'
  | 'adoption'
  | 'health'
  | 'lost-found'
  | 'tips'
  | 'events';

export type CommunityReply = {
  id: string;
  userId: string;
  text: string;
  time: string;
};

export type CommunityThread = {
  id: string;
  userId: string;
  text: string;
  time: string;
  helpful: number;
  replies: CommunityReply[];
};

export type CommunityPost = {
  id: string;
  title: string;
  body: string;
  category: CommunityCategory;
  authorId: string;
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
  { id: 'adoption', label: 'Adoption', icon: 'adoption', tint: '#14A697', bg: '#D6F5EE' },
  { id: 'health', label: 'Health', icon: 'medical', tint: '#3B82C4', bg: '#E8F0FA' },
  { id: 'lost-found', label: 'Lost & Found', icon: 'alert', tint: '#C98E2A', bg: '#FDF6E8' },
  { id: 'tips', label: 'Tips', icon: 'sparkle', tint: '#F2972E', bg: '#FDF4E4' },
  { id: 'events', label: 'Events', icon: 'calendar', tint: '#7A5AE0', bg: '#EDE8FC' },
];

export const COMMUNITY_SORTS = [
  { id: 'trending', label: 'Trending' },
  { id: 'newest', label: 'Newest' },
  { id: 'popular', label: 'Popular' },
] as const;

export type CommunitySort = (typeof COMMUNITY_SORTS)[number]['id'];

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
    title: 'Best indie-friendly vets in Bandra?',
    body: 'Looking for a calm clinic for my nervous rescue. Bonus if they do house calls for seniors.',
    category: 'health',
    authorId: 'priya',
    communityId: 'c1',
    communityName: 'Mumbai Indie Lovers',
    time: '2h',
    loc: 'Bandra',
    helpful: 24,
    comments: 11,
    saved: false,
    helpfulByMe: false,
    trendingScore: 88,
    threads: [
      { id: 't1', userId: 'dev', text: 'PawsCare on Hill Rd — they specialize in anxious dogs.', time: '1h', helpful: 8, replies: [] },
      { id: 't2', userId: 'omar', text: 'Second PawsCare. Dr. Mehta is wonderful with rescues.', time: '45m', helpful: 5, replies: [
        { id: 'r1', userId: 'priya', text: 'Thank you! Booking a consult.', time: '30m' },
      ]},
    ],
  },
  {
    id: 'cp2',
    title: 'Found a friendly tabby near the lake',
    body: 'No collar, seems well-fed but shy. Keeping her safe in a spare room until we find the owner. DM if you recognise her.',
    category: 'lost-found',
    authorId: 'priya',
    communityId: 'c1',
    communityName: 'Mumbai Indie Lovers',
    time: '4h',
    loc: 'Dhanmondi',
    helpful: 41,
    comments: 12,
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
    category: 'adoption',
    authorId: 'dev',
    communityId: 'c4',
    communityName: 'Foster Network Mumbai',
    time: '6h',
    loc: 'Powai',
    helpful: 186,
    comments: 34,
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
    title: 'Morning walk group — Sat 7am Bandstand',
    body: 'Weekly social walk for friendly dogs. Leashes required, treats optional. Newcomers welcome!',
    category: 'events',
    authorId: 'omar',
    communityId: 'c1',
    communityName: 'Mumbai Indie Lovers',
    time: '8h',
    loc: 'Bandra',
    helpful: 28,
    comments: 9,
    saved: false,
    helpfulByMe: false,
    trendingScore: 65,
    threads: [],
  },
  {
    id: 'cp5',
    title: 'How to introduce a new cat to a resident dog?',
    body: 'We’re fostering a kitten for two weeks. Rocky is curious but intense. Any slow-intro tips that worked for you?',
    category: 'tips',
    authorId: 'lena',
    communityId: 'c3',
    communityName: 'Cat Behaviour & Care',
    time: '12h',
    loc: 'Colaba',
    helpful: 52,
    comments: 18,
    saved: false,
    helpfulByMe: false,
    trendingScore: 74,
    threads: [],
  },
  {
    id: 'cp6',
    title: 'Street pup with limp — need transport volunteer',
    body: 'Spotted near Juhu circle. Can cover vet costs but need someone with a car this evening.',
    category: 'rescue',
    authorId: 'sam',
    communityId: 'c4',
    communityName: 'Foster Network Mumbai',
    time: '1d',
    loc: 'Juhu',
    helpful: 97,
    comments: 47,
    saved: false,
    helpfulByMe: false,
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
    communityId: 'c2',
    communityName: 'Senior Pet Care Circle',
    time: '2d',
    loc: 'Bandra',
    helpful: 63,
    comments: 26,
    saved: true,
    helpfulByMe: false,
    trendingScore: 55,
    threads: [],
  },
];

export function getCategoryMeta(id: CommunityCategory) {
  return COMMUNITY_CATEGORIES.find(c => c.id === id) ?? COMMUNITY_CATEGORIES[1];
}

export function sortCommunityPosts(posts: CommunityPost[], sort: CommunitySort): CommunityPost[] {
  const copy = [...posts];
  if (sort === 'trending') return copy.sort((a, b) => b.trendingScore - a.trendingScore);
  if (sort === 'popular') return copy.sort((a, b) => b.helpful - a.helpful);
  return copy;
}

export function filterCommunityPosts(
  posts: CommunityPost[],
  opts: { category?: CommunityCategory | 'all'; query?: string },
): CommunityPost[] {
  let out = posts;
  if (opts.category && opts.category !== 'all') {
    out = out.filter(p => p.category === opts.category);
  }
  const q = opts.query?.trim().toLowerCase();
  if (q) {
    out = out.filter(p =>
      p.title.toLowerCase().includes(q)
      || p.body.toLowerCase().includes(q)
      || p.communityName.toLowerCase().includes(q)
      || users[p.authorId]?.name.toLowerCase().includes(q),
    );
  }
  return out;
}

export function getCommunityPost(id: string, posts: CommunityPost[]) {
  return posts.find(p => p.id === id) ?? null;
}
