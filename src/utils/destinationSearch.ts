import type { Community } from '../data/mockData';
import type { PawCircle } from '../data/pawCircles';

export function shortCircleName(name: string) {
  return name.replace(/\s+Paw Circle$/i, '');
}

export function searchCircles(circles: PawCircle[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return circles;
  return circles.filter(
    c => c.name.toLowerCase().includes(q) || shortCircleName(c.name).toLowerCase().includes(q),
  );
}

export function searchCommunities(communities: Community[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return communities;
  return communities.filter(c => c.name.toLowerCase().includes(q));
}

export type CircleMemberSearchResult = { userId: string; circleName: string; circleId: string; name?: string; handle?: string; tint?: string };

// Cross-circle member search requires pre-loaded member data passed in from the caller.
// Returns results filtered by query against the provided member list.
export function searchAllCircleMembers(
  _circles: PawCircle[],
  _query: string,
  preloaded: CircleMemberSearchResult[] = [],
): CircleMemberSearchResult[] {
  const q = _query.trim().toLowerCase();
  if (!q || preloaded.length === 0) return [];
  return preloaded.filter(m =>
    (m.name ?? '').toLowerCase().includes(q)
    || (m.handle ?? '').toLowerCase().includes(q)
    || m.circleName.toLowerCase().includes(q),
  );
}
