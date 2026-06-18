import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  CommunityPost,
  CommunityThread,
  AuthorProfile,
} from '../data/communityPosts';
import { countCommunityThreadComments } from '../utils/postComments';

type CommunityFeedContextValue = {
  posts: CommunityPost[];
  savedPosts: CommunityPost[];
  loading: boolean;
  toggleHelpful: (postId: string) => void;
  toggleSaved: (postId: string) => boolean;
  addComment: (
    postId: string,
    text: string,
    opts?: { userId?: string; replyToThreadId?: string },
  ) => void;
  addPost: (post: CommunityPost) => Promise<string>;
  updatePost: (postId: string, patch: Partial<CommunityPost>) => void;
  loadPostThreads: (postId: string) => Promise<void>;
};

const CommunityFeedContext = createContext<CommunityFeedContextValue | null>(null);

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function mapDbPostRow(row: any, userId: string): CommunityPost {
  const authorRaw = row.author;
  const communityRaw = row.community;
  const helpfulRows: { user_id: string }[] = row.helpful ?? [];
  const savesRows: { user_id: string }[] = row.saves ?? [];
  const companionRows: { companion_id: string; companion: { id: string; name: string } | null }[] = row.companions ?? [];
  const commentCountRaw = row.comment_count;
  const commentCount: number = Array.isArray(commentCountRaw) && commentCountRaw.length > 0
    ? (commentCountRaw[0]?.count ?? 0)
    : 0;

  const author: AuthorProfile | undefined = authorRaw ? {
    id: authorRaw.id,
    name: authorRaw.name,
    handle: authorRaw.handle,
    tint: authorRaw.tint ?? null,
    location: authorRaw.location ?? null,
  } : undefined;

  let alertMeta: CommunityPost['alertMeta'];
  if (row.alert_meta && typeof row.alert_meta === 'object') {
    alertMeta = row.alert_meta as CommunityPost['alertMeta'];
  }

  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category,
    composerLabel: row.composer_label ?? undefined,
    alertMeta,
    authorId: row.author_user_id,
    author,
    communityId: row.community_id,
    communityName: communityRaw?.name ?? '',
    time: formatRelativeTime(row.created_at),
    loc: author?.location ?? '',
    helpful: helpfulRows.length,
    comments: commentCount,
    saved: savesRows.some(s => s.user_id === userId),
    helpfulByMe: helpfulRows.some(h => h.user_id === userId),
    hasImage: !!row.image_tint,
    imageTint: row.image_tint ?? undefined,
    trendingScore: Number(row.trending_score ?? 0),
    companionIds: companionRows.map(c => c.companion_id),
    companionNames: companionRows.map(c => c.companion?.name).filter((n): n is string => !!n),
    threads: [],
  };
}

