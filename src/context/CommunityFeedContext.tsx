import React, {
  createContext, useCallback, useContext, useMemo, useState,
} from 'react';
import {
  DEMO_COMMUNITY_POSTS,
  CommunityPost,
  CommunityThread,
} from '../data/communityPosts';

type CommunityFeedContextValue = {
  posts: CommunityPost[];
  toggleHelpful: (postId: string) => void;
  toggleSaved: (postId: string) => void;
  addComment: (postId: string, text: string, userId?: string) => void;
  addPost: (post: CommunityPost) => void;
  updatePost: (postId: string, patch: Partial<CommunityPost>) => void;
};

const CommunityFeedContext = createContext<CommunityFeedContextValue | null>(null);

export function CommunityFeedProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<CommunityPost[]>(DEMO_COMMUNITY_POSTS);

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

  const toggleSaved = useCallback((postId: string) => {
    setPosts(prev => prev.map(p => (
      p.id === postId ? { ...p, saved: !p.saved } : p
    )));
  }, []);

  const addComment = useCallback((postId: string, text: string, userId = 'you') => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const thread: CommunityThread = {
      id: `t-${Date.now()}`,
      userId,
      text: trimmed,
      time: 'Just now',
      helpful: 0,
      replies: [],
    };
    setPosts(prev => prev.map(p => (
      p.id === postId
        ? { ...p, comments: p.comments + 1, threads: [...p.threads, thread] }
        : p
    )));
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
      toggleHelpful,
      toggleSaved,
      addComment,
      addPost,
      updatePost,
    }),
    [posts, toggleHelpful, toggleSaved, addComment, addPost, updatePost],
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
