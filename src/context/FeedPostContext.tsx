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
import { useFeedQuery, selectFeedRows, rowToPost, fetchSavedFeedPosts, type DbPostRow } from '../hooks/useFeedQuery';
import { uploadMediaAsset } from '../lib/uploads';
import { fanOutPostAlert, resolveAlertCoordinates } from '../lib/alertFanOut';
import { usePostComments } from '../hooks/usePostComments';
import { useNotificationWriter } from '../hooks/useNotificationWriter';
import type { ForwardDest } from '../components/ForwardSheet';
import {
  applyResolvedOverlay,
  loadResolvedAlertIds,
  markPostResolved,
  persistResolvedAlertId,
} from '../lib/alertResolvedStore';

export type { PostComposerOptions };

export type AdoptionListingPostInput = {
  listingId: string;
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
  persistForward: (postId: string, dests: ForwardDest[], postText?: string, postLabel?: string | null) => void;
  pawComment: (postId: string, threadIndex: number) => void;
  addPost: (post: Post) => void;
  addAdoptionListingPost: (input: AdoptionListingPostInput) => void;
  addComment: (postId: string, text: string, opts?: { userId?: string; replyToThreadIndex?: number }) => void;
  deletePost: (postId: string) => void;
  updatePost: (postId: string, post: Post) => void;
  openComposerForEdit: (post: Post) => void;
  resolveAlert: (postId: string) => void;
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
  focusFeedPostId: string | null;
  focusFeedFilters: string[] | null;
  requestFeedPostFocus: (postId: string, options?: { filters?: string[]; post?: Post }) => void;
  clearFeedPostFocus: () => void;
};

const FeedPostContext = createContext<FeedPostContextValue | null>(null);

const EMPTY_OPTIONS: PostComposerOptions = {};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveForwardDestinationId(dest: ForwardDest): string | null {
  if (dest.type === 'circle') {
    return UUID_RE.test(dest.dbId) ? dest.dbId : null;
  }
  if (dest.type === 'community') {
    return UUID_RE.test(dest.id) ? dest.id : null;
  }
  return UUID_RE.test(dest.id) ? dest.id : null;
}

