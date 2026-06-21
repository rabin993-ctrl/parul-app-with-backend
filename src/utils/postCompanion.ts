import type { Post } from '../data/mockData';

/** Whether a feed post is authored as or tagged with the given companion. */
export function postReferencesCompanion(post: Post, companionId: string): boolean {
  return post.companionAuthorId === companionId
    || post.companions.some(id => id === companionId);
}

/** Human profile Posts tab — user-authored feed posts, not posts made AS a companion. */
export function isUserProfileFeedPost(post: Post, userId: string): boolean {
  return post.userId === userId && !post.companionAuthorId && !post.circle;
}

/** Companion profile Posts/Gallery — authored as this companion, not merely tagged on a user post. */
export function isCompanionAuthoredPost(post: Post, companionId: string): boolean {
  return post.companionAuthorId === companionId;
}

export function filterCompanionAuthoredPosts(posts: Post[], companionId: string): Post[] {
  return posts.filter(p => isCompanionAuthoredPost(p, companionId));
}
