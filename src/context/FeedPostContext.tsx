import React, {
  createContext, useCallback, useContext, useMemo, useState,
} from 'react';
import { posts as seedPosts, Post } from '../data/mockData';
import { PostComposer, PostComposerOptions } from '../components/feed/PostComposer';
import { RescueOpenCaseModal } from '../navigation/RescueOpenCaseModal';
import { Toast, ToastData } from '../components/ui/Toast';

const SEED_POST_IDS = new Set(seedPosts.map(p => p.id));

export type { PostComposerOptions };

type FeedPostContextValue = {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  addPost: (post: Post) => void;
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
  const [toast, setToast] = useState<ToastData | null>(null);

  const addPost = useCallback((post: Post) => {
    setPosts(prev => [post, ...prev]);
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
    addPost,
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
    posts, addPost, getPostsForCompanion, getCompanionPostCount,
    composerOpen, composerOptions, openComposer, closeComposer,
    caseFlowOpen, openCaseFlow, closeCaseFlow,
  ]);

  return (
    <FeedPostContext.Provider value={value}>
      {children}
      {composerOpen && (
        <PostComposer
          visible
          options={composerOptions}
          onClose={closeComposer}
          onSubmit={addPost}
          onToast={setToast}
        />
      )}
      <RescueOpenCaseModal visible={caseFlowOpen} onClose={closeCaseFlow} />
      <Toast data={toast} onHide={() => setToast(null)} />
    </FeedPostContext.Provider>
  );
}

export function useFeedPosts() {
  const ctx = useContext(FeedPostContext);
  if (!ctx) {
    throw new Error('useFeedPosts must be used within FeedPostProvider');
  }
  return ctx;
}
