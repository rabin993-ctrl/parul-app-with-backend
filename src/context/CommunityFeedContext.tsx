import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { registerDevReset } from '../dev/devResetRegistry';
import {
  DEMO_COMMUNITY_POSTS,
  CommunityPost,
  CommunityThread,
} from '../data/communityPosts';
import { countCommunityThreadComments } from '../utils/postComments';

type CommunityFeedContextValue = {
  posts: CommunityPost[];
  savedPosts: CommunityPost[];
  toggleHelpful: (postId: string) => void;
  toggleSaved: (postId: string) => boolean;
  addComment: (
    postId: string,
    text: string,
    opts?: { userId?: string; replyToThreadId?: string },
  ) => void;
  addPost: (post: CommunityPost) => void;
  updatePost: (postId: string, patch: Partial<CommunityPost>) => void;
};

const CommunityFeedContext = createContext<CommunityFeedContextValue | null>(null);

export function CommunityFeedProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<CommunityPost[]>(DEMO_COMMUNITY_POSTS);

  const resetDevState = useCallback(() => {
    setPosts(DEMO_COMMUNITY_POSTS);
  }, []);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

  const toggleHelpful = useCallback((postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const on = !p.helpfulByMe;
      return {
        ...p,
        helpfulByMe: on,
        helpful: Math.max(0, p.helpful + (on ? 1 : -1)),
      };
    }));
  }, []);

  const savedPosts = useMemo(
    () => posts.filter(p => p.saved),
    [posts],
  );

  const toggleSaved = useCallback((postId: string) => {
    let nowSaved = false;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      nowSaved = !p.saved;
      return { ...p, saved: nowSaved };
    }));
    return nowSaved;
  }, []);

  const addComment = useCallback((
    postId: string,
    text: string,
    opts?: { userId?: string; replyToThreadId?: string },
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userId = opts?.userId ?? 'you';

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;

      let threads: CommunityThread[];
      if (opts?.replyToThreadId) {
        threads = p.threads.map(t => (
          t.id === opts.replyToThreadId
            ? {
              ...t,
              replies: [
                ...t.replies,
                { id: `r-${Date.now()}`, userId, text: trimmed, time: 'Just now' },
              ],
            }
            : t
        ));
      } else {
        const thread: CommunityThread = {
          id: `t-${Date.now()}`,
          userId,
          text: trimmed,
          time: 'Just now',
          helpful: 0,
          replies: [],
        };
        threads = [...p.threads, thread];
      }

      return {
        ...p,
        threads,
        comments: countCommunityThreadComments(threads),
      };
    }));
  }, []);

  const addPost = useCallback((post: CommunityPost) => {
    setPosts(prev => [post, ...prev]);
  }, []);

  const updatePost = useCallback((postId: string, patch: Partial<CommunityPost>) => {
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, ...patch } : p)));
  }, []);

  const value = useMemo(
    () => ({
      posts,
      savedPosts,
      toggleHelpful,
      toggleSaved,
      addComment,
      addPost,
      updatePost,
    }),
    [posts, savedPosts, toggleHelpful, toggleSaved, addComment, addPost, updatePost],
  );

  return (
    <CommunityFeedContext.Provider value={value}>
      {children}
    </CommunityFeedContext.Provider>
  );
}

export function useCommunityFeed() {
  const ctx = useContext(CommunityFeedContext);
  if (!ctx) throw new Error('useCommunityFeed must be used within CommunityFeedProvider');
  return ctx;
}
