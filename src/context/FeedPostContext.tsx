import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { registerDevReset } from '../dev/devResetRegistry';
import type { Post } from '../data/mockData';
import { countFeedThreadComments } from '../utils/postComments';
import { PostComposer, PostComposerOptions } from '../components/feed/PostComposer';
import { AdoptionComposerSheet } from '../components/adoption/AdoptionComposerSheet';
import { RescueOpenCaseModal } from '../navigation/RescueOpenCaseModal';
import { Toast, ToastData } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useCurrentUserProfile } from './CurrentUserProfileContext';
import { useFeedQuery, FEED_SELECT, rowToPost, type DbPostRow } from '../hooks/useFeedQuery';
import { uploadMediaAsset } from '../lib/uploads';
import { usePostComments } from '../hooks/usePostComments';
import { useNotificationWriter } from '../hooks/useNotificationWriter';
import type { ForwardDest } from '../components/ForwardSheet';

export type { PostComposerOptions };

export type AdoptionListingPostInput = {
  name: string;
  personality: string;
  story: string;
  location: string;
  urgent?: boolean;
};

type FeedPostContextValue = {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  savedPosts: Post[];
  toggleSaved: (postId: string) => boolean;
  togglePaw: (postId: string) => void;
  persistForward: (postId: string, dests: ForwardDest[]) => void;
  pawComment: (postId: string, threadIndex: number) => void;
  addPost: (post: Post) => void;
  addAdoptionListingPost: (input: AdoptionListingPostInput) => void;
  addComment: (postId: string, text: string, opts?: { userId?: string; replyToThreadIndex?: number }) => void;
  deletePost: (postId: string) => void;
  getPostsForCompanion: (companionId: string) => Post[];
  getCompanionPostCount: (companionId: string, baseCount?: number) => number;
  composerOpen: boolean;
  composerOptions: PostComposerOptions;
  openComposer: (options?: PostComposerOptions) => void;
  closeComposer: () => void;
  caseFlowOpen: boolean;
  openCaseFlow: () => void;
  closeCaseFlow: () => void;
  adoptionListingOpen: boolean;
  openAdoptionListing: () => void;
  closeAdoptionListing: () => void;
};

const FeedPostContext = createContext<FeedPostContextValue | null>(null);

const EMPTY_OPTIONS: PostComposerOptions = {};

