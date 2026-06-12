export type CirclePrivacy = 'open' | 'request';

export type PawCircle = {
  id: string;
  name: string;
  location: string;
  memberCount: number;
  icon: string;
  tint: string;
  iconBg: string;
  tagline?: string;
  bio?: string;
  tags?: string[];
  privacy?: CirclePrivacy;
};

export type FeedCircleEntry = {
  id: string;
  label: string;
  icon: string;
  tint: string;
  iconBg: string;
};

export const LOCAL_PAW_CIRCLE: PawCircle = {
  id: 'dhanmondi',
  name: 'Dhanmondi Paw Circle',
  location: 'Dhanmondi, Dhaka',
  memberCount: 25,
  icon: 'paw',
  tint: '#F2972E',
  iconBg: '#FFE8CC',
  tagline: 'Pet lovers near you',
};

export const DEFAULT_CREATED_CIRCLE: PawCircle = {
  id: 'paw-circle',
  name: 'Circle 101',
  location: 'Dhanmondi, Dhaka',
  memberCount: 12,
  icon: 'paw',
  tint: '#7C5CBF',
  iconBg: '#F0EBFA',
};

export const EXPLORE_CIRCLES: PawCircle[] = [
  { id: 'cat-parents',    name: 'Cat Parents',          location: 'Banani, Dhaka',   memberCount: 186, icon: 'cat',      tint: '#7A5AE0', iconBg: '#EDE8FC', tagline: 'Tips, meetups & cat care',           tags: ['cats'] },
  { id: 'rabbit-lovers',  name: 'Rabbit Lovers',        location: 'Old Dhaka',     memberCount: 94,  icon: 'dog',      tint: '#14A697', iconBg: '#D6F5EE', tagline: 'Small pet parents unite',            tags: ['dogs'] },
  { id: 'pet-rescue',     name: 'Pet Rescue',           location: 'Uttara, Dhaka',    memberCount: 412, icon: 'adoption', tint: '#D9489A', iconBg: '#FCE4F0', tagline: 'Foster, adopt & volunteer',          tags: ['rescue', 'popular'] },
  { id: 'senior-paws',    name: 'Senior Paws Dhaka',   location: 'Mohammadpur, Dhaka',    memberCount: 128, icon: 'heart',    tint: '#7A5AE0', iconBg: '#EDE8FC', tagline: 'Care for older companions',          tags: ['dogs'] },
  { id: 'bandra-walkers', name: 'Dhanmondi Dog Walkers',   location: 'Dhanmondi, Dhaka',   memberCount: 203, icon: 'mapPin',   tint: '#7C5CBF', iconBg: '#F0EBFA', tagline: 'Morning walks & park playdates',     tags: ['nearby', 'dogs', 'popular'] },
  { id: 'indie-rescue',   name: 'Indie Rescue Network', location: 'Gulshan, Dhaka',  memberCount: 267, icon: 'shield',   tint: '#E5424F', iconBg: '#FFE8E8', tagline: 'Street dog rescue & rehoming',       tags: ['rescue', 'popular'] },
];

export const EXPLORE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'popular', label: 'Popular' },
] as const;

export type ExploreFilterId = typeof EXPLORE_FILTERS[number]['id'];

const CATALOG: Record<string, PawCircle> = {
  [LOCAL_PAW_CIRCLE.id]: LOCAL_PAW_CIRCLE,
  ...Object.fromEntries(EXPLORE_CIRCLES.map(c => [c.id, c])),
};

export function toFeedEntry(circle: PawCircle): FeedCircleEntry {
  return {
    id: circle.id,
    label: circle.name,
    icon: circle.icon,
    tint: circle.tint,
    iconBg: circle.iconBg,
  };
}

export function resolvePawCircle(id: string, created: PawCircle[]): PawCircle | null {
  return created.find(c => c.id === id) ?? CATALOG[id] ?? null;
}

export function allJoinedCircles(joinedIds: string[], created: PawCircle[]): PawCircle[] {
  return joinedIds
    .map(id => resolvePawCircle(id, created))
    .filter((c): c is PawCircle => !!c);
}
