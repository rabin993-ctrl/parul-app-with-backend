import type { Post, Companion, User } from '../data/mockData';
import type { CommunityPost } from '../data/communityPosts';

export type PostPoster =
  | { type: 'user'; user: User; companions?: Array<{ id: string; name: string }> }
  | { type: 'companion'; companion: Companion; owner: User };

export function getPostPoster(post: Post): PostPoster {
  // Build user from fields populated by the DB join (authorName / authorTint) with the
  // mock handle as the display-name fallback when authorName is absent.
  const user = {
    id: post.userId,
    name: post.authorName ?? post.author,
    tint: post.authorTint ?? '#888888',
    avatarUrl: post.authorAvatarUrl,
  } as unknown as User;

  // Show "with [companions]" when the user tagged companions but didn't post AS one.
  if (!post.companionAuthorId && post.companions.length > 0) {
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

export function getUserDefaultCompanion(_userId: string): Companion | undefined {
  return undefined;
}

export function getAuthorCompanionLabel(_userId: string, fallbackName = 'user'): string {
  return fallbackName;
}
