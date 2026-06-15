import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Post, PostTag, PostThread } from '../data/mockData';

function formatRelativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type DbAuthor = { id: string; name: string; handle: string | null; tint: string | null; avatar_media: { url: string; thumb_url: string | null } | null } | null;
// post_alerts is a one-to-one relation (post_id is the PK), so PostgREST returns a
// single object rather than an array. Typing it as an array was the bug.
type DbAlertData = { kind: string; area: string | null; last_seen: string | null; found_at: string | null; looks_like: string | null; phone: string | null; resolved: boolean | null };

export type DbPostRow = {
  id: string;
  author_user_id: string;
  companion_author_id: string | null;
  text: string | null;
  tag: string | null;
  label: string | null;
  is_circle: boolean;
  circle_id: string | null;
  location: string | null;
  adoption_status: string | null;
  created_at: string;
  author: DbAuthor;
  post_media: { idx: number; asset: { id: string; url: string; thumb_url: string | null } | null }[];
  post_companions: { companion_id: string; companion: { id: string; name: string; tint: string | null; avatar_media: { url: string; thumb_url: string | null } | null } | null }[];
  post_alerts: DbAlertData | null;
  post_reactions: { user_id: string; kind: string }[];
  post_saves: { user_id: string }[];
  post_forwards: { id: string }[];
};

type DbCommentRow = {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_user_id: string;
  text: string;
  created_at: string;
  author: { name: string; handle: string | null } | null;
};

export const FEED_SELECT = [
  'id', 'author_user_id', 'companion_author_id', 'text', 'tag', 'label',
  'is_circle', 'circle_id', 'location', 'adoption_status', 'created_at',
  'author:users!author_user_id (id, name, handle, tint, avatar_media:media_assets!avatar_media_id(url, thumb_url))',
  'post_media (idx, asset:media_assets (id, url, thumb_url))',
  'post_companions (companion_id, companion:companions (id, name, tint, avatar_media:media_assets!avatar_media_id(url, thumb_url)))',
  'post_alerts (kind, area, last_seen, found_at, looks_like, phone, resolved)',
  'post_reactions (user_id, kind)',
  'post_saves (user_id)',
  'post_forwards (id)',
].join(',');

function assembleThreads(rows: DbCommentRow[]): Map<string, PostThread[]> {
  const byPostId = new Map<string, DbCommentRow[]>();
  for (const r of rows) {
    const arr = byPostId.get(r.post_id) ?? [];
    arr.push(r);
    byPostId.set(r.post_id, arr);
  }

  const result = new Map<string, PostThread[]>();
  for (const [postId, comments] of byPostId) {
    const topLevel = comments.filter(c => c.parent_id === null);
    const byParent = new Map<string, DbCommentRow[]>();
    for (const c of comments.filter(c => c.parent_id !== null)) {
      const arr = byParent.get(c.parent_id!) ?? [];
      arr.push(c);
      byParent.set(c.parent_id!, arr);
    }
    result.set(postId, topLevel.map(tl => ({
      id: tl.id,
      user: tl.author_user_id,
      text: tl.text,
      time: formatRelativeTime(tl.created_at),
      replies: (byParent.get(tl.id) ?? []).map(r => ({
        id: r.id,
        user: r.author_user_id,
        text: r.text,
        time: formatRelativeTime(r.created_at),
      })),
    })));
  }
  return result;
}

export function rowToPost(row: DbPostRow, uid: string, threads: PostThread[] = []): Post {
  const alert = row.post_alerts ?? null;
  const reactions = row.post_reactions ?? [];
  const saves = row.post_saves ?? [];
  const forwards = row.post_forwards ?? [];

  return {
    id: row.id,
    author: row.author?.handle ?? row.author?.name ?? 'unknown',
    authorName: row.author?.name ?? undefined,
    authorTint: row.author?.tint ?? undefined,
    authorAvatarUrl: row.author?.avatar_media?.thumb_url ?? row.author?.avatar_media?.url ?? undefined,
    userId: row.author_user_id,
    companionAuthorId: row.companion_author_id ?? undefined,
    companions: (row.post_companions ?? []).map(pc => pc.companion_id),
    companionName: (row.post_companions ?? [])[0]?.companion?.name ?? undefined,
    companionNames: (row.post_companions ?? []).map(pc => pc.companion?.name).filter((n): n is string => !!n),
    ...(row.companion_author_id ? (() => {
      const ca = (row.post_companions ?? []).find(pc => pc.companion_id === row.companion_author_id)?.companion;
      return {
        companionAuthorName: ca?.name ?? undefined,
        companionAuthorTint: ca?.tint ?? undefined,
        companionAuthorAvatarUrl: ca?.avatar_media?.thumb_url ?? ca?.avatar_media?.url ?? undefined,
      };
    })() : {}),
    time: formatRelativeTime(row.created_at),
    loc: row.location ?? '',
    circle: row.is_circle,
    circleId: row.circle_id ?? undefined,
    text: row.text ?? '',
    images: (row.post_media ?? []).length,
    mediaUrls: (row.post_media ?? [])
      .sort((a, b) => a.idx - b.idx)
      .map(pm => pm.asset?.url ?? null)
      .filter((u): u is string => u !== null),
    label: row.label ?? null,
    tag: (row.tag as PostTag) ?? undefined,
    paws: reactions.filter(r => r.kind === 'paw').length,
    reacted: reactions.some(r => r.kind === 'paw' && r.user_id === uid),
    comments: threads.length > 0
      ? threads.reduce((s, t) => s + 1 + t.replies.length, 0)
      : 0,
    forwards: forwards.length,
    saved: saves.some(s => s.user_id === uid),
    lost: (row.label === 'lost')
      ? { kind: 'Lost pet', lastSeen: alert?.last_seen ?? '', area: alert?.area ?? '', phone: alert?.phone ?? undefined, resolved: alert?.resolved ?? false }
      : undefined,
    found: (row.label === 'found')
      ? { area: alert?.area ?? '', foundAt: alert?.found_at ?? '', looksLike: alert?.looks_like ?? undefined, phone: alert?.phone ?? undefined }
      : undefined,
    threads,
    adoptionStatus: (row.adoption_status as Post['adoptionStatus']) ?? undefined,
  };
}

export function useFeedQuery() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: postsData, error: postsErr } = await supabase
      .from('posts')
      .select(FEED_SELECT)
      .is('deleted_at', null)
      .eq('is_circle', false)
      .order('created_at', { ascending: false })
      .limit(30);

    if (postsErr || !postsData) {
      if (postsErr) console.error('[useFeedQuery] feed query failed:', postsErr.message);
      if (!postsErr) setPosts([]);
      setLoading(false);
      return;
    }
    if (postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const rows = postsData as unknown as DbPostRow[];
    const postIds = rows.map(r => r.id);

    const { data: commentsData } = await supabase
      .from('comments')
      .select('id, post_id, parent_id, author_user_id, text, created_at, author:users!author_user_id(name, handle)')
      .in('post_id', postIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    const threadsByPost = assembleThreads((commentsData ?? []) as DbCommentRow[]);

    setPosts(rows.map(r => rowToPost(r, user.id, threadsByPost.get(r.id) ?? [])));
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  return { posts, setPosts, loading, reload };
}
