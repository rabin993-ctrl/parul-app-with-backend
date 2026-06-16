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

  return adoptionListingStubFromPost(post) ?? undefined;
}

function petNameFromAdoptionPost(post: Post): string {
  const introMatch = post.text.match(/^(.+?) (?:needs a home urgently|needs a home|is looking for)/i);
  return post.companionName ?? introMatch?.[1]?.trim() ?? 'Pet';
}

/** Build a browseable listing when a feed post exists without a matching adoption_listings row yet. */
export function adoptionListingStubFromPost(post: Post): AdoptionListing | null {
  if (!isAdoptionTaggedPost(post)) return null;
  const id = post.adoptionListingId ?? (UUID_RE.test(post.id) ? post.id : null);
  if (!id) return null;

  const name = petNameFromAdoptionPost(post);
  const urgent = /urgently/i.test(post.text);

  return {
    id,
    pet: null,
    name,
    species: 'other',
    icon: 'paw',
    breed: 'Mixed',
    age: 'Unknown',
    ageGroup: 'adult',
    gender: 'Female',
    loc: post.loc,
    location: post.loc,
    vacc: 'Partial',
    tint: '#7A5AE0',
    owner: post.userId,
    userId: post.userId,
    urgent,
    status: urgent ? 'Urgent' : 'Available',
    personality: 'Looking for a loving home',
    story: post.text,
    requirements: ['Meet-and-greet required'],
    neutered: false,
    microchipped: false,
    healthNotes: '',
    gallery: post.mediaUrls?.length ? post.mediaUrls : ['#7A5AE0'],
    mediaUrls: post.mediaUrls,
    postedAt: post.time,
    posterName: post.authorName,
  };
}

/** Merge DB listings with adoption feed posts so the hub stays in sync with the feed. */
export function mergeAdoptionHubListings(
  listings: AdoptionListing[],
  feedPosts: Post[],
): AdoptionListing[] {
  const byId = new Map(listings.map(l => [l.id, l]));

  for (const post of feedPosts) {
    if (!isAdoptionTaggedPost(post)) continue;

    const resolved = resolveAdoptionListingForPost(post, [...byId.values()]);
    if (resolved) continue;

    const id = post.adoptionListingId ?? (UUID_RE.test(post.id) ? post.id : null);
    if (!id || byId.has(id)) continue;

    const name = petNameFromAdoptionPost(post);
    const duplicate = [...byId.values()].some(
      l => l.userId === post.userId && l.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) continue;

    const stub = adoptionListingStubFromPost(post);
    if (stub) byId.set(stub.id, stub);
  }

  return [...byId.values()];
}
