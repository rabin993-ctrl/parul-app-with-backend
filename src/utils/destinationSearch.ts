import type { Community } from '../data/mockData';
import { users } from '../data/mockData';
import type { PawCircle } from '../data/pawCircles';
import { getCircleMembers } from '../data/pawCircleChat';

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

export function searchAllCircleMembers(circles: PawCircle[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: { userId: string; circleName: string; circleId: string }[] = [];
  const seen = new Set<string>();
  for (const c of circles) {
    getCircleMembers(c.id, c)
      .filter(m => m.userId !== 'you')
      .forEach(m => {
        const u = users[m.userId];
        if (!u) return;
        const key = `${m.userId}-${c.id}`;
        if (seen.has(key)) return;
        if (
          u.name.toLowerCase().includes(q)
          || u.handle.toLowerCase().includes(q)
          || c.name.toLowerCase().includes(q)
        ) {
          seen.add(key);
          out.push({ userId: m.userId, circleName: c.name, circleId: c.id });
        }
      });
  }
  return out;
}
