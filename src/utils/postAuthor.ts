import type { Post, Companion, User } from '../data/mockData';
import type { CommunityPost } from '../data/communityPosts';

export type PostPoster =
  | { type: 'user'; user: User; companions?: Array<{ id: string; name: string }> }
  | { type: 'companion'; companion: Companion; owner: User };

export function getPostPoster(post: Post, companionLookup?: (id: string) => Companion | null): PostPoster {
  const user = {
    id: post.userId,
    name: post.authorName ?? post.author,
    tint: post.authorTint ?? '#888888',
    avatarUrl: post.authorAvatarUrl,
    avatarFallbackUrl: post.authorAvatarFallbackUrl,
  } as unknown as User;

  if (post.companionAuthorId) {
    const ctx = companionLookup?.(post.companionAuthorId);
    const companion = ctx ?? ({
      id: post.companionAuthorId,
      name: post.companionAuthorName ?? post.companionName ?? 'Pet',
      tint: post.companionAuthorTint ?? '#14A697',
      avatarUrl: post.companionAuthorAvatarUrl,
      avatarFallbackUrl: post.companionAuthorAvatarFallbackUrl,
      species: 'unknown', icon: 'paw', breed: '', age: '', gender: '',
      owner: user.name, ownerId: post.userId, traits: [],
      vaccinated: false, neutered: false, microchipped: false, about: '',
    } as Companion);
    return { type: 'companion', companion, owner: user };
  }

  // Show "with [companions]" when the user tagged companions but didn't post AS one.
  if (post.companions.length > 0) {
    const names = post.companionNames ?? (post.companionName ? [post.companionName] : []);
    if (names.length > 0) {
      const companions = post.companions
        .map((id, i) => ({ id, name: names[i] ?? names[0] }))
        .filter((_, i) => i < names.length);
      return { type: 'user', user, companions };
    }
  }

  return { type: 'user', user };
}

export function getOwnerCompanionIds(_ownerId: string): string[] {
  return [];
}

export function getDefaultCompanionIdsForOwner(_ownerId: string): string[] {
  return [];
}

export function getCommunityPostCompanion(_post: CommunityPost): Companion | undefined {
  return undefined;
}

export function collectPostAuthorUserIds(posts: Array<{ userId: string }>): string[] {
  return [...new Set(posts.map(post => post.userId).filter(Boolean))];
}

export function getAuthorCompanionLabel(_userId: string, fallbackName = 'user'): string {
  return fallbackName;
}