async function fetchPosts(userId: string): Promise<CommunityPost[]> {
  const [{ data: postsData }, { data: savesData }] = await Promise.all([
    supabase
      .from('community_posts')
      .select(`
        id, community_id, author_user_id, title, body, category,
        composer_label, alert_meta, image_tint, trending_score, created_at,
        author:users!community_posts_author_user_id_fkey(id, name, handle, tint, location),
        community:communities!community_posts_community_id_fkey(name),
        helpful:community_post_helpful(user_id),
        comment_count:community_comments(count),
        companions:community_post_companions(companion_id, companion:companions(id, name))
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(200),
    (supabase as any)
      .from('community_post_saves')
      .select('post_id')
      .eq('user_id', userId),
  ]);

  const savedPostIds = new Set<string>((savesData ?? []).map((s: any) => s.post_id));

  return (postsData ?? []).map((row: any) => {
    const post = mapDbPostRow(row, userId);
    return { ...post, saved: savedPostIds.has(row.id) };
  });
}

async function fetchPostThreads(postId: string): Promise<CommunityThread[]> {
  const { data } = await supabase
    .from('community_comments')
    .select(`
      id, post_id, parent_id, author_user_id, text, created_at,
      author:users!community_comments_author_user_id_fkey(id, name, handle, tint)
    `)
    .eq('post_id', postId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (!data) return [];

  const threads: CommunityThread[] = [];
  const threadMap = new Map<string, CommunityThread>();

  data.forEach((row: any) => {
    if (!row.parent_id) {
      const thread: CommunityThread = {
        id: row.id,
        userId: row.author_user_id,
        author: row.author as AuthorProfile ?? undefined,
        text: row.text,
        time: formatRelativeTime(row.created_at),
        helpful: 0,
        replies: [],
      };
      threads.push(thread);
      threadMap.set(row.id, thread);
    }
  });

  data.forEach((row: any) => {
    if (row.parent_id) {
      const parent = threadMap.get(row.parent_id);
      if (parent) {
        parent.replies.push({
          id: row.id,
          userId: row.author_user_id,
          author: row.author as AuthorProfile ?? undefined,
          text: row.text,
          time: formatRelativeTime(row.created_at),
        });
      }
    }
  });

  return threads;
}

export function CommunityFeedProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const loaded = await fetchPosts(user.id);
    setPosts(loaded);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const loadPostThreads = useCallback(async (postId: string) => {
    const threads = await fetchPostThreads(postId);
    setPosts(prev => prev.map(p =>
      p.id !== postId ? p : { ...p, threads, comments: countCommunityThreadComments(threads) },
    ));
  }, []);

  const toggleHelpful = useCallback((postId: string) => {
    if (!user) return;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const on = !p.helpfulByMe;
      if (on) {
        supabase.from('community_post_helpful').insert({ post_id: postId, user_id: user.id });
      } else {
        supabase.from('community_post_helpful').delete()
          .eq('post_id', postId).eq('user_id', user.id);
      }
      return { ...p, helpfulByMe: on, helpful: Math.max(0, p.helpful + (on ? 1 : -1)) };
    }));
  }, [user]);

  const savedPosts = useMemo(() => posts.filter(p => p.saved), [posts]);

  const toggleSaved = useCallback((postId: string): boolean => {
    if (!user) return false;
    let nowSaved = false;
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      nowSaved = !p.saved;
      if (nowSaved) {
        (supabase as any).from('community_post_saves').insert({ post_id: postId, user_id: user.id });
      } else {
        (supabase as any).from('community_post_saves').delete()
          .eq('post_id', postId).eq('user_id', user.id);
      }
      return { ...p, saved: nowSaved };
    }));
    return nowSaved;
  }, [user]);

  const addComment = useCallback(async (
    postId: string,
    text: string,
    opts?: { userId?: string; replyToThreadId?: string },
  ) => {
    if (!user) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const { data: newRow } = await supabase
      .from('community_comments')
      .insert({
        post_id: postId,
        parent_id: opts?.replyToThreadId ?? null,
        author_user_id: user.id,
        text: trimmed,
      })
      .select('id, post_id, parent_id, author_user_id, text, created_at, author:users!community_comments_author_user_id_fkey(id, name, handle, tint)')
      .single();

    if (!newRow) return;

    const newAuthor: AuthorProfile | undefined = (newRow as any).author ?? undefined;

    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const baseThreads = p.threads ?? [];
      let threads: CommunityThread[];
      if (opts?.replyToThreadId) {
        threads = baseThreads.map(t => (
          t.id === opts.replyToThreadId
            ? {
              ...t,
              replies: [...(t.replies ?? []), {
                id: (newRow as any).id,
                userId: user.id,
                author: newAuthor,
                text: trimmed,
                time: 'Just now',
              }],
            }
            : t
        ));
      } else {
        const thread: CommunityThread = {
          id: (newRow as any).id,
          userId: user.id,
          author: newAuthor,
          text: trimmed,
          time: 'Just now',
          helpful: 0,
          replies: [],
        };
        threads = [...baseThreads, thread];
      }
      return { ...p, threads, comments: countCommunityThreadComments(threads) };
    }));
  }, [user]);

  const addPost = useCallback(async (post: CommunityPost): Promise<string> => {
    if (!user) return post.id;

    const { data: newRow, error } = await supabase
      .from('community_posts')
      .insert({
        community_id: post.communityId,
        author_user_id: user.id,
        title: post.title,
        body: post.body,
        category: post.category,
        composer_label: post.composerLabel ?? null,
        alert_meta: post.alertMeta ?? null,
        image_tint: post.imageTint ?? null,
        trending_score: post.trendingScore,
      })
      .select(`
        id, community_id, author_user_id, title, body, category,
        composer_label, alert_meta, image_tint, trending_score, created_at,
        author:users!community_posts_author_user_id_fkey(id, name, handle, tint, location),
        community:communities!community_posts_community_id_fkey(name),
        helpful:community_post_helpful(user_id),
        comment_count:community_comments(count),
        companions:community_post_companions(companion_id, companion:companions(id, name))
      `)
      .single();

    if (error || !newRow) {
      setPosts(prev => [post, ...prev]);
      return post.id;
    }

    if (post.companionIds && post.companionIds.length > 0) {
      await supabase.from('community_post_companions').insert(
        post.companionIds.map(cid => ({ post_id: (newRow as any).id, companion_id: cid })),
      );
    }

    const mapped = mapDbPostRow(newRow, user.id);
    setPosts(prev => [mapped, ...prev]);
    return mapped.id;
  }, [user]);

  const updatePost = useCallback((postId: string, patch: Partial<CommunityPost>) => {
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, ...patch } : p)));
  }, []);

  const value = useMemo(
    () => ({
      posts,
      savedPosts,
      loading,
      toggleHelpful,
      toggleSaved,
      addComment,
      addPost,
      updatePost,
      loadPostThreads,
    }),
    [posts, savedPosts, loading, toggleHelpful, toggleSaved, addComment, addPost, updatePost, loadPostThreads],
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
