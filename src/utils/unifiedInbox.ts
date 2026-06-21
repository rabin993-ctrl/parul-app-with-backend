import type { ChatThread } from '../context/AdoptionContext';
import type { AdoptionRecord } from '../data/adoptionRecords';
import type { AdoptionListing } from '../data/adoptionData';
import type { AdoptionRequest } from '../context/AdoptionFeedContext';
import type { PawCircle } from '../data/pawCircles';
import type { CirclePreviewData } from '../hooks/useCirclePreviews';
import {
  recencyMillisFromCirclePreview,
  recencyMillisFromThreadTime,
} from './inboxRecency';
import {
  getThreadChatDisplay,
  groupAdoptionChatThreads,
  isDismissedAdoptionThread,
  threadSortScore,
  type AdoptionChatGroup,
  type ChatSublineTone,
} from './chatThreadMeta';

/** Thread accents for the Needs you strip (check-ins & follow-ups — not incoming requests). */
export const INBOX_NEEDS_YOU_ACCENTS = new Set([
  'Post home update',
  'Check-in due',
  'Update requested',
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
    case 'Check-in due':
      return 'Check in';
    default:
      return accent;
  }
}

export function listingRequestsRowLabel(count: number): string {
  return count === 1 ? '1 request' : `${count} requests`;
}

export type AdoptionInboxActionSections = {
  /** Poster: pending applicants grouped by listing */
  pendingRequests: NeedsYouInboxItem[];
  /** Adopter/poster: check-ins, overdue updates, etc. */
  actionItems: NeedsYouInboxItem[];
};

export type NeedsYouInboxItem =
  | {
    kind: 'thread';
    thread: ChatThread;
    group: AdoptionChatGroup;
    title: string;
    accent: string;
    tone: ChatSublineTone;
    usePetAvatar: boolean;
    score: number;
  }
  | {
    kind: 'listing_requests';
    listing: AdoptionListing;
    requestCount: number;
    title: string;
    accent: string;
    tone: ChatSublineTone;
    usePetAvatar: boolean;
    score: number;
  };

export function collectAdoptionInboxActionSections(params: {
  adoptionThreads: ChatThread[];
  records: AdoptionRecord[];
  listings: AdoptionListing[];
  requests: AdoptionRequest[];
  currentUserId: string;
}): AdoptionInboxActionSections {
  const { adoptionThreads, records, listings, requests, currentUserId } = params;
  const groups = groupAdoptionChatThreads(adoptionThreads, records, listings, currentUserId);
  const actionItems: NeedsYouInboxItem[] = [];

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
    actionItems.push({
      kind: 'thread',
      thread,
      group,
      title: display.title,
      accent: display.sublineAccent,
      tone: display.sublineTone,
      usePetAvatar: display.usePetAvatar,
      score: threadSortScore(thread, records, listings, requests, group, currentUserId),
    });
  }

  const coveredRequestIds = new Set(
    requests
      .filter(r => r.status === 'submitted' && r.threadId)
      .map(r => r.id),
  );

  const pendingByListing = new Map<string, { listing: AdoptionListing; count: number }>();

  for (const request of requests) {
    if (request.status !== 'submitted') continue;
    if (request.posterId !== currentUserId) continue;
    if (request.threadId) continue;
    if (coveredRequestIds.has(request.id)) continue;

    const listing = listings.find(l => l.id === request.listingId);
    if (!listing || listing.status === 'Adopted') continue;

    const existing = pendingByListing.get(request.listingId);
    if (existing) {
      existing.count += 1;
    } else {
      pendingByListing.set(request.listingId, { listing, count: 1 });
    }
  }

  const pendingRequests: NeedsYouInboxItem[] = [];
  for (const { listing, count } of pendingByListing.values()) {
    pendingRequests.push({
      kind: 'listing_requests',
      listing,
      requestCount: count,
      title: listing.name,
      accent: 'New request',
      tone: 'primary',
      usePetAvatar: true,
      score: 10000,
    });
  }

  return {
    pendingRequests: pendingRequests.sort((a, b) => b.score - a.score),
    actionItems: actionItems.sort((a, b) => b.score - a.score).slice(0, 5),
  };
}

