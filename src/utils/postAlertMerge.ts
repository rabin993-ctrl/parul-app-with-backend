import type { Post } from '../data/mockData';

export type AlertRowPayload = {
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

function coalesceAlertText(dbVal: string | null | undefined, localVal: string | undefined): string {
  const fromDb = (dbVal ?? '').trim();
  if (fromDb) return fromDb;
  return (localVal ?? '').trim();
}

function coalesceOptionalText(
  dbVal: string | null | undefined,
  localVal: string | undefined,
): string | undefined {
  const merged = coalesceAlertText(dbVal, localVal);
  return merged || undefined;
}

function isLostAlert(post: Post, kind?: 'lost' | 'found'): boolean {
  if (kind === 'found') return false;
  return kind === 'lost' || post.label === 'lost' || !!post.lost;
}

function isFoundAlert(post: Post, kind?: 'lost' | 'found'): boolean {
  if (kind === 'lost') return false;
  return kind === 'found' || post.label === 'found' || !!post.found;
}

/** Merge a post_alerts realtime/db row into an in-memory post without wiping non-empty fields. */
export function mergeAlertRowIntoPost(post: Post, row: AlertRowPayload): Post {
  if (isFoundAlert(post, row.kind)) {
    const base = post.found ?? { area: '', foundAt: '', alertedCount: 0 };
    return {
      ...post,
      label: 'found',
      tag: post.tag ?? 'lost-found',
      lost: undefined,
      found: {
        ...base,
        area: coalesceAlertText(row.area, base.area),
        foundAt: coalesceAlertText(row.found_at ?? undefined, base.foundAt),
        looksLike: coalesceOptionalText(row.looks_like, base.looksLike),
        phone: coalesceOptionalText(row.phone, base.phone),
        lat: row.lat ?? base.lat,
        lng: row.lng ?? base.lng,
        alertedCount: row.alerted_count ?? base.alertedCount ?? 0,
        resolved: !!(base.resolved || row.resolved),
      },
    };
  }

  if (isLostAlert(post, row.kind)) {
    const base = post.lost ?? { kind: 'Lost pet', area: '', lastSeen: '', alertedCount: 0 };
    return {
      ...post,
      label: 'lost',
      tag: post.tag ?? 'lost-found',
      found: undefined,
      lost: {
        ...base,
        area: coalesceAlertText(row.area, base.area),
        lastSeen: coalesceAlertText(row.last_seen ?? undefined, base.lastSeen),
        phone: coalesceOptionalText(row.phone, base.phone),
        lat: row.lat ?? base.lat,
        lng: row.lng ?? base.lng,
        alertedCount: row.alerted_count ?? base.alertedCount ?? 0,
        resolved: !!(base.resolved || row.resolved),
      },
    };
  }

  return post;
}

function alertPayloadFromPost(post: Post, kind: 'lost' | 'found'): AlertRowPayload {
  if (kind === 'found') {
    return {
      post_id: post.id,
      kind: 'found',
      area: post.found?.area,
      found_at: post.found?.foundAt,
      looks_like: post.found?.looksLike,
      phone: post.found?.phone,
      lat: post.found?.lat ?? null,
      lng: post.found?.lng ?? null,
      alerted_count: post.found?.alertedCount,
      resolved: post.found?.resolved,
    };
  }
  return {
    post_id: post.id,
    kind: 'lost',
    area: post.lost?.area,
    last_seen: post.lost?.lastSeen,
    phone: post.lost?.phone,
    lat: post.lost?.lat ?? null,
    lng: post.lost?.lng ?? null,
    alerted_count: post.lost?.alertedCount,
    resolved: post.lost?.resolved,
  };
}

/** Prefer non-empty alert fields from the optimistic/local post when DB rows are empty or missing. */
export function mergeAlertPost(local: Post, fromDb: Post): Post {
  if (isFoundAlert(local) || isFoundAlert(fromDb)) {
    return mergeAlertRowIntoPost(
      mergeAlertRowIntoPost(fromDb, alertPayloadFromPost(fromDb, 'found')),
      alertPayloadFromPost(local, 'found'),
    );
  }

  if (isLostAlert(local) || isLostAlert(fromDb)) {
    return mergeAlertRowIntoPost(
      mergeAlertRowIntoPost(fromDb, alertPayloadFromPost(fromDb, 'lost')),
      alertPayloadFromPost(local, 'lost'),
    );
  }

  return fromDb;
}

/** Fill empty alert fields on a freshly loaded post using an older in-memory copy. */
export function mergeAlertFieldsPreferExisting(fresh: Post, existing: Post): Post {
  return mergeAlertPost(existing, fresh);
}

export function isLostAlertPost(post: Post): boolean {
  return isLostAlert(post);
}

export function isFoundAlertPost(post: Post): boolean {
  return isFoundAlert(post);
}

export function isAlertPost(post: Post): boolean {
  return isLostAlertPost(post) || isFoundAlertPost(post);
}

export type AlertDraft = Pick<Post, 'label' | 'lost' | 'found'>;

export function captureAlertDraft(post: Post): AlertDraft | null {
  if (!post.lost && !post.found && post.label !== 'lost' && post.label !== 'found') return null;
  return {
    label: post.label ?? (post.found ? 'found' : post.lost ? 'lost' : null),
    lost: post.lost,
    found: post.found,
  };
}

export function applyAlertDraft(post: Post, draft: AlertDraft): Post {
  const local: Post = {
    ...post,
    label: draft.label ?? post.label,
    lost: draft.lost ?? post.lost,
    found: draft.found ?? post.found,
  };
  return mergeAlertPost(local, post);
}

export function postHasPersistedAlertFields(post: Post): boolean {
  if (post.found?.area?.trim() || post.found?.foundAt?.trim()) return true;
  if (post.lost?.area?.trim() || post.lost?.lastSeen?.trim()) return true;
  return false;
}
