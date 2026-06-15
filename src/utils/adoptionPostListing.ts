import type { Post } from '../data/mockData';
import type { AdoptionListing } from '../data/adoptionData';
import { DEMO_ADOPTION_LISTINGS } from '../data/adoptionData';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAdoptionTaggedPost(post: Post): boolean {
  return post.label === 'adoption' || post.tag === 'adoption';
}

function listingPool(
  listings: AdoptionListing[],
  fallback: AdoptionListing[] = DEMO_ADOPTION_LISTINGS,
): AdoptionListing[] {
  const byId = new Map<string, AdoptionListing>();
  for (const l of fallback) byId.set(l.id, l);
  for (const l of listings) byId.set(l.id, l);
  return [...byId.values()];
}

/** Resolve the adoption listing backing a feed post (shared id, explicit link, or name match). */
export function resolveAdoptionListingForPost(
  post: Post,
  listings: AdoptionListing[],
): AdoptionListing | undefined {
  if (!isAdoptionTaggedPost(post)) return undefined;

  const pool = listingPool(listings);

  if (post.adoptionListingId) {
    const linked = pool.find(l => l.id === post.adoptionListingId);
    if (linked) return linked;
  }

  if (UUID_RE.test(post.id)) {
    const bySharedId = pool.find(l => l.id === post.id);
    if (bySharedId) return bySharedId;
  }

  const byPoster = pool.filter(l => l.userId === post.userId);
  for (const listing of byPoster) {
    if (post.text.toLowerCase().includes(listing.name.toLowerCase())) return listing;
  }

  return undefined;
}
