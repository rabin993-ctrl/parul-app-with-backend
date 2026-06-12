import { companions, users, type User } from '../data/mockData';
import type { Companion } from '../data/mockData';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const SEED_COMPANIONS: Record<string, Companion> = clone(companions);
export const SEED_USER_YOU: User = clone(users.you);

export function restoreCompanionsStore(): void {
  for (const key of Object.keys(companions)) {
    delete companions[key];
  }
  Object.assign(companions, clone(SEED_COMPANIONS));
}

export function restoreUserYou(): void {
  Object.assign(users.you, clone(SEED_USER_YOU));
}
