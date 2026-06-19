import type { Community } from '../data/mockData';
import type { PawCircle } from '../data/pawCircles';
import { shortCircleName } from './destinationSearch';

export type MentionTarget =
  | { type: 'circle'; id: string; label: string }
  | { type: 'community'; id: string; label: string }
  | { type: 'member'; id: string; label: string };

export type MentionSegment =
  | { kind: 'text'; value: string }
  | { kind: 'mention'; raw: string; display: string; target: MentionTarget };

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
    const target: MentionTarget = { type: 'circle', id: c.id, label: c.name };
    add(c.name, target);
    const short = shortCircleName(c.name);
    if (short.toLowerCase() !== c.name.trim().toLowerCase()) {
      add(short, target);
    }
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

export function extractActiveMentionQuery(text: string): string | null {
  const atIndex = text.lastIndexOf('@');
  if (atIndex === -1) return null;
  const tail = text.slice(atIndex + 1);
  if (tail.length === 0) return '';
  if (/\s$/.test(tail) || /\n$/.test(tail)) return null;
  return tail;
}

/** Remove an in-progress @mention (e.g. when dismissing the picker). */
export function dismissActiveMention(text: string): string {
  if (extractActiveMentionQuery(text) === null) return text;
  const atIndex = text.lastIndexOf('@');
  return atIndex >= 0 ? text.slice(0, atIndex) : text;
}

function segmentByConfirmedTokens(text: string, confirmedTokens: string[]): MentionSegment[] {
  if (!text) return [];
  if (!confirmedTokens.length) return [{ kind: 'text', value: text }];

  const tokens = [...new Set(confirmedTokens)].sort((a, b) => b.length - a.length);
  const segments: MentionSegment[] = [];
  let i = 0;

  while (i < text.length) {
    let matched: string | null = null;
    if (text[i] === '@') {
      for (const token of tokens) {
        if (text.slice(i, i + token.length) === token) {
          matched = token;
          break;
        }
      }
    }

    if (matched) {
      segments.push({
        kind: 'mention',
        raw: matched,
        display: matched,
        target: { type: 'member', id: matched.slice(1), label: matched.slice(1) },
      });
      i += matched.length;
      continue;
    }

    const nextAt = text.indexOf('@', i + 1);
    const end = nextAt === -1 ? text.length : nextAt;
    segments.push({ kind: 'text', value: text.slice(i, end) });
    i = end;
  }

  return segments.length > 0 ? segments : [{ kind: 'text', value: text }];
}

/** Color only picker-confirmed mentions; leave in-progress @typing plain. */
export function segmentComposerMentionText(
  text: string,
  confirmedTokens: string[] = [],
): MentionSegment[] {
  if (!text.includes('@')) return [{ kind: 'text', value: text }];

  const activeQuery = extractActiveMentionQuery(text);
  if (activeQuery !== null) {
    const atIndex = text.lastIndexOf('@');
    const stable = text.slice(0, atIndex);
    const inProgress = text.slice(atIndex);
    const stableSegments = stable
      ? segmentByConfirmedTokens(stable, confirmedTokens)
      : [];
    return [...stableSegments, { kind: 'text', value: inProgress }];
  }

  return segmentByConfirmedTokens(text, confirmedTokens);
}

export function segmentMentionText(
  text: string,
  registry: Map<string, MentionTarget>,
  opts?: { registryOnly?: boolean },
): MentionSegment[] {
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
        display: `@${target.label}`,
        target,
      });
      i += 1 + rawLen;
      plainStart = i;
      continue;
    }

    const handleMatch = !opts?.registryOnly ? rest.match(/^([a-zA-Z0-9._-]+)/) : null;
    if (handleMatch && isMentionBoundary(rest[handleMatch[1].length])) {
      const handle = handleMatch[1];
      if (plainStart < i) {
        segments.push({ kind: 'text', value: text.slice(plainStart, i) });
      }
      segments.push({
        kind: 'mention',
        raw: `@${handle}`,
        display: `@${handle}`,
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
