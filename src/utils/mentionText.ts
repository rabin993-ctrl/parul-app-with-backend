import type { Community } from '../data/mockData';
import type { PawCircle } from '../data/pawCircles';
import { shortCircleName } from './destinationSearch';

export type MentionTarget =
  | { type: 'circle'; id: string; label: string }
  | { type: 'community'; id: string; label: string }
  | { type: 'member'; id: string; label: string };

export type MentionSegment =
  | { kind: 'text'; value: string }
  | { kind: 'mention'; raw: string; target: MentionTarget };

function isMentionBoundary(ch: string | undefined): boolean {
  return ch === undefined || /\s/.test(ch) || /[.,!?;:)]/.test(ch);
}

export function buildMentionRegistry(opts: {
  circles?: PawCircle[];
  communities?: Community[];
  members?: { userId: string; handle?: string }[];
}): Map<string, MentionTarget> {
  const map = new Map<string, MentionTarget>();

  const add = (key: string, target: MentionTarget) => {
    const k = key.trim().toLowerCase();
    if (!k || map.has(k)) return;
    map.set(k, target);
  };

  for (const c of opts.circles ?? []) {
    const label = shortCircleName(c.name);
    add(label, { type: 'circle', id: c.id, label });
  }
  for (const c of opts.communities ?? []) {
    add(c.name, { type: 'community', id: c.id, label: c.name });
  }
  for (const m of opts.members ?? []) {
    if (m.handle) {
      add(m.handle, { type: 'member', id: m.userId, label: m.handle });
    }
  }

  return map;
}

export function segmentMentionText(text: string, registry: Map<string, MentionTarget>): MentionSegment[] {
  if (!text.includes('@')) return [{ kind: 'text', value: text }];

  const keys = [...registry.keys()].sort((a, b) => b.length - a.length);
  const segments: MentionSegment[] = [];
  let i = 0;
  let plainStart = 0;

  while (i < text.length) {
    if (text[i] !== '@') {
      i += 1;
      continue;
    }

    const rest = text.slice(i + 1);
    let matchedKey: string | null = null;

    for (const key of keys) {
      if (!rest.toLowerCase().startsWith(key)) continue;
      if (!isMentionBoundary(rest[key.length])) continue;
      matchedKey = key;
      break;
    }

    if (matchedKey) {
      const target = registry.get(matchedKey)!;
      const rawLen = matchedKey.length;
      if (plainStart < i) {
        segments.push({ kind: 'text', value: text.slice(plainStart, i) });
      }
      segments.push({
        kind: 'mention',
        raw: text.slice(i, i + 1 + rawLen),
        target,
      });
      i += 1 + rawLen;
      plainStart = i;
      continue;
    }

    const handleMatch = rest.match(/^([a-zA-Z0-9._-]+)/);
    if (handleMatch && isMentionBoundary(rest[handleMatch[1].length])) {
      const handle = handleMatch[1];
      if (plainStart < i) {
        segments.push({ kind: 'text', value: text.slice(plainStart, i) });
      }
      segments.push({
        kind: 'mention',
        raw: `@${handle}`,
        target: { type: 'member', id: handle, label: handle },
      });
      i += 1 + handle.length;
      plainStart = i;
      continue;
    }

    i += 1;
  }

  if (plainStart < text.length) {
    segments.push({ kind: 'text', value: text.slice(plainStart) });
  }

  return segments.length > 0 ? segments : [{ kind: 'text', value: text }];
}