export function FeedPostProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { me } = useCurrentUserProfile();
  const { posts: rawPosts, setPosts, reload: reloadFeed } = useFeedQuery();
  const { insertComment } = usePostComments();
  const { notifyComment, notifyLike } = useNotificationWriter();
  const [resolvedOverlay, setResolvedOverlay] = useState<Set<string>>(() => new Set());
  const deletedPostIdsRef = useRef<Set<string>>(new Set());
  const [deletedRevision, setDeletedRevision] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      deletedPostIdsRef.current.clear();
      setDeletedRevision(v => v + 1);
    }
  }, [user?.id]);

  const reload = useCallback(async () => {
    await reloadFeed();
    setPosts(prev => prev.filter(p => !deletedPostIdsRef.current.has(p.id)));
  }, [reloadFeed, setPosts]);

  useEffect(() => {
    if (!user?.id) {
      setResolvedOverlay(new Set());
      return;
    }
    loadResolvedAlertIds(user.id).then(setResolvedOverlay);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const fromDb = rawPosts
      .filter(p => p.lost?.resolved || p.found?.resolved)
      .map(p => p.id);
    if (fromDb.length === 0) return;
    setResolvedOverlay(prev => {
      const next = new Set(prev);
      let changed = false;
      for (const id of fromDb) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [rawPosts, user?.id]);

  const posts = useMemo(
    () => applyResolvedOverlay(
      rawPosts.filter(p => !deletedPostIdsRef.current.has(p.id)),
      resolvedOverlay,
    ),
    [rawPosts, resolvedOverlay, deletedRevision],
  );

  // Stable ref so callbacks that don't need to re-create on every post change can still
  // read the current posts list without adding it to their dependency arrays.
  const postsRef = useRef<Post[]>([]);
  postsRef.current = posts;
  const savedPostsRef = useRef<Post[]>([]);

  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const savedIdsRef = useRef<Set<string>>(new Set());

  const syncFeedSavedFlags = useCallback((ids: Set<string>) => {
    setPosts(prev => {
      let changed = false;
      const next = prev.map(p => {
        const saved = ids.has(p.id);
        if (p.saved === saved) return p;
        changed = true;
        return { ...p, saved };
      });
      return changed ? next : prev;
    });
  }, [setPosts]);

  const loadSavedPosts = useCallback(async () => {
    if (!user) {
      savedIdsRef.current = new Set();
      setSavedPosts([]);
      savedPostsRef.current = [];
      return;
    }
    const loaded = await fetchSavedFeedPosts(user.id);
    savedIdsRef.current = new Set(loaded.map(p => p.id));
    setSavedPosts(loaded);
    savedPostsRef.current = loaded;
    syncFeedSavedFlags(savedIdsRef.current);
  }, [user, syncFeedSavedFlags]);

  useEffect(() => {
    loadSavedPosts();
  }, [loadSavedPosts]);

  useEffect(() => {
    if (savedIdsRef.current.size === 0) return;
    syncFeedSavedFlags(savedIdsRef.current);
  }, [posts, syncFeedSavedFlags]);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerOptions, setComposerOptions] = useState<PostComposerOptions>(EMPTY_OPTIONS);
  const [caseFlowOpen, setCaseFlowOpen] = useState(false);
  const [adoptionListingOpen, setAdoptionListingOpen] = useState(false);
  const [focusFeedPostId, setFocusFeedPostId] = useState<string | null>(null);
  const [focusFeedFilters, setFocusFeedFilters] = useState<string[] | null>(null);

  const requestFeedPostFocus = useCallback((postId: string, options?: { filters?: string[]; post?: Post }) => {
    if (options?.post && !postsRef.current.some(p => p.id === postId)) {
      setPosts(prev => (prev.some(p => p.id === postId) ? prev : [options.post!, ...prev]));
    }
    setFocusFeedPostId(postId);
    setFocusFeedFilters(options?.filters ?? null);
  }, [setPosts]);

  const clearFeedPostFocus = useCallback(() => {
    setFocusFeedPostId(null);
    setFocusFeedFilters(null);
  }, []);

  const resetDevState = useCallback(() => {
    setComposerOpen(false);
    setComposerOptions(EMPTY_OPTIONS);
    setCaseFlowOpen(false);
    setResolvedOverlay(new Set());
    deletedPostIdsRef.current.clear();
    setDeletedRevision(v => v + 1);
    reload();
    loadSavedPosts();
  }, [reload, loadSavedPosts]);

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
          if (deletedPostIdsRef.current.has(newId)) return;
          // Skip our own posts — already added optimistically in addPost
          if ((payload.new as { author_user_id: string }).author_user_id === user.id) return;
          // Skip if already in feed (dedup)
          if (postsRef.current.some(p => p.id === newId)) return;
          const { data } = await selectFeedRows(select =>
            supabase.from('posts').select(select).eq('id', newId).single(),
          );
          if (data) {
            const post = rowToPost(data as unknown as DbPostRow, user.id);
            setPosts(prev => prev.some(p => p.id === post.id) ? prev : [post, ...prev]);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, setPosts]);

  // Realtime: hydrate/refresh alert details after post_alerts writes complete.
  // New posts can arrive before their alert row is inserted, so we listen to both
  // INSERT and UPDATE and merge the alert payload into the existing card.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('post-alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_alerts' },
        (payload) => {
          const row = payload.new as {
            post_id: string;
            kind?: 'lost' | 'found';
            area?: string | null;
            last_seen?: string | null;
            found_at?: string | null;
            looks_like?: string | null;
            phone?: string | null;
            lat?: number | null;
            lng?: number | null;
            alerted_count?: number;
            resolved?: boolean;
          };
          if (!row?.post_id) return;
          setPosts(prev => prev.map(p => {
            if (p.id !== row.post_id) return p;
            if (p.lost || p.label === 'lost' || row.kind === 'lost') {
              const baseLost = p.lost ?? {
                kind: 'Lost pet',
                area: '',
                lastSeen: '',
                alertedCount: 0,
              };
              return {
                ...p,
                lost: {
                  ...baseLost,
                  area: row.area ?? baseLost.area,
                  lastSeen: row.last_seen ?? baseLost.lastSeen,
                  phone: row.phone ?? baseLost.phone,
                  lat: row.lat ?? baseLost.lat,
                  lng: row.lng ?? baseLost.lng,
                  alertedCount: row.alerted_count ?? baseLost.alertedCount,
                  // Resolved is one-way; ignore stale false from count-only updates.
                  resolved: !!(baseLost.resolved || row.resolved),
                },
              };
            }
            if (p.found || p.label === 'found' || row.kind === 'found') {
              const baseFound = p.found ?? {
                area: '',
                foundAt: '',
                alertedCount: 0,
              };
              return {
                ...p,
                found: {
                  ...baseFound,
                  area: row.area ?? baseFound.area,
                  foundAt: row.found_at ?? baseFound.foundAt,
                  looksLike: row.looks_like ?? baseFound.looksLike,
                  phone: row.phone ?? baseFound.phone,
                  lat: row.lat ?? baseFound.lat,
                  lng: row.lng ?? baseFound.lng,
                  alertedCount: row.alerted_count ?? baseFound.alertedCount,
                  resolved: !!(baseFound.resolved || row.resolved),
                },
              };
            }
            return p;
          }));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, setPosts]);

  // Keep ref in sync for async save handlers.
  useEffect(() => {
    savedPostsRef.current = savedPosts;
  }, [savedPosts]);

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

  const persistForward = useCallback((postId: string, dests: ForwardDest[], postText?: string, postLabel?: string | null) => {
    if (!user || !UUID_RE.test(postId)) return;
    for (const dest of dests) {
      const destinationId = resolveForwardDestinationId(dest);
      supabase.from('post_forwards').insert({
        post_id: postId,
        user_id: user.id,
        destination_type: dest.type,
        destination_id: destinationId,
      }).then(({ error }) => {
        if (error) console.error('[persistForward] post_forwards insert failed:', error.message);
      });

      if (dest.type === 'circle' && dest.dbId) {
        // Share into the circle chat as a shared_post message
        supabase.from('circle_messages').insert({
          circle_id: dest.dbId,
          type: 'shared_post',
          sender_user_id: user.id,
          shared_post_id: postId,
        }).then(() => {});

      } else if (dest.type === 'community') {
        // Share into the community as a new post with the original text
        const body = postText?.trim() || '(shared post)';
        const title = body.length > 80 ? body.slice(0, 77) + '…' : body;
        const category = postLabel === 'lost' || postLabel === 'found' ? 'lost-found' : 'general';
        supabase.from('community_posts').insert({
          community_id: dest.id,
          author_user_id: user.id,
          title,
          body,
          category,
        }).then(() => {});

      } else if (dest.type === 'member') {
        // Find or create a DM thread with this user, then send the post link as a message
        (async () => {
          // Look for an existing DM thread between the two users
          const { data: existing } = await supabase
            .from('thread_participants')
            .select('thread_id, threads!inner(type)')
            .eq('user_id', dest.id)
            .filter('threads.type', 'eq', 'dm');

          let threadId: string | null = null;
          if (existing && existing.length > 0) {
            // Check if the current user is also a participant in one of those threads
            const { data: mine } = await supabase
              .from('thread_participants')
              .select('thread_id')
              .eq('user_id', user.id)
              .in('thread_id', (existing as { thread_id: string }[]).map(r => r.thread_id));
            threadId = (mine as { thread_id: string }[] | null)?.[0]?.thread_id ?? null;
          }

          if (!threadId) {
            // Create a new DM thread
            const { data: newThread } = await supabase
              .from('threads')
              .insert({ type: 'dm' })
              .select('id')
              .single();
            if (!newThread) return;
            threadId = (newThread as { id: string }).id;
            await supabase.from('thread_participants').insert([
              { thread_id: threadId, user_id: user.id },
              { thread_id: threadId, user_id: dest.id },
            ]);
          }

          // Store as a structured shared_post reference so the thread UI can render a card
          await supabase.from('messages').insert({
            thread_id: threadId,
            sender_user_id: user.id,
            kind: 'shared_post',
            post_id: postId,
          } as any);
        })();
      }
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
    const wasSaved = savedIdsRef.current.has(postId);
    const nowSaved = !wasSaved;

    if (nowSaved) savedIdsRef.current.add(postId);
    else savedIdsRef.current.delete(postId);

    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, saved: nowSaved } : p)));

    setSavedPosts(prev => {
      if (!nowSaved) return prev.filter(p => p.id !== postId);
      const existing = prev.find(p => p.id === postId);
      if (existing) return prev;
      const fromFeed = postsRef.current.find(p => p.id === postId);
      if (fromFeed) return [{ ...fromFeed, saved: true }, ...prev];
      return prev;
    });

    const revert = () => {
      if (wasSaved) savedIdsRef.current.add(postId);
      else savedIdsRef.current.delete(postId);
      setPosts(prev => prev.map(p => (p.id === postId ? { ...p, saved: wasSaved } : p)));
      setSavedPosts(prev => {
        if (wasSaved) {
          const fromFeed = postsRef.current.find(p => p.id === postId);
          if (fromFeed && !prev.some(p => p.id === postId)) {
            return [{ ...fromFeed, saved: true }, ...prev];
          }
          return prev;
        }
        return prev.filter(p => p.id !== postId);
      });
    };

    if (nowSaved) {
      supabase.from('post_saves')
        .insert({ post_id: postId, user_id: user.id })
        .then(async ({ error }) => {
          if (error) {
            revert();
            return;
          }
          if (!savedPostsRef.current.some(p => p.id === postId)) {
            const loaded = await fetchSavedFeedPosts(user.id);
            const saved = loaded.find(p => p.id === postId);
            if (saved) {
              setSavedPosts(prev => [saved, ...prev.filter(p => p.id !== postId)]);
            }
          }
        });
    } else {
      supabase.from('post_saves')
        .delete().eq('post_id', postId).eq('user_id', user.id)
        .then(({ error }) => {
          if (error) revert();
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
      authorName: me.name,
      authorTint: me.tint,
      authorAvatarUrl: me.avatarUrl,
      threads: [],
    };
    setPosts(prev => [realPost, ...prev]);

    (async () => {
      const insertPayload: Record<string, unknown> = {
        author_user_id: user.id,
        companion_author_id: post.companionAuthorId ?? null,
        text: post.text,
        tag: post.tag ?? null,
        label: post.label ?? null,
        is_circle: post.circle,
        circle_id: post.circleId ?? null,
        location: post.loc || null,
        adoption_status: post.adoptionStatus ?? null,
      };
      if (UUID_RE.test(optimisticId)) {
        insertPayload.id = optimisticId;
      }

      const { data: postRow, error: postErr } = await supabase
        .from('posts')
        .insert(insertPayload as never)
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
        const { lat: alertLat, lng: alertLng } = await resolveAlertCoordinates(
          post.lost.area,
          post.loc,
          post.lost,
        );

        const { error: alertErr } = await supabase.from('post_alerts').insert({
          post_id: realId,
          kind: 'lost',
          area: post.lost.area || null,
          last_seen: post.lost.lastSeen || null,
          phone: post.lost.phone ?? null,
          lat: alertLat,
          lng: alertLng,
        });
        if (alertErr) {
          console.warn('[FeedPostContext] post_alerts insert failed (lost):', alertErr.message);
        } else {
          // DB trigger also fans out on INSERT; this client call is a backup.
          void fanOutPostAlert(
            realId,
            alertLat != null && alertLng != null ? { lat: alertLat, lng: alertLng } : null,
          );
        }
      } else if (post.found) {
        const { lat: alertLat, lng: alertLng } = await resolveAlertCoordinates(
          post.found.area,
          post.loc,
          post.found,
        );

        const { error: alertErr } = await supabase.from('post_alerts').insert({
          post_id: realId,
          kind: 'found',
          area: post.found.area || null,
          found_at: post.found.foundAt || null,
          looks_like: post.found.looksLike ?? null,
          phone: post.found.phone ?? null,
          lat: alertLat,
          lng: alertLng,
        });
        if (alertErr) {
          console.warn('[FeedPostContext] post_alerts insert failed (found):', alertErr.message);
        } else {
          void fanOutPostAlert(
            realId,
            alertLat != null && alertLng != null ? { lat: alertLat, lng: alertLng } : null,
          );
        }
      }

      // Re-fetch the full post from DB to confirm all child rows (alerts, companions) persisted
      const { data: confirmedRow } = await selectFeedRows(select =>
        supabase.from('posts').select(select).eq('id', realId).single(),
      );
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
      if (post.lost?.resolved && confirmedPost.lost) {
        confirmedPost = { ...confirmedPost, lost: { ...confirmedPost.lost, resolved: true } };
      }
      if (post.found?.resolved && confirmedPost.found) {
        confirmedPost = { ...confirmedPost, found: { ...confirmedPost.found, resolved: true } };
      }
      if (post.adoptionListingId) {
        confirmedPost = { ...confirmedPost, adoptionListingId: post.adoptionListingId };
      }

      setPosts(prev => {
        if (deletedPostIdsRef.current.has(optimisticId)) {
          deletedPostIdsRef.current.add(realId);
          void supabase.rpc('soft_delete_post', { p_post_id: realId });
          return prev;
        }
        if (deletedPostIdsRef.current.has(realId)) return prev;
        return prev.map(p => p.id === optimisticId ? confirmedPost : p);
      });
    })();
  }, [user, me, setPosts]);

  const addAdoptionListingPost = useCallback((input: AdoptionListingPostInput) => {
    if (!user) return;
    const intro = input.urgent
      ? `${input.name.trim()} needs a home urgently.`
      : `${input.name.trim()} is looking for a forever home.`;
    const text = [intro, input.personality.trim(), input.story.trim()].filter(Boolean).join(' ');
    addPost({
      id: input.listingId,
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
      adoptionListingId: input.listingId,
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
    return posts.filter(p => p.companionAuthorId === companionId);
  }, [posts]);

  const getCompanionPostCount = useCallback((companionId: string, baseCount = 0) => {
    const dbCount = posts.filter(p => p.companionAuthorId === companionId).length;
    return dbCount || baseCount;
  }, [posts]);

  // ── Resolve lost alert ────────────────────────────────────────────────────

  const resolveAlert = useCallback((postId: string) => {
    if (!user) return;

    const markResolved = (p: Post): Post => {
      if (p.id !== postId) return p;
      return markPostResolved(p);
    };

    setResolvedOverlay(prev => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
    void persistResolvedAlertId(user.id, postId);

    setPosts(prev => prev.map(markResolved));
    setSavedPosts(prev => prev.map(markResolved));

    (async () => {
      const persistResolved = async (): Promise<boolean> => {
        const { error } = await supabase.rpc('resolve_post_alert', { p_post_id: postId });
        if (!error) return true;

        console.warn('[FeedPostContext] resolve_post_alert failed:', error.message);
        const existing = postsRef.current.find(p => p.id === postId);
        const kind = existing?.label === 'found' ? 'found' : 'lost';
        const { error: upsertErr } = await supabase.from('post_alerts').upsert({
          post_id: postId,
          kind,
          resolved: true,
          area: existing?.lost?.area ?? existing?.found?.area ?? null,
          last_seen: existing?.lost?.lastSeen ?? null,
          found_at: existing?.found?.foundAt ?? null,
          phone: existing?.lost?.phone ?? existing?.found?.phone ?? null,
        } as never, { onConflict: 'post_id' });
        if (upsertErr) {
          console.warn('[FeedPostContext] post_alerts upsert failed:', upsertErr.message);
          return false;
        }
        return true;
      };

      let ok = await persistResolved();
      if (!ok) {
        await new Promise(resolve => setTimeout(resolve, 400));
        ok = await persistResolved();
      }
      if (!ok) return;

      const reinforce = (p: Post): Post => (p.id === postId ? markPostResolved(p) : p);
      setPosts(prev => prev.map(reinforce));
      setSavedPosts(prev => prev.map(reinforce));
    })();
  }, [user, setPosts, setSavedPosts]);

  // ── Delete post ──────────────────────────────────────────────────────────

  const deletePost = useCallback((postId: string) => {
    if (!user) return;

    const snapshot = postsRef.current.find(p => p.id === postId);
    if (!snapshot) return;
    if (snapshot.userId !== user.id) return;

    deletedPostIdsRef.current.add(postId);
    setDeletedRevision(v => v + 1);
    setPosts(prev => prev.filter(p => p.id !== postId));
    setSavedPosts(prev => prev.filter(p => p.id !== postId));
    savedIdsRef.current.delete(postId);

    if (!UUID_RE.test(postId)) return;

    void (async () => {
      let ok = false;

      const { data, error } = await supabase.rpc('soft_delete_post', { p_post_id: postId });
      if (!error) {
        ok = (data as { ok?: boolean } | null)?.ok === true;
      } else if (
        error.code === 'PGRST202'
        || error.message.includes('soft_delete_post')
        || error.message.includes('Could not find the function')
      ) {
        const { error: updErr } = await supabase
          .from('posts')
          .update({ deleted_at: new Date().toISOString() } as never)
          .eq('id', postId)
          .eq('author_user_id', user.id);
        ok = !updErr;
        if (updErr) console.error('[deletePost] update fallback failed:', updErr.message);
      } else {
        console.error('[deletePost] rpc failed:', error.message);
      }

      if (!ok) {
        deletedPostIdsRef.current.delete(postId);
        setDeletedRevision(v => v + 1);
        void reload();
      }
    })();
  }, [user, setPosts, reload]);

  const updatePost = useCallback((postId: string, patch: Post) => {
    if (!user) return;
    const existing = postsRef.current.find(p => p.id === postId);
    if (!existing || existing.userId !== user.id) return;

    const merged: Post = {
      ...existing,
      ...patch,
      id: postId,
      userId: existing.userId,
      paws: existing.paws,
      reacted: existing.reacted,
      comments: existing.comments,
      forwards: existing.forwards,
      saved: existing.saved,
      threads: existing.threads,
      time: existing.time,
      mediaUrls: existing.mediaUrls,
      images: existing.images,
      lost: patch.lost ?? existing.lost
        ? {
          ...(existing.lost ?? {}),
          ...(patch.lost ?? {}),
          resolved: existing.lost?.resolved ?? patch.lost?.resolved ?? false,
        } as Post['lost']
        : undefined,
      found: patch.found ?? existing.found
        ? {
          ...(existing.found ?? {}),
          ...(patch.found ?? {}),
          resolved: existing.found?.resolved ?? patch.found?.resolved ?? false,
        } as Post['found']
        : undefined,
    };

    setPosts(prev => prev.map(p => (p.id === postId ? merged : p)));
    setSavedPosts(prev => prev.map(p => (p.id === postId ? merged : p)));

    (async () => {
      await supabase.from('posts').update({
        text: merged.text,
        tag: merged.tag ?? null,
        label: merged.label ?? null,
        location: merged.loc || null,
        companion_author_id: merged.companionAuthorId ?? null,
      }).eq('id', postId).eq('author_user_id', user.id);

      await supabase.from('post_companions').delete().eq('post_id', postId);
      if (merged.companions.length > 0) {
        await supabase.from('post_companions').insert(
          merged.companions.map(cid => ({ post_id: postId, companion_id: cid })),
        );
      }

      if (merged.lost) {
        const { lat: alertLat, lng: alertLng } = await resolveAlertCoordinates(
          merged.lost.area,
          merged.loc,
          merged.lost,
        );
        const { error: alertErr } = await supabase.from('post_alerts').upsert({
          post_id: postId,
          kind: 'lost',
          area: merged.lost.area || null,
          last_seen: merged.lost.lastSeen || null,
          phone: merged.lost.phone ?? null,
          resolved: merged.lost.resolved ?? false,
          lat: alertLat,
          lng: alertLng,
        } as never);
        if (!alertErr) {
          await fanOutPostAlert(
            postId,
            alertLat != null && alertLng != null ? { lat: alertLat, lng: alertLng } : null,
          );
        }
      } else if (merged.found) {
        const { lat: alertLat, lng: alertLng } = await resolveAlertCoordinates(
          merged.found.area,
          merged.loc,
          merged.found,
        );
        const { error: alertErr } = await supabase.from('post_alerts').upsert({
          post_id: postId,
          kind: 'found',
          area: merged.found.area || null,
          found_at: merged.found.foundAt || null,
          looks_like: merged.found.looksLike ?? null,
          phone: merged.found.phone ?? null,
          resolved: merged.found.resolved ?? false,
          lat: alertLat,
          lng: alertLng,
        } as never);
        if (!alertErr) {
          await fanOutPostAlert(
            postId,
            alertLat != null && alertLng != null ? { lat: alertLat, lng: alertLng } : null,
          );
        }
      }
    })();
  }, [user, setPosts]);

  const openComposerForEdit = useCallback((post: Post) => {
    setComposerOptions({
      editPost: post,
      postAsCompanionId: post.companionAuthorId,
      initialCompanionIds: post.companions,
      initialCategory: post.label ?? (post.tag === 'paw-posting' ? null : post.tag ?? 'discussion'),
    });
    setComposerOpen(true);
  }, []);

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

  const displaySavedPosts = useMemo(
    () => applyResolvedOverlay(savedPosts, resolvedOverlay),
    [savedPosts, resolvedOverlay],
  );

  const value = useMemo<FeedPostContextValue>(() => ({
    posts,
    setPosts,
    savedPosts: displaySavedPosts,
    toggleSaved,
    togglePaw,
    persistForward,
    pawComment,
    addPost,
    addAdoptionListingPost,
    addComment,
    deletePost,
    updatePost,
    openComposerForEdit,
    resolveAlert,
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
    focusFeedPostId,
    focusFeedFilters,
    requestFeedPostFocus,
    clearFeedPostFocus,
  }), [
    posts, setPosts, displaySavedPosts, toggleSaved, togglePaw, persistForward, pawComment,
    addPost, addAdoptionListingPost, addComment, deletePost, updatePost, openComposerForEdit, resolveAlert, getPostsForCompanion, getCompanionPostCount,
    composerOpen, composerOptions, openComposer, closeComposer,
    caseFlowOpen, openCaseFlow, closeCaseFlow,
    adoptionListingOpen, openAdoptionListing, closeAdoptionListing,
    focusFeedPostId, focusFeedFilters, requestFeedPostFocus, clearFeedPostFocus,
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
    composerOpen, composerOptions, closeComposer, addPost, updatePost,
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
        onUpdate={updatePost}
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
