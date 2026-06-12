import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { registerDevReset } from '../dev/devResetRegistry';
import { posts as seedPosts, Post } from '../data/mockData';
import { countFeedThreadComments } from '../utils/postComments';
import { PostComposer, PostComposerOptions } from '../components/feed/PostComposer';
import { RescueOpenCaseModal } from '../navigation/RescueOpenCaseModal';
import { Toast, ToastData } from '../components/ui/Toast';

const SEED_POST_IDS = new Set(seedPosts.map(p => p.id));

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
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerOptions, setComposerOptions] = useState<PostComposerOptions>(EMPTY_OPTIONS);
  const [caseFlowOpen, setCaseFlowOpen] = useState(false);

  const resetDevState = useCallback(() => {
    setPosts(seedPosts);
    setComposerOpen(false);
    setComposerOptions(EMPTY_OPTIONS);
    setCaseFlowOpen(false);
  }, []);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

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

  const addPost = useCallback((post: Post) => {
    setPosts(prev => [post, ...prev]);
  }, []);

  const addComment = useCallback((
    postId: string,
    text: string,
    opts?: { userId?: string; replyToThreadIndex?: number },
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userId = opts?.userId ?? 'you';

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;

      let threads = p.threads;
      if (opts?.replyToThreadIndex != null && opts.replyToThreadIndex >= 0) {
        threads = p.threads.map((t, i) => (
          i === opts.replyToThreadIndex
            ? {
              ...t,
              replies: [...t.replies, { user: userId, text: trimmed, time: 'Just now' }],
            }
            : t
        ));
      } else {
        threads = [
          ...p.threads,
          { user: userId, text: trimmed, time: 'Just now', replies: [] },
        ];
      }

      return {
        ...p,
        threads,
        comments: countFeedThreadComments(threads),
      };
    }));
  }, []);

  const getPostsForCompanion = useCallback((companionId: string) => {
    return posts.filter(p => p.companions.includes(companionId));
  }, [posts]);

  const getCompanionPostCount = useCallback((companionId: string, baseCount = 0) => {
    const added = posts.filter(
      p => p.companions.includes(companionId) && !SEED_POST_IDS.has(p.id),
    ).length;
    return baseCount + added;
  }, [posts]);

  const openComposer = useCallback((options: PostComposerOptions = {}) => {
    setComposerOptions(options);
    setComposerOpen(true);
  }, []);

  const closeComposer = useCallback(() => {
    setComposerOpen(false);
    setComposerOptions(EMPTY_OPTIONS);
  }, []);

  const openCaseFlow = useCallback(() => {
    setCaseFlowOpen(true);
  }, []);

  const closeCaseFlow = useCallback(() => {
    setCaseFlowOpen(false);
  }, []);

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
    posts, savedPosts, toggleSaved, addPost, addComment, getPostsForCompanion, getCompanionPostCount,
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
