import { companions, users, Post, Companion, User } from '../data/mockData';
import type { CommunityPost } from '../data/communityPosts';

export type PostPoster =
  | { type: 'user'; user: User; companion?: Companion }
  | { type: 'companion'; companion: Companion; owner: User };

export function getPostPoster(post: Post): PostPoster {
  if (post.companionAuthorId) {
    const companion = companions[post.companionAuthorId];
    const owner = users[post.userId];
    if (companion && owner) {
      return { type: 'companion', companion, owner };
    }
  }

  const user = users[post.author];
  const companion = post.companions[0] ? companions[post.companions[0]] : undefined;
  return { type: 'user', user, companion };
}

export function getOwnerCompanionIds(ownerId: string): string[] {
  return Object.values(companions).filter(c => c.ownerId === ownerId).map(c => c.id);
}

export function getDefaultCompanionIdsForOwner(ownerId: string): string[] {
  const ids = getOwnerCompanionIds(ownerId);
  return ids.length > 0 ? [ids[0]] : [];
}

export function getCommunityPostCompanion(post: CommunityPost): Companion | undefined {
  const id = post.companionIds?.[0] ?? getDefaultCompanionIdsForOwner(post.authorId)[0];
  if (!id) return undefined;
  const companion = companions[id];
  if (!companion || companion.ownerId !== post.authorId) return undefined;
  return companion;
}

export function getUserDefaultCompanion(userId: string): Companion | undefined {
  const id = getDefaultCompanionIdsForOwner(userId)[0];
  if (!id) return undefined;
  const companion = companions[id];
  if (!companion || companion.ownerId !== userId) return undefined;
  return companion;
}

export function getAuthorCompanionLabel(userId: string, fallbackName = 'user'): string {
  const user = users[userId];
  if (!user) return fallbackName;
  const companion = getUserDefaultCompanion(userId);
  return companion ? `${user.name} with ${companion.name}` : user.name;
}