export function FeedPostProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { me } = useCurrentUserProfile();
  const { posts, setPosts, reload } = useFeedQuery();
  const { insertComment } = usePostComments();
  const { notifyComment, notifyLike } = useNotificationWriter();

  // Stable ref so callbacks that don't need to re-create on every post change can still
  // read the current posts list without adding it to their dependency arrays.
  const postsRef = useRef<Post[]>([]);
  postsRef.current = posts;

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerOptions, setComposerOptions] = useState<PostComposerOptions>(EMPTY_OPTIONS);
  const [caseFlowOpen, setCaseFlowOpen] = useState(false);
  const [adoptionListingOpen, setAdoptionListingOpen] = useState(false);

  const resetDevState = useCallback(() => {
    setComposerOpen(false);
    setComposerOptions(EMPTY_OPTIONS);
    setCaseFlowOpen(false);
    reload();
  }, [reload]);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

  // Realtime: receive new posts from other users without manual refresh
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('feed-posts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts', filter: 'is_circle=eq.false' },
        async (payload) => {
          const newId = (payload.new as { id: string }).id;
          // Skip our own posts — already added optimistically in addPost
          if ((payload.new as { author_user_id: string }).author_user_id === user.id) return;
          // Skip if already in feed (dedup)
          if (postsRef.current.some(p => p.id === newId)) return;
          const { data } = await supabase
            .from('posts')
            .select(FEED_SELECT)
            .eq('id', newId)
            .single();
          if (data) {
            const post = rowToPost(data as unknown as DbPostRow, user.id);
            setPosts(prev => prev.some(p => p.id === post.id) ? prev : [post, ...prev]);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, setPosts]);

  const savedPosts = useMemo(
    () => posts.filter(p => p.saved),
    [posts],
  );

  // ── Paw (post reaction) ───────────────────────────────────────────────────

  const togglePaw = useCallback((postId: string) => {
    if (!user) return;
    const current = postsRef.current.find(p => p.id === postId);
    if (!current) return;
    const wasReacted = current.reacted;

    // Optimistic flip
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, reacted: !wasReacted, paws: wasReacted ? p.paws - 1 : p.paws + 1 }
      : p
    ));

    if (wasReacted) {
      supabase.from('post_reactions')
        .delete().eq('post_id', postId).eq('user_id', user.id).eq('kind', 'paw')
        .then(({ error }) => {
          if (error) {
            setPosts(prev => prev.map(p => p.id === postId
              ? { ...p, reacted: true, paws: p.paws + 1 } : p));
          }
        });
    } else {
      supabase.from('post_reactions')
        .insert({ post_id: postId, user_id: user.id, kind: 'paw' })
        .then(({ error }) => {
          if (error) {
            setPosts(prev => prev.map(p => p.id === postId
              ? { ...p, reacted: false, paws: Math.max(0, p.paws - 1) } : p));
          }
        });
      notifyLike(postId, current.userId);
    }
  }, [user, setPosts, notifyLike]);

  // ── Forward (persist each destination) ───────────────────────────────────

  const persistForward = useCallback((postId: string, dests: ForwardDest[]) => {
    if (!user) return;
    for (const dest of dests) {
      supabase.from('post_forwards').insert({
        post_id: postId,
        user_id: user.id,
        destination_type: dest.type,
        destination_id: dest.type !== 'member' ? dest.id : null,
      }).then(() => {});
    }
  }, [user]);

  // ── Comment paw (upsert; no visual toggle state needed for Wave 2) ────────

  const pawComment = useCallback((postId: string, threadIndex: number) => {
    if (!user) return;
    const commentId = postsRef.current.find(p => p.id === postId)?.threads[threadIndex]?.id;
    if (!commentId) return;
    supabase.from('comment_reactions')
      .upsert(
        { comment_id: commentId, user_id: user.id, kind: 'paw' },
        { onConflict: 'comment_id,user_id,kind' },
      )
      .then(() => {});
  }, [user]);

  // ── Save ──────────────────────────────────────────────────────────────────

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

  // ── Create post ───────────────────────────────────────────────────────────

  const addPost = useCallback((post: Post) => {
    if (!user) return;

    const pendingMedia = post._pendingMedia;
    const optimisticId = post.id;
    const realPost: Post = {
      ...post,
      _pendingMedia: undefined,
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

      if (post.companions.length > 0) {
        await supabase.from('post_companions').insert(
          post.companions.map(cid => ({ post_id: realId, companion_id: cid })),
        );
      }

      if (pendingMedia) {
        try {
          const mediaId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          await uploadMediaAsset({
            bucket: 'post-media',
            userId: user.id,
            mediaId,
            localUri: pendingMedia.uri,
            ext: pendingMedia.ext,
            mime: pendingMedia.mime,
            width: pendingMedia.width,
            height: pendingMedia.height,
            bytes: pendingMedia.bytes,
          });
          await supabase.from('post_media').insert({ post_id: realId, idx: 0, media_id: mediaId });
        } catch {
          // media upload failed — post is still created without image
        }
      }

      if (post.lost) {
        await supabase.from('post_alerts').insert({
          post_id: realId, kind: 'lost',
          area: post.lost.area || null, last_seen: post.lost.lastSeen || null, phone: post.lost.phone ?? null,
        });
      } else if (post.found) {
        await supabase.from('post_alerts').insert({
          post_id: realId, kind: 'found',
          area: post.found.area || null, found_at: post.found.foundAt || null,
          looks_like: post.found.looksLike ?? null, phone: post.found.phone ?? null,
        });
      }

      // Re-fetch the full post from DB to confirm all child rows (alerts, companions) persisted
      const { data: confirmedRow } = await supabase
        .from('posts')
        .select(FEED_SELECT)
        .eq('id', realId)
        .single();
      let confirmedPost = confirmedRow
        ? rowToPost(confirmedRow as unknown as DbPostRow, user.id)
        : { ...realPost, id: realId };

      // If the DB didn't echo back alert values (post_alerts insert may have raced),
      // preserve the alert data from the optimistic post so the card doesn't go blank.
      if (post.lost && confirmedPost.lost && !confirmedPost.lost.area && !confirmedPost.lost.lastSeen) {
        confirmedPost = { ...confirmedPost, lost: post.lost };
      }
      if (post.found && confirmedPost.found && !confirmedPost.found.area && !confirmedPost.found.foundAt) {
        confirmedPost = { ...confirmedPost, found: post.found };
      }

      setPosts(prev => prev.map(p => p.id === optimisticId ? confirmedPost : p));
    })();
  }, [user, me, setPosts]);

  const addAdoptionListingPost = useCallback((input: AdoptionListingPostInput) => {
    if (!user) return;
    const intro = input.urgent
      ? `${input.name.trim()} needs a home urgently.`
      : `${input.name.trim()} is looking for a forever home.`;
    const text = [intro, input.personality.trim(), input.story.trim()].filter(Boolean).join(' ');
    addPost({
      id: `p-adopt-${Date.now()}`,
      author: me.handle ?? me.name ?? 'you',
      userId: user.id,
      companions: [],
      time: 'Just now',
      loc: input.location.trim() || me.location || 'Dhaka',
      circle: false,
      text,
      images: 0,
      label: 'adoption',
      tag: 'adoption',
      paws: 0,
      reacted: false,
      comments: 0,
      forwards: 0,
      saved: false,
      threads: [],
    });
  }, [addPost, me.handle, me.location, me.name, user]);

  // ── Comment / reply ───────────────────────────────────────────────────────

  const addComment = useCallback((
    postId: string,
    text: string,
    opts?: { userId?: string; replyToThreadIndex?: number },
  ) => {
    const trimmed = text.trim();
    if (!trimmed || !user) return;

    const now = 'Just now';

    // Read parentId from stable ref BEFORE the optimistic setState so it's available
    // synchronously for the DB insert regardless of React's batching schedule.
    const replyIdx = opts?.replyToThreadIndex ?? -1;
    const parentId: string | null =
      replyIdx >= 0
        ? (postsRef.current.find(p => p.id === postId)?.threads[replyIdx]?.id ?? null)
        : null;

    setPosts(prev => {
      const updated = prev.map(p => {
        if (p.id !== postId) return p;
        let threads = p.threads;
        if (replyIdx >= 0) {
          threads = p.threads.map((t, i) => (
            i === replyIdx
              ? { ...t, replies: [...t.replies, { user: user.id, text: trimmed, time: now }] }
              : t
          ));
        } else {
          threads = [...p.threads, { user: user.id, text: trimmed, time: now, replies: [] }];
        }
        return { ...p, threads, comments: countFeedThreadComments(threads) };
      });
      return updated;
    });

    insertComment(postId, trimmed, parentId).then(commentId => {
      if (!commentId) return;
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
      const postAuthor = postsRef.current.find(p => p.id === postId)?.userId;
      if (postAuthor) notifyComment(postId, postAuthor, commentId);
    });
  }, [user, me, insertComment, notifyComment, setPosts]);

  // ── Companion / count queries ─────────────────────────────────────────────

  const getPostsForCompanion = useCallback((companionId: string) => {
    return posts.filter(p => p.companions.includes(companionId));
  }, [posts]);

  const getCompanionPostCount = useCallback((companionId: string, baseCount = 0) => {
    const dbCount = posts.filter(p => p.companions.includes(companionId)).length;
    return dbCount || baseCount;
  }, [posts]);

  // ── Delete post ──────────────────────────────────────────────────────────

  const deletePost = useCallback((postId: string) => {
    if (!user) return;
    setPosts(prev => prev.filter(p => p.id !== postId));
    supabase.from('posts')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('id', postId)
      .eq('author_user_id', user.id)
      .then(() => {});
  }, [user, setPosts]);

  // ── Composer / overlays ───────────────────────────────────────────────────

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

  const openAdoptionListing = useCallback(() => {
    setComposerOpen(false);
    setComposerOptions(EMPTY_OPTIONS);
    setAdoptionListingOpen(true);
  }, []);

  const closeAdoptionListing = useCallback(() => setAdoptionListingOpen(false), []);

  const value = useMemo<FeedPostContextValue>(() => ({
    posts,
    setPosts,
    savedPosts,
    toggleSaved,
    togglePaw,
    persistForward,
    pawComment,
    addPost,
    addAdoptionListingPost,
    addComment,
    deletePost,
    getPostsForCompanion,
    getCompanionPostCount,
    composerOpen,
    composerOptions,
    openComposer,
    closeComposer,
    caseFlowOpen,
    openCaseFlow,
    closeCaseFlow,
    adoptionListingOpen,
    openAdoptionListing,
    closeAdoptionListing,
  }), [
    posts, setPosts, savedPosts, toggleSaved, togglePaw, persistForward, pawComment,
    addPost, addAdoptionListingPost, addComment, deletePost, getPostsForCompanion, getCompanionPostCount,
    composerOpen, composerOptions, openComposer, closeComposer,
    caseFlowOpen, openCaseFlow, closeCaseFlow,
    adoptionListingOpen, openAdoptionListing, closeAdoptionListing,
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
    composerOpen, composerOptions, closeComposer, addPost,
    addAdoptionListingPost,
    caseFlowOpen, closeCaseFlow,
    adoptionListingOpen, closeAdoptionListing, openAdoptionListing,
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
        onOpenAdoptionListing={openAdoptionListing}
      />
      <AdoptionComposerSheet
        visible={adoptionListingOpen}
        onClose={closeAdoptionListing}
        onToast={setToast}
        onPublished={addAdoptionListingPost}
      />
      <RescueOpenCaseModal visible={caseFlowOpen} onClose={closeCaseFlow} />
      <Toast data={toast} onHide={() => setToast(null)} />
    </>
  );
}

export function useFeedPosts() {
  const ctx = useContext(FeedPostContext);
  if (!ctx) throw new Error('useFeedPosts must be used within FeedPostProvider');
  return ctx;
}
