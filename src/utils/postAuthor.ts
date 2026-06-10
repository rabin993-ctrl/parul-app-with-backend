import { companions, users, Post, Companion, User } from '../data/mockData';

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
