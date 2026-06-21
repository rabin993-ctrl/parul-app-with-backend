import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Post, PostTag, PostThread } from '../data/mockData';
import { normalizeJoinedMedia } from '../lib/avatarMedia';
import { snapshotsFromDbPostCompanions } from '../utils/companionSnapshot';
import { resolvePostMediaDisplayUrl, resolvePostMediaFallbackUrl } from '../lib/cdn';
import {
  fetchUserPrivacyFlags,
  privacyFlagsMapFromCache,
  type UserPrivacyFlags,
} from '../lib/userPrivacyFlagCache';
import { isAlertPost, mergeAlertFieldsPreferExisting } from '../utils/postAlertMerge';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Client-only ids assigned before the posts insert returns a DB uuid. */
export function isOptimisticFeedPostId(id: string): boolean {
  return id.startsWith('p-') && !UUID_RE.test(id);
}

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
type DbAlertData = {
  kind: string;
  area: string | null;
  last_seen: string | null;
  found_at: string | null;
  looks_like: string | null;
  phone: string | null;
  resolved: boolean | null;
  lat: number | null;
  lng: number | null;
  alerted_count: number | null;
  alert_radius_km: number | null;
};

export type DbPostRow = {
  id: string;
  author_user_id: string;
  companion_author_id: string | null;
  companion_content_style?: 'update' | 'gallery' | null;
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
  'id', 'author_user_id', 'companion_author_id', 'companion_content_style', 'text', 'tag', 'label',
  'is_circle', 'circle_id', 'location', 'adoption_status', 'created_at',
  'author:users!author_user_id (id, name, handle, tint, avatar_media:media_assets!users_avatar_media_id_fkey(url, thumb_url))',
  'post_media (idx, asset:media_assets (id, url, thumb_url))',
  'post_companions (companion_id, companion:companions (id, name, tint, avatar_media:media_assets!companions_avatar_media_id_fkey(url, thumb_url)))',
  'post_alerts (kind, area, last_seen, found_at, looks_like, phone, resolved, lat, lng, alerted_count, alert_radius_km)',
  'post_reactions (user_id, kind)',
  'post_saves (user_id)',
  'post_forwards (id)',
].join(',');

/** Pre-geo migration select — used as fallback when 0035 columns are not applied yet. */
export const FEED_SELECT_LEGACY = [
  'id', 'author_user_id', 'companion_author_id', 'text', 'tag', 'label',
  'is_circle', 'circle_id', 'location', 'adoption_status', 'created_at',
  'author:users!author_user_id (id, name, handle, tint, avatar_media:media_assets!users_avatar_media_id_fkey(url, thumb_url))',
  'post_media (idx, asset:media_assets (id, url, thumb_url))',
  'post_companions (companion_id, companion:companions (id, name, tint, avatar_media:media_assets!companions_avatar_media_id_fkey(url, thumb_url)))',
  'post_alerts (kind, area, last_seen, found_at, looks_like, phone, resolved)',
  'post_reactions (user_id, kind)',
  'post_saves (user_id)',
  'post_forwards (id)',
].join(',');

/** Select feed post rows; falls back when geo columns from migration 0035 are not applied yet. */
export async function selectFeedRows<T extends { data: unknown; error: { message: string } | null }>(
  build: (select: string) => PromiseLike<T>,
): Promise<T> {
  let result = await build(FEED_SELECT);
  if (result.error) {
    result = await build(FEED_SELECT_LEGACY);
  }
  return result;
}

function normalizeAlert(alert: DbAlertData | DbAlertData[] | null | undefined): DbAlertData | null {
  if (!alert) return null;
  if (Array.isArray(alert)) return alert[0] ?? null;
  return alert;
}

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

function applyAuthorPrivacy(
  post: Post,
  authorId: string,
  viewerId: string,
  flags?: Pick<UserPrivacyFlags, 'showLocation' | 'showCompanions'>,
): Post {
  if (authorId === viewerId || !flags) return post;
  const masked = { ...post };
  if (!flags.showLocation) masked.loc = '';
  if (!flags.showCompanions) {
    masked.companions = [];
    masked.companionNames = [];
    masked.companionSnapshots = [];
    masked.companionName = undefined;
  }
  return masked;
}

