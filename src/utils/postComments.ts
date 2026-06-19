import type { Post, PostThread } from '../data/mockData';
import type { CommunityThread } from '../data/communityPosts';

/** Total visible comments = top-level threads + nested replies. */
export function countFeedThreadComments(threads: PostThread[] | null | undefined): number {
  return (threads ?? []).reduce((sum, t) => sum + 1 + (t.replies ?? []).length, 0);
}

export function countCommunityThreadComments(threads: CommunityThread[] | null | undefined): number {
  return (threads ?? []).reduce((sum, t) => sum + 1 + (t.replies ?? []).length, 0);
}

export type UserFeedComment = {
  id: string;
  postId: string;
  postText: string;
  postAuthorId: string;
  text: string;
  time: string;
  isReply: boolean;
  threadIndex: number;
  replyIndex?: number;
};

/** Collect every comment or reply the given user left on feed posts. */
export function collectUserFeedComments(posts: Post[], userId: string): UserFeedComment[] {
  const comments: UserFeedComment[] = [];

  for (const post of posts) {
    (post.threads ?? []).forEach((thread, threadIndex) => {
      if (thread.user === userId) {
        comments.push({
          id: `${post.id}-t${threadIndex}`,
          postId: post.id,
          postText: post.text,
          postAuthorId: post.userId,
          text: thread.text,
          time: thread.time,
          isReply: false,
          threadIndex,
        });
      }
      (thread.replies ?? []).forEach((reply, replyIndex) => {
        if (reply.user === userId) {
          comments.push({
            id: `${post.id}-t${threadIndex}-r${replyIndex}`,
            postId: post.id,
            postText: post.text,
            postAuthorId: post.userId,
            text: reply.text,
            time: reply.time,
            isReply: true,
            threadIndex,
            replyIndex,
          });
        }
      });
    });
  }

  return comments.reverse();
}
