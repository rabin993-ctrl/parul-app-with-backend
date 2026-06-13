import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { registerDevReset } from '../dev/devResetRegistry';
import type { Post } from '../data/mockData';
import { countFeedThreadComments } from '../utils/postComments';
import { PostComposer, PostComposerOptions } from '../components/feed/PostComposer';
import { RescueOpenCaseModal } from '../navigation/RescueOpenCaseModal';
import { Toast, ToastData } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useCurrentUserProfile } from './CurrentUserProfileContext';
import { useFeedQuery } from '../hooks/useFeedQuery';
import { usePostComments } from '../hooks/usePostComments';
import { useNotificationWriter } from '../hooks/useNotificationWriter';

export type { PostComposerOptions };

type FeedPostContextValue = {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  savedPosts: Post[];
  toggleSaved: (postId: string) => boolean;
  addPost: (post: Post) => void;
  addComment: (postId: string, text: string, opts?: { userId?: string; replyToThreadIndex?: number }) => void;
  getPostsForCompanion: (companionId: string) => Post[];
  getCompanionPostCount: (companionId: string, baseCount?: number) => number;
  composerOpen: boolean;
  composerOptions: PostComposerOptions;
  openComposer: (options?: PostComposerOptions) => void;
  closeComposer: () => void;
  caseFlowOpen: boolean;
  openCaseFlow: () => void;
  closeCaseFlow: () => void;
};

const FeedPostContext = createContext<FeedPostContextValue | null>(null);

const EMPTY_OPTIONS: PostComposerOptions = {};

