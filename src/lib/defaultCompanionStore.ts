import AsyncStorage from '@react-native-async-storage/async-storage';

const storageKey = (userId: string) => `@parul/default-companion:${userId}`;

export async function loadDefaultCompanionId(userId: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const id = JSON.parse(raw);
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

export async function persistDefaultCompanionId(userId: string, companionId: string): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(companionId));
}

/** Saved default when valid, otherwise the first companion in the user's list. */
export function resolveDefaultCompanionId(
  savedId: string | null | undefined,
  validIds: string[],
): string | null {
  if (validIds.length === 0) return null;
  if (savedId && validIds.includes(savedId)) return savedId;
  return validIds[0];
}