export function rowToPost(
  row: DbPostRow,
  uid: string,
  threads: PostThread[] = [],
  privacyFlags?: Map<string, UserPrivacyFlags>,
): Post {
  const alert = normalizeAlert(row.post_alerts);
  const isLostPost = row.label === 'lost' || alert?.kind === 'lost';
  const isFoundPost = row.label === 'found' || alert?.kind === 'found';
  const reactions = row.post_reactions ?? [];
  const saves = row.post_saves ?? [];
  const forwards = row.post_forwards ?? [];
  const mediaEntries = (row.post_media ?? [])
    .sort((a, b) => a.idx - b.idx)
    .map(pm => normalizeJoinedMedia(pm.asset))
    .filter((asset): asset is NonNullable<typeof asset> => !!asset);

  const post: Post = {
    id: row.id,
    author: row.author?.handle ?? row.author?.name ?? 'unknown',
    authorName: row.author?.name ?? undefined,
    authorTint: row.author?.tint ?? undefined,
    authorAvatarUrl: row.author?.avatar_media?.thumb_url ?? row.author?.avatar_media?.url ?? undefined,
    authorAvatarFallbackUrl: row.author?.avatar_media?.url ?? undefined,
    userId: row.author_user_id,
    companionAuthorId: row.companion_author_id ?? undefined,
    companionContentStyle: row.companion_content_style ?? undefined,
    companions: (row.post_companions ?? []).map(pc => pc.companion_id),
    companionName: (row.post_companions ?? [])[0]?.companion?.name ?? undefined,
    companionNames: (row.post_companions ?? []).map(pc => pc.companion?.name).filter((n): n is string => !!n),
    companionSnapshots: snapshotsFromDbPostCompanions(row.post_companions ?? []),
    ...(row.companion_author_id ? (() => {
      const ca = (row.post_companions ?? []).find(pc => pc.companion_id === row.companion_author_id)?.companion;
      return {
        companionAuthorName: ca?.name ?? undefined,
        companionAuthorTint: ca?.tint ?? undefined,
        companionAuthorAvatarUrl: ca?.avatar_media?.thumb_url ?? ca?.avatar_media?.url ?? undefined,
        companionAuthorAvatarFallbackUrl: ca?.avatar_media?.url ?? undefined,
      };
    })() : {}),
    time: formatRelativeTime(row.created_at),
    loc: row.location ?? '',
    circle: row.is_circle,
    circleId: row.circle_id ?? undefined,
    text: row.text ?? '',
    images: mediaEntries.length,
    mediaUrls: mediaEntries.map(asset => resolvePostMediaDisplayUrl(asset)),
    mediaFallbackUrls: mediaEntries
      .map(asset => resolvePostMediaFallbackUrl(asset))
      .filter((u): u is string => !!u),
    label: isLostPost ? 'lost' : isFoundPost ? 'found' : (row.label ?? null),
    tag: (row.tag as PostTag) ?? undefined,
    paws: reactions.filter(r => r.kind === 'paw').length,
    reacted: reactions.some(r => r.kind === 'paw' && r.user_id === uid),
    comments: threads.length > 0
      ? threads.reduce((s, t) => s + 1 + t.replies.length, 0)
      : 0,
    forwards: forwards.length,
    saved: saves.some(s => s.user_id === uid),
    lost: isLostPost
      ? {
        kind: 'Lost pet',
        lastSeen: alert?.last_seen ?? '',
        area: alert?.area ?? '',
        phone: alert?.phone ?? undefined,
        resolved: alert?.resolved ?? false,
        alertedCount: alert?.alerted_count ?? 0,
        lat: alert?.lat ?? undefined,
        lng: alert?.lng ?? undefined,
      }
      : undefined,
    found: isFoundPost
      ? {
        area: alert?.area ?? '',
        foundAt: alert?.found_at ?? '',
        looksLike: alert?.looks_like ?? undefined,
        phone: alert?.phone ?? undefined,
        resolved: alert?.resolved ?? false,
        alertedCount: alert?.alerted_count ?? 0,
        lat: alert?.lat ?? undefined,
        lng: alert?.lng ?? undefined,
      }
      : undefined,
    threads,
    adoptionStatus: (row.adoption_status as Post['adoptionStatus']) ?? undefined,
    ...((row.label === 'adoption' || row.tag === 'adoption') && UUID_RE.test(row.id)
      ? { adoptionListingId: row.id }
      : {}),
  };

  return applyAuthorPrivacy(
    post,
    row.author_user_id,
    uid,
    privacyFlags?.get(row.author_user_id),
  );
}