export function FeedPostProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { me } = useCurrentUserProfile();
  const { posts, setPosts, reload } = useFeedQuery();
  const { insertComment } = usePostComments();
  const { notifyComment } = useNotificationWriter();

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerOptions, setComposerOptions] = useState<PostComposerOptions>(EMPTY_OPTIONS);
  const [caseFlowOpen, setCaseFlowOpen] = useState(false);

  const resetDevState = useCallback(() => {
    setComposerOpen(false);
    setComposerOptions(EMPTY_OPTIONS);
    setCaseFlowOpen(false);
    reload();
  }, [reload]);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

  const savedPosts = useMemo(
    () => posts.filter(p => p.saved),
    [posts],
  );

  const toggleSaved = useCallback((postId: string): boolean => {
    if (!user) return false;
    let nowSaved = false;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      nowSaved = !p.saved;
      return { ...p, saved: nowSaved };
    }));
    if (nowSaved) {
      supabase.from('post_saves')
        .insert({ post_id: postId, user_id: user.id })
        .then(({ error }) => {
          if (error) setPosts(prev => prev.map(p => p.id === postId ? { ...p, saved: false } : p));
        });
    } else {
      supabase.from('post_saves')
        .delete().eq('post_id', postId).eq('user_id', user.id)
        .then(({ error }) => {
          if (error) setPosts(prev => prev.map(p => p.id === postId ? { ...p, saved: true } : p));
        });
    }
    return nowSaved;
  }, [user, setPosts]);

  const addPost = useCallback((post: Post) => {
    if (!user) return;

    const optimisticId = post.id;
    const realPost: Post = {
      ...post,
      userId: user.id,
      author: me.handle ?? me.name ?? post.author,
      threads: [],
    };
    setPosts(prev => [realPost, ...prev]);

    (async () => {
      const { data: postRow, error: postErr } = await supabase
        .from('posts')
        .insert({
          author_user_id: user.id,
          companion_author_id: post.companionAuthorId ?? null,
          text: post.text,
          tag: post.tag ?? null,
          label: post.label ?? null,
          is_circle: post.circle,
          circle_id: post.circleId ?? null,
          location: post.loc || null,
          adoption_status: post.adoptionStatus ?? null,
        })
        .select('id')
        .single();

      if (postErr || !postRow) {
        setPosts(prev => prev.filter(p => p.id !== optimisticId));
        return;
      }

      const realId = (postRow as { id: string }).id;

      // Insert companion tags
      if (post.companions.length > 0) {
        await supabase.from('post_companions').insert(
          post.companions.map(cid => ({ post_id: realId, companion_id: cid })),
        );
      }

      // Insert alert metadata
      if (post.lost) {
        await supabase.from('post_alerts').insert({
          post_id: realId,
          kind: 'lost',
          area: post.lost.area || null,
          last_seen: post.lost.lastSeen || null,
          phone: post.lost.phone ?? null,
        });
      } else if (post.found) {
        await supabase.from('post_alerts').insert({
          post_id: realId,
          kind: 'found',
          area: post.found.area || null,
          found_at: post.found.foundAt || null,
          looks_like: post.found.looksLike ?? null,
          phone: post.found.phone ?? null,
        });
      }

      // Replace optimistic entry with real ID
      setPosts(prev => prev.map(p => p.id === optimisticId ? { ...realPost, id: realId } : p));
    })();
  }, [user, me, setPosts]);

  const addComment = useCallback((
    postId: string,
    text: string,
    opts?: { userId?: string; replyToThreadIndex?: number },
  ) => {
    const trimmed = text.trim();
    if (!trimmed || !user) return;

    const displayUser = me.handle ?? me.name ?? user.id;
    const now = 'Just now';
    let parentId: string | null = null;

    // Optimistic update — find parent ID from existing thread if replying
    setPosts(prev => {
      const updated = prev.map(p => {
        if (p.id !== postId) return p;
        let threads = p.threads;
        if (opts?.replyToThreadIndex != null && opts.replyToThreadIndex >= 0) {
          const parentThread = p.threads[opts.replyToThreadIndex];
          parentId = parentThread?.id ?? null;
          threads = p.threads.map((t, i) => (
            i === opts.replyToThreadIndex
              ? { ...t, replies: [...t.replies, { user: displayUser, text: trimmed, time: now }] }
              : t
          ));
        } else {
          threads = [
            ...p.threads,
            { user: displayUser, text: trimmed, time: now, replies: [] },
          ];
        }
        return { ...p, threads, comments: countFeedThreadComments(threads) };
      });
      return updated;
    });

    // Async persist
    insertComment(postId, trimmed, parentId).then(commentId => {
      if (!commentId) return;
      // Update the last-added thread/reply entry with the real DB id
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;
        const threads = opts?.replyToThreadIndex != null
          ? p.threads.map((t, i) => {
            if (i !== opts.replyToThreadIndex) return t;
            const replies = [...t.replies];
            const last = replies[replies.length - 1];
            if (last && !last.id) replies[replies.length - 1] = { ...last, id: commentId };
            return { ...t, replies };
          })
          : p.threads.map((t, i) => {
            if (i !== p.threads.length - 1 || t.id) return t;
            return { ...t, id: commentId };
          });
        return { ...p, threads };
      }));
      // Notify the post author (fire-and-forget)
      const postAuthor = posts.find(p => p.id === postId)?.userId;
      if (postAuthor) notifyComment(postId, postAuthor, commentId);
    });
  }, [user, me, insertComment, notifyComment, posts, setPosts]);

  const getPostsForCompanion = useCallback((companionId: string) => {
    return posts.filter(p => p.companions.includes(companionId));
  }, [posts]);

  const getCompanionPostCount = useCallback((companionId: string, baseCount = 0) => {
    const dbCount = posts.filter(p => p.companions.includes(companionId)).length;
    return dbCount || baseCount;
  }, [posts]);

  const openComposer = useCallback((options: PostComposerOptions = {}) => {
    setComposerOptions(options);
    setComposerOpen(true);
  }, []);

  const closeComposer = useCallback(() => {
    setComposerOpen(false);
    setComposerOptions(EMPTY_OPTIONS);
  }, []);

  const openCaseFlow = useCallback(() => setCaseFlowOpen(true), []);
  const closeCaseFlow = useCallback(() => setCaseFlowOpen(false), []);

  const value = useMemo<FeedPostContextValue>(() => ({
    posts,
    setPosts,
    savedPosts,
    toggleSaved,
    addPost,
    addComment,
    getPostsForCompanion,
    getCompanionPostCount,
    composerOpen,
    composerOptions,
    openComposer,
    closeComposer,
    caseFlowOpen,
    openCaseFlow,
    closeCaseFlow,
  }), [
    posts, setPosts, savedPosts, toggleSaved, addPost, addComment,
    getPostsForCompanion, getCompanionPostCount,
    composerOpen, composerOptions, openComposer, closeComposer,
    caseFlowOpen, openCaseFlow, closeCaseFlow,
  ]);

  return (
    <FeedPostContext.Provider value={value}>
      {children}
    </FeedPostContext.Provider>
  );
}

/** Render inside AdoptionProvider — PostComposer uses Avatar → useAdoption(). */
export function FeedPostOverlays() {
  const {
    composerOpen,
    composerOptions,
    closeComposer,
    addPost,
    caseFlowOpen,
    closeCaseFlow,
  } = useFeedPosts();
  const [toast, setToast] = useState<ToastData | null>(null);

  return (
    <>
      <PostComposer
        visible={composerOpen}
        options={composerOptions}
        onClose={closeComposer}
        onSubmit={addPost}
        onToast={setToast}
      />
      <RescueOpenCaseModal visible={caseFlowOpen} onClose={closeCaseFlow} />
      <Toast data={toast} onHide={() => setToast(null)} />
    </>
  );
}

export function useFeedPosts() {
  const ctx = useContext(FeedPostContext);
  if (!ctx) {
    throw new Error('useFeedPosts must be used within FeedPostProvider');
  }
  return ctx;
}
