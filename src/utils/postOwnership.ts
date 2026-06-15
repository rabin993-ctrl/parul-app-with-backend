import type { Post } from '../data/mockData';

/** True when the signed-in user authored the post (directly or via their companion). */
export function isOwnFeedPost(
  post: Post,
  userId: string | undefined,
  myCompanionIds?: Iterable<string>,
): boolean {
  if (!userId) return false;
  if (post.userId === userId) return true;
  if (post.companionAuthorId) {
    const ids = myCompanionIds instanceof Set
      ? myCompanionIds
      : new Set(myCompanionIds ?? []);
    return ids.has(post.companionAuthorId);
  }
  return false;
}