/** @deprecated Use collectAdoptionInboxActionSections */
export function collectNeedsYouAdoptionItems(params: {
  adoptionThreads: ChatThread[];
  records: AdoptionRecord[];
  listings: AdoptionListing[];
  requests: AdoptionRequest[];
  currentUserId: string;
}): NeedsYouInboxItem[] {
  const { pendingRequests, actionItems } = collectAdoptionInboxActionSections(params);
  return [...pendingRequests, ...actionItems]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
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

function unifiedInboxScore(recencyMs: number, unread: number): number {
  // Sort newest-first; unread only breaks ties at the same timestamp.
  return recencyMs + (unread > 0 ? 0.001 : 0);
}

export function collectAdoptionParticipantIds(threads: ChatThread[]): Set<string> {
  return new Set(threads.map(t => t.participantId));
}

export function filterDmThreadsOverlappingAdoption(
  dmThreads: ChatThread[],
  adoptionThreads: ChatThread[],
): ChatThread[] {
  const adoptionPeers = collectAdoptionParticipantIds(adoptionThreads);
  return dmThreads.filter(t => !adoptionPeers.has(t.participantId));
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
        display.titleSuffix ?? '',
        display.sublineLead,
        display.sublineAccent ?? '',
        thread.rescueContext ? 'Rescue help' : '',
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
      score: unifiedInboxScore(recencyMillisFromThreadTime(thread.time), thread.unread),
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
      score: unifiedInboxScore(recencyMillisFromCirclePreview(preview), preview.unread),
    });
  }

  for (const thread of filterDmThreadsOverlappingAdoption(dmThreads, adoptionThreads)) {
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
      score: unifiedInboxScore(recencyMillisFromThreadTime(thread.time), thread.unread),
    });
  }

  return items.sort((a, b) => b.score - a.score);
}

export type RescueInboxItem =
  | {
    kind: 'adoption';
    key: string;
    thread: ChatThread;
    group: AdoptionChatGroup;
    score: number;
  }
  | {
    kind: 'dm';
    key: string;
    thread: ChatThread;
    score: number;
  };

/** Rescue tab: adoption threads with rescue context + rescue-only DMs (no adoption overlap). */
export function buildRescueInboxItems(params: {
  adoptionThreads: ChatThread[];
  dmThreads: ChatThread[];
  records: AdoptionRecord[];
  listings: AdoptionListing[];
  requests: AdoptionRequest[];
  currentUserId: string;
  rescuePeerIds: Set<string>;
  isRescueDmThread: (thread: ChatThread) => boolean;
  query?: string;
}): RescueInboxItem[] {
  const {
    adoptionThreads,
    dmThreads,
    records,
    listings,
    requests,
    currentUserId,
    rescuePeerIds,
    isRescueDmThread,
    query = '',
  } = params;

  const items: RescueInboxItem[] = [];
  const groups = groupAdoptionChatThreads(adoptionThreads, records, listings, currentUserId);

  for (const thread of adoptionThreads) {
    if (!rescuePeerIds.has(thread.participantId)) continue;
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
        display.titleSuffix ?? '',
        display.sublineLead,
        display.sublineAccent ?? '',
        'Rescue help',
        thread.participantName ?? '',
        thread.participantHandle ?? '',
        thread.preview,
        thread.rescueContext?.caseName ?? '',
      ].join(' ').toLowerCase();
      if (!hay.includes(query)) continue;
    }
    items.push({
      kind: 'adoption',
      key: `rescue-adoption-${thread.id}`,
      thread,
      group,
      score: unifiedInboxScore(recencyMillisFromThreadTime(thread.time), thread.unread),
    });
  }

  for (const thread of filterDmThreadsOverlappingAdoption(
    dmThreads.filter(isRescueDmThread),
    adoptionThreads,
  )) {
    if (query) {
      const name = (thread.participantName ?? thread.participantId).toLowerCase();
      const handle = (thread.participantHandle ?? '').toLowerCase();
      const caseName = (thread.rescueContext?.caseName ?? '').toLowerCase();
      if (
        !name.includes(query)
        && !handle.includes(query)
        && !caseName.includes(query)
        && !thread.preview.toLowerCase().includes(query)
      ) {
        continue;
      }
    }
    items.push({
      kind: 'dm',
      key: `rescue-dm-${thread.id}`,
      thread,
      score: unifiedInboxScore(recencyMillisFromThreadTime(thread.time), thread.unread),
    });
  }

  return items.sort((a, b) => b.score - a.score);
}