/** Re-apply location/companion masking after privacy flags refresh. */
export function remaskPostsForPrivacy(posts: Post[], viewerId: string): Post[] {
  const authorIds = [...new Set(posts.map(p => p.userId))];
  const flagsMap = privacyFlagsMapFromCache(authorIds);
  return posts.map(post => applyAuthorPrivacy(
    post,
    post.userId,
    viewerId,
    flagsMap.get(post.userId),
  ));
}

/** Batch-fetch privacy flags and map DB rows to posts with location/companion masking applied. */
export async function postsFromDbRows(
  rows: DbPostRow[],
  uid: string,
  threadsByPost?: Map<string, PostThread[]>,
): Promise<Post[]> {
  if (rows.length === 0) return [];
  const authorIds = [...new Set(rows.map(r => r.author_user_id))];
  const needsFlags = authorIds.filter(id => id !== uid);
  if (needsFlags.length > 0) await fetchUserPrivacyFlags(needsFlags);
  const flagsMap = privacyFlagsMapFromCache(authorIds);
  return rows.map(r => rowToPost(r, uid, threadsByPost?.get(r.id) ?? [], flagsMap));
}

async function hydrateFeedPosts(rows: DbPostRow[], userId: string): Promise<Post[]> {
  if (rows.length === 0) return [];
  const postIds = rows.map(r => r.id);
  const { data: commentsData } = await supabase
    .from('comments')
    .select('id, post_id, parent_id, author_user_id, text, created_at, author:users!author_user_id(name, handle)')
    .in('post_id', postIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  const threadsByPost = assembleThreads((commentsData ?? []) as DbCommentRow[]);
  return postsFromDbRows(rows, userId, threadsByPost);
}

/** Load all posts the user has bookmarked, newest save first. */
export async function fetchSavedFeedPosts(userId: string): Promise<Post[]> {
  const { data: saveRows, error: savesErr } = await supabase
    .from('post_saves')
    .select('post_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (savesErr || !saveRows?.length) return [];

  const postIds = saveRows.map(r => r.post_id);
  const { data: postsData, error: postsErr } = await selectFeedRows(select =>
    supabase
      .from('posts')
      .select(select)
      .in('id', postIds)
      .is('deleted_at', null),
  );

  if (postsErr || !postsData?.length) return [];

  const rows = postsData as unknown as DbPostRow[];
  const byId = new Map(
    (await hydrateFeedPosts(rows, userId)).map(post => [post.id, { ...post, saved: true }]),
  );
  return postIds.map(id => byId.get(id)).filter((post): post is Post => !!post);
}

export function useFeedQuery() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let { data: postsData, error: postsErr } = await selectFeedRows(select =>
      supabase
        .from('posts')
        .select(select)
        .is('deleted_at', null)
        .eq('is_circle', false)
        .order('created_at', { ascending: false })
        .limit(30),
    );
    if (postsErr) {
      console.error('[useFeedQuery] feed query failed:', postsErr.message);
    }
    if (postsErr || !postsData) {
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
    const hydrated = await hydrateFeedPosts(rows, user.id);
    setPosts(prev => {
      const prevById = new Map(prev.map(p => [p.id, p]));
      const merged = hydrated.map(fresh => {
        const existing = prevById.get(fresh.id);
        if (!existing) return fresh;
        let next = fresh;
        if (isAlertPost(existing) || isAlertPost(fresh)) {
          next = mergeAlertFieldsPreferExisting(fresh, existing);
        }
        if (next.lost) {
          return {
            ...next,
            lost: { ...next.lost, resolved: !!(existing.lost?.resolved || next.lost.resolved) },
          };
        }
        if (next.found) {
          return {
            ...next,
            found: { ...next.found, resolved: !!(existing.found?.resolved || next.found.resolved) },
          };
        }
        return next;
      });
      const mergedIds = new Set(merged.map(p => p.id));
      // Keep any in-memory post not yet returned by the fetch (UUID optimistic ids, in-flight publishes).
      const pendingLocal = prev.filter(p => !mergedIds.has(p.id));
      return [...pendingLocal, ...merged];
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  return { posts, setPosts, loading, reload };
}
