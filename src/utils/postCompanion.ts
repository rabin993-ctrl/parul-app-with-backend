import type { Post } from '../data/mockData';

/** Whether a feed post is authored as or tagged with the given companion. */
export function postReferencesCompanion(post: Post, companionId: string): boolean {
  return post.companionAuthorId === companionId
    || post.companions.some(id => id === companionId);
}
