import AsyncStorage from '@react-native-async-storage/async-storage';

const VALID_FEED_FILTER_IDS = new Set([
  'rescue',
  'paw-posting',
  'lost-found',
  'lost',
  'found',
  'discussion',
  'meme',
]);

const storageKey = (userId: string) => `@parul/feed-filters:${userId}`;

function normalizeFeedFilters(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string' || !VALID_FEED_FILTER_IDS.has(item) || seen.has(item)) continue;
    seen.add(item);
    next.push(item);
  }
  return next;
}

export async function loadFeedPostTypeFilters(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    return normalizeFeedFilters(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function persistFeedPostTypeFilters(userId: string, filters: string[]): Promise<void> {
  const normalized = normalizeFeedFilters(filters);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(normalized));
}
