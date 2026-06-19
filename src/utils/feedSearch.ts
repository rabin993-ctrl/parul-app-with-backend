import type { Post } from '../data/mockData';
import type { AdoptionListing } from '../data/adoptionData';
import type { RescueCase } from '../data/profileData';
import type { PawCircle } from '../data/pawCircles';
import type { Community } from '../data/mockData';
import { matchesSearchTokens, parseSearchTokens } from './textSearch';
import { searchCircles, searchCommunities } from './destinationSearch';

export type SearchUserResult = {
  id: string;
  name: string;
  handle?: string;
  tint?: string;
};

export function filterFeedPostsByQuery(posts: Post[], query: string): Post[] {
  const tokens = parseSearchTokens(query);
  if (tokens.length === 0) return [];

  return posts.filter(post => {
    const threadText = post.threads.flatMap(t => [
      t.text,
      ...t.replies.map(r => r.text),
    ]);
    return matchesSearchTokens([
      post.text,
      post.loc,
      post.author,
      post.authorName,
      post.userId,
      post.companionName,
      post.companionAuthorName,
      ...(post.companionNames ?? []),
      post.label,
      post.tag,
      post.lost?.area,
      post.lost?.lastSeen,
      post.found?.area,
      post.found?.looksLike,
      ...threadText,
    ], tokens);
  });
}

export function filterAdoptionListingsByQuery(
  listings: AdoptionListing[],
  query: string,
): AdoptionListing[] {
  const tokens = parseSearchTokens(query);
  if (tokens.length === 0) return [];

  return listings.filter(listing => matchesSearchTokens([
    listing.name,
    listing.breed,
    listing.location,
    listing.loc,
    listing.personality,
    listing.story,
    listing.about,
    listing.posterName,
    listing.posterHandle,
    listing.owner,
    listing.userId,
    listing.species,
    listing.healthNotes,
    listing.gender,
    listing.age,
    ...listing.requirements,
  ], tokens));
}

export function filterRescueCasesByQuery(cases: RescueCase[], query: string): RescueCase[] {
  const tokens = parseSearchTokens(query);
  if (tokens.length === 0) return [];

  return cases.filter(item => matchesSearchTokens([
    item.name,
    item.headline,
    item.story,
    item.location,
    item.caseId,
    item.species,
    item.status,
    ...(item.tags ?? []),
  ], tokens));
}

export function filterUsersByQuery(users: SearchUserResult[], query: string): SearchUserResult[] {
  const tokens = parseSearchTokens(query);
  if (tokens.length === 0) return [];

  const seen = new Set<string>();
  const out: SearchUserResult[] = [];
  for (const user of users) {
    if (seen.has(user.id)) continue;
    if (!matchesSearchTokens([user.name, user.handle, user.id], tokens)) continue;
    seen.add(user.id);
    out.push(user);
  }
  return out;
}

export function collectUsersFromPosts(posts: Post[]): SearchUserResult[] {
  const byId = new Map<string, SearchUserResult>();
  for (const post of posts) {
    if (!post.userId || byId.has(post.userId)) continue;
    byId.set(post.userId, {
      id: post.userId,
      name: post.authorName ?? post.author,
      handle: post.authorName ? post.author : post.author,
      tint: post.authorTint,
    });
  }
  return [...byId.values()];
}

export function searchCirclesByQuery(circles: PawCircle[], query: string): PawCircle[] {
  const tokens = parseSearchTokens(query);
  if (tokens.length === 0) return [];
  return searchCircles(circles, query).filter(circle => matchesSearchTokens([
    circle.name,
    circle.location,
    circle.tagline,
    circle.bio,
    ...(circle.tags ?? []),
  ], tokens));
}

export function searchCommunitiesByQuery(communities: Community[], query: string): Community[] {
  const tokens = parseSearchTokens(query);
  if (tokens.length === 0) return [];
  return searchCommunities(communities, query).filter(community => matchesSearchTokens([
    community.name,
    community.about,
    community.members,
  ], tokens));
}
