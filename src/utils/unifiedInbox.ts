import type { ChatThread } from '../context/AdoptionContext';
import type { AdoptionRecord } from '../data/adoptionRecords';
import type { AdoptionListing } from '../data/adoptionData';
import type { AdoptionRequest } from '../context/AdoptionFeedContext';
import type { PawCircle } from '../data/pawCircles';
import type { CirclePreviewData } from '../hooks/useCirclePreviews';
import {
  getThreadChatDisplay,
  groupAdoptionChatThreads,
  isDismissedAdoptionThread,
  threadSortScore,
  type AdoptionChatGroup,
  type ChatSublineTone,
} from './chatThreadMeta';

/** Statuses that belong in the Needs you strip (not settled chats like Adopted). */
export const INBOX_NEEDS_YOU_ACCENTS = new Set([
  'Post home update',
  'Check-in due',
  'Update requested',
  'New request',
]);

export function isInboxNeedsYouAccent(accent?: string): boolean {
  return !!accent && INBOX_NEEDS_YOU_ACCENTS.has(accent);
}

/** Short action label for Needs you rows */
export function needsYouActionLabel(accent: string): string {
  switch (accent) {
    case 'Post home update':
      return 'Post update';
    case 'Update requested':
      return 'Check updates';
    case 'New request':
      return 'Review request';
    default:
      return accent;
  }
}

export type NeedsYouInboxItem = {
  thread: ChatThread;
  group: AdoptionChatGroup;
  title: string;
  accent: string;
  tone: ChatSublineTone;
  usePetAvatar: boolean;
  score: number;
};

export function collectNeedsYouAdoptionItems(params: {
  adoptionThreads: ChatThread[];
  records: AdoptionRecord[];
  listings: AdoptionListing[];
  requests: AdoptionRequest[];
  currentUserId: string;
}): NeedsYouInboxItem[] {
  const { adoptionThreads, records, listings, requests, currentUserId } = params;
  const groups = groupAdoptionChatThreads(adoptionThreads, records, listings, currentUserId);
  const out: NeedsYouInboxItem[] = [];

  for (const thread of adoptionThreads) {
    const group = groups.find(g => g.threads.some(t => t.id === thread.id));
    if (!group) continue;
    if (isDismissedAdoptionThread(thread, records, listings, requests, group, currentUserId)) {
      continue;
    }
    const display = getThreadChatDisplay(
      thread, records, listings, requests, group, currentUserId,
    );
    if (!display?.sublineAccent || !isInboxNeedsYouAccent(display.sublineAccent)) continue;
    out.push({
      thread,
      group,
      title: display.title,
      accent: display.sublineAccent,
      tone: display.sublineTone,
      usePetAvatar: display.usePetAvatar,
      score: threadSortScore(thread, records, listings, requests, group, currentUserId),
    });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}

export type UnifiedInboxItem =
  | {
    kind: 'adoption';
    key: string;
    thread: ChatThread;
    group: AdoptionChatGroup;
    score: number;
  }
  | {
    kind: 'circle';
    key: string;
    circle: PawCircle;
    preview: CirclePreviewData;
    isCreated: boolean;
    score: number;
  }
  | {
    kind: 'dm';
    key: string;
    thread: ChatThread;
    score: number;
  };

function threadRecencyScore(thread: ChatThread): number {
  if (thread.unread > 0) return 1000 + thread.unread;
  if (thread.time === 'Now') return 500;
  if (thread.time.endsWith('m')) return 400 - parseInt(thread.time, 10);
  if (thread.time.endsWith('h')) return 300 - parseInt(thread.time, 10);
  if (thread.time.endsWith('d')) return 200 - parseInt(thread.time, 10);
  return 100;
}

function dmScore(thread: ChatThread): number {
  return (thread.unread > 0 ? 2000 : 0) + threadRecencyScore(thread);
}

function circleScore(preview: CirclePreviewData): number {
  return (preview.unread > 0 ? 2000 + preview.unread * 10 : 0) + 100;
}

export function buildUnifiedInboxItems(params: {
  adoptionThreads: ChatThread[];
  dmThreads: ChatThread[];
  circles: PawCircle[];
  previews: Record<string, CirclePreviewData | undefined>;
  createdIds: Set<string>;
  records: AdoptionRecord[];
  listings: AdoptionListing[];
  requests: AdoptionRequest[];
  currentUserId: string;
  excludeThreadIds?: Set<string>;
  query?: string;
  unreadOnly?: boolean;
}): UnifiedInboxItem[] {
  const {
    adoptionThreads,
    dmThreads,
    circles,
    previews,
    createdIds,
    records,
    listings,
    requests,
    currentUserId,
    excludeThreadIds,
    query = '',
    unreadOnly = false,
  } = params;

  const items: UnifiedInboxItem[] = [];
  const groups = groupAdoptionChatThreads(adoptionThreads, records, listings, currentUserId);

  for (const thread of adoptionThreads) {
    if (excludeThreadIds?.has(thread.id)) continue;
    if (unreadOnly && thread.unread <= 0) continue;
    const group = groups.find(g => g.threads.some(t => t.id === thread.id));
    if (!group) continue;
    if (isDismissedAdoptionThread(thread, records, listings, requests, group, currentUserId)) {
      continue;
    }
    if (query) {
      const display = getThreadChatDisplay(
        thread, records, listings, requests, group, currentUserId,
      );
      if (!display) continue;
      const hay = [
        display.title,
        display.sublineLead,
        display.sublineAccent ?? '',
        thread.participantName ?? '',
        thread.participantHandle ?? '',
        thread.preview,
      ].join(' ').toLowerCase();
      if (!hay.includes(query)) continue;
    }
    items.push({
      kind: 'adoption',
      key: `adoption-${thread.id}`,
      thread,
      group,
      score: threadSortScore(thread, records, listings, requests, group, currentUserId) + 5000,
    });
  }

  for (const circle of circles) {
    const preview = previews[circle.id] ?? {
      lastMessage: 'Say hello to your circle!',
      lastMessageTime: '',
      unread: 0,
    };
    if (unreadOnly && preview.unread <= 0) continue;
    if (query) {
      const hay = `${circle.name} ${circle.location} ${preview.lastMessage}`.toLowerCase();
      if (!hay.includes(query)) continue;
    }
    items.push({
      kind: 'circle',
      key: `circle-${circle.id}`,
      circle,
      preview,
      isCreated: createdIds.has(circle.id),
      score: circleScore(preview),
    });
  }

  for (const thread of dmThreads) {
    if (unreadOnly && thread.unread <= 0) continue;
    if (query) {
      const name = (thread.participantName ?? thread.participantId).toLowerCase();
      const handle = (thread.participantHandle ?? '').toLowerCase();
      if (!name.includes(query) && !handle.includes(query) && !thread.preview.toLowerCase().includes(query)) {
        continue;
      }
    }
    items.push({
      kind: 'dm',
      key: `dm-${thread.id}`,
      thread,
      score: dmScore(thread),
    });
  }

  return items.sort((a, b) => b.score - a.score);
}
