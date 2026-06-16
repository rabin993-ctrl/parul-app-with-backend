import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Post } from '../data/mockData';

const storageKey = (userId: string) => `@parul/resolved-alerts:${userId}`;

export async function loadResolvedAlertIds(userId: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0));
  } catch {
    return new Set();
  }
}

export async function persistResolvedAlertId(userId: string, postId: string): Promise<void> {
  const ids = await loadResolvedAlertIds(userId);
  if (ids.has(postId)) return;
  ids.add(postId);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify([...ids]));
}

export function markPostResolved(post: Post): Post {
  if (post.lost) return { ...post, lost: { ...post.lost, resolved: true } };
  if (post.found) return { ...post, found: { ...post.found, resolved: true } };
  if (post.label === 'found') {
    return { ...post, found: { area: '', foundAt: '', resolved: true } };
  }
  if (post.label === 'lost') {
    return { ...post, lost: { kind: 'Lost pet', lastSeen: '', area: '', resolved: true } };
  }
  return post;
}

export function applyResolvedOverlay(posts: Post[], resolvedIds: ReadonlySet<string>): Post[] {
  if (resolvedIds.size === 0) return posts;
  return posts.map(p => (resolvedIds.has(p.id) ? markPostResolved(p) : p));
}
