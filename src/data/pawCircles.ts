export type CirclePrivacy = 'open' | 'request';

export type PawCircle = {
  id: string;
  name: string;
  location: string;
  memberCount: number;
  icon: string;
  tint: string;
  iconBg: string;
  avatarUrl?: string;
  avatarFallbackUrl?: string;
  avatarOriginalUrl?: string;
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

export const EXPLORE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'popular', label: 'Popular' },
] as const;

export type ExploreFilterId = typeof EXPLORE_FILTERS[number]['id'];

export function toFeedEntry(circle: PawCircle): FeedCircleEntry {
  return {
    id: circle.id,
    label: circle.name,
    icon: circle.icon,
    tint: circle.tint,
    iconBg: circle.iconBg,
  };
}

export function resolvePawCircle(id: string, circles: PawCircle[]): PawCircle | null {
  return circles.find(c => c.id === id) ?? null;
}
