import { canPosterRelistAdoption, type AdoptionRecord } from '../data/adoptionRecords';
import type { ChatThread } from '../context/AdoptionContext';
import type { AdoptionListing } from '../data/adoptionData';
import type { AdoptionRequest } from '../context/AdoptionFeedContext';
import { companions, posts, users } from '../data/mockData';
import {
  formatUpdateDueDate,
  getActivePrompt,
  getNextUpdateSummary,
} from './adoptionUpdateSchedule';

export type ThreadPetVisual = {
  petName: string;
  icon: string;
  tint: string;
  species?: string;
};

export type ThreadStatusTone = 'primary' | 'warning' | 'success' | 'info' | 'neutral';

export type ThreadAdoptionMeta = {
  isAdoption: boolean;
  petName?: string;
  role: 'adopter' | 'poster' | 'inquiry';
  roleLabel: string;
  statusLabel: string;
  statusTone: ThreadStatusTone;
  needsAction: boolean;
  actionLabel?: string;
  contextLine: string;
};

function findRecord(thread: ChatThread, records: AdoptionRecord[]): AdoptionRecord | undefined {
  if (thread.adoptionRecordId) {
    return records.find(r => r.id === thread.adoptionRecordId);
  }
  return records.find(r => r.chatThreadId === thread.id);
}

function petFromAdoptionPost(postId?: string): ThreadPetVisual | null {
  if (!postId) return null;
  const post = posts.find(p => p.id === postId);
  const companionId = post?.companions?.[0];
  if (!companionId) return null;
  const c = companions[companionId];
  if (!c) return null;
  return {
    petName: c.name,
    icon: c.icon,
    tint: c.tint,
    species: c.species,
  };
}

export function getThreadPetVisual(
  thread: ChatThread,
  records: AdoptionRecord[],
): ThreadPetVisual | null {
  const meta = getThreadAdoptionMeta(thread, records);
  if (!meta?.isAdoption) return null;

  const record = findRecord(thread, records);
  if (record) {
    return {
      petName: record.petName,
      icon: record.icon,
      tint: record.tint,
      species: record.species,
    };
  }

  const fromPost = petFromAdoptionPost(thread.adoptionPostId);
  if (fromPost) return fromPost;

  return {
    petName: meta.petName ?? 'Pet',
    icon: 'paw',
    tint: '#14A697',
  };
}

export function getThreadAdoptionMeta(
  thread: ChatThread,
  records: AdoptionRecord[],
): ThreadAdoptionMeta | null {
  const record = findRecord(thread, records);
  if (!thread.adoptionPostId && !record) return null;

  const petName = record?.petName;
  const isAdopter = record?.adopterId === 'you';
  const isPoster = record?.posterId === 'you';

  let role: ThreadAdoptionMeta['role'] = 'inquiry';
  let roleLabel = 'Adoption inquiry';
  if (isAdopter) {
    role = 'adopter';
    roleLabel = 'You\'re adopting';
  } else if (isPoster) {
    role = 'poster';
    roleLabel = 'You\'re rehoming';
  } else if (thread.adoptionPostId) {
    roleLabel = 'Adoption chat';
  }

  let statusLabel = 'In conversation';
  let statusTone: ThreadStatusTone = 'info';
  let needsAction = false;
  let actionLabel: string | undefined;

  if (record) {
    switch (record.status) {
      case 'pending_confirmation':
        statusLabel = 'Adopted';
        statusTone = 'success';
        break;
      case 'update_due':
        statusLabel = 'Update requested';
        statusTone = 'warning';
        if (isAdopter) {
          needsAction = true;
          actionLabel = 'Post home update';
        }
        break;
      case 'confirmed': {
        const prompt = getActivePrompt(record);
        if (prompt && isAdopter) {
          statusLabel = prompt.overdue ? 'Post home update' : 'Check-in due';
          statusTone = prompt.overdue ? 'warning' : 'primary';
          needsAction = true;
          actionLabel = 'Post home update';
        } else if (prompt && isPoster) {
          statusLabel = prompt.overdue ? 'Update requested' : 'Check-in due';
          statusTone = prompt.overdue ? 'warning' : 'primary';
        } else {
          statusLabel = 'Adopted';
          statusTone = 'success';
        }
        break;
      }
      case 'closed':
        statusLabel = record.closedReason === 'relisted' ? 'Re-listed' : 'Closed';
        statusTone = 'neutral';
        break;
      default:
        break;
    }
  }

  const petPart = petName ? `${petName}` : 'Adoption';
  const contextLine = petName
    ? `${roleLabel} · ${petName}`
    : roleLabel;

  return {
    isAdoption: true,
    petName,
    role,
    roleLabel,
    statusLabel,
    statusTone,
    needsAction,
    actionLabel,
    contextLine: `${petPart} · ${statusLabel}`,
  };
}

function findRecordForThread(thread: ChatThread, records: AdoptionRecord[]): AdoptionRecord | undefined {
  if (thread.adoptionRecordId) {
    return records.find(r => r.id === thread.adoptionRecordId);
  }
  return records.find(r => r.chatThreadId === thread.id);
}

/** Inbox preview — prefer calculated next-update date over stale system copy */
export function getThreadDisplayPreview(
  thread: ChatThread,
  records: AdoptionRecord[],
  fallbackPreview: string,
): string {
  const record = findRecordForThread(thread, records);
  if (!record || record.status === 'pending_confirmation') return fallbackPreview;

  const summary = getNextUpdateSummary(record);
  if (!summary) return fallbackPreview;

  const staleSystem = /Home update schedule|check-in soon/i.test(fallbackPreview);
  const hasActivePrompt = getActivePrompt(record) != null;

  if (hasActivePrompt || staleSystem || record.status === 'update_due') {
    return summary;
  }

  return fallbackPreview;
}

export function groupThreads(
  threads: ChatThread[],
  records: AdoptionRecord[],
): {
  action: ChatThread[];
  adoption: ChatThread[];
  general: ChatThread[];
} {
  const action: ChatThread[] = [];
  const adoption: ChatThread[] = [];
  const general: ChatThread[] = [];

  for (const thread of threads) {
    const meta = getThreadAdoptionMeta(thread, records);
    if (meta?.needsAction) {
      action.push(thread);
    } else if (meta?.isAdoption) {
      adoption.push(thread);
    } else {
      general.push(thread);
    }
  }

  return { action, adoption, general };
}

export type AdoptionChatGroup = {
  key: string;
  listingId: string | null;
  petName: string;
  petVisual: ThreadPetVisual | null;
  isMyListing: boolean;
  threads: ChatThread[];
  totalUnread: number;
};

function threadRecencyScore(thread: ChatThread): number {
  if (thread.unread > 0) return 1000 + thread.unread;
  if (thread.time === 'Now') return 500;
  if (thread.time.endsWith('m')) return 400 - parseInt(thread.time, 10);
  if (thread.time.endsWith('h')) return 300 - parseInt(thread.time, 10);
  if (thread.time.endsWith('d')) return 200 - parseInt(thread.time, 10);
  return 100;
}

function resolveListingForThread(
  thread: ChatThread,
  listings: AdoptionListing[],
): AdoptionListing | undefined {
  if (!thread.adoptionPostId) return undefined;
  return listings.find(l => l.id === thread.adoptionPostId);
}

export function groupAdoptionChatThreads(
  threads: ChatThread[],
  records: AdoptionRecord[],
  listings: AdoptionListing[],
): AdoptionChatGroup[] {
  const adoptionThreads = threads.filter(t => getThreadAdoptionMeta(t, records)?.isAdoption);
  const byListing = new Map<string, ChatThread[]>();

  for (const thread of adoptionThreads) {
    const key = thread.adoptionPostId ?? thread.id;
    const group = byListing.get(key) ?? [];
    group.push(thread);
    byListing.set(key, group);
  }

  const groups: AdoptionChatGroup[] = [];

  for (const [listingKey, groupThreads] of byListing) {
    const listing = resolveListingForThread(groupThreads[0], listings);
    const petVisual = getThreadPetVisual(groupThreads[0], records);
    const record = records.find(
      r => r.adoptionPostId === listingKey
        || groupThreads.some(t => t.adoptionRecordId === r.id || r.chatThreadId === t.id),
    );
    const isMyListing = listing?.userId === 'you' || record?.posterId === 'you';

    groups.push({
      key: listingKey,
      listingId: listing?.id ?? (groupThreads[0].adoptionPostId ? listingKey : null),
      petName: listing?.name ?? petVisual?.petName ?? 'Adoption',
      petVisual,
      isMyListing,
      threads: [...groupThreads].sort((a, b) => threadRecencyScore(b) - threadRecencyScore(a)),
      totalUnread: groupThreads.reduce((sum, t) => sum + t.unread, 0),
    });
  }

  return groups.sort((a, b) => {
    if (b.totalUnread !== a.totalUnread) return b.totalUnread - a.totalUnread;
    const aScore = Math.max(...a.threads.map(threadRecencyScore));
    const bScore = Math.max(...b.threads.map(threadRecencyScore));
    return bScore - aScore;
  });
}

export function getThreadPartnerName(thread: ChatThread): string {
  const user = users[thread.participantId as keyof typeof users];
  return user?.name.split(' ')[0] ?? 'Someone';
}

export type ChatSublineTone = 'default' | 'primary' | 'warning' | 'success';

const ADOPTION_DETAIL_ACCENT_LABELS = new Set([
  'Post home update',
  'Check-in due',
  'Update requested',
  'Adopted',
]);

/** Care-status accents in chat headers/lists deep-link to AdoptedDetail when a record exists. */
export function sublineAccentOpensAdoptionDetail(accent?: string): boolean {
  return !!accent && ADOPTION_DETAIL_ACCENT_LABELS.has(accent);
}

export function chatSublineAccentColor(
  tone: ChatSublineTone,
  colors: { primary: string; warning: string; success: string; textSecondary: string },
): string {
  switch (tone) {
    case 'primary': return colors.primary;
    case 'warning': return colors.warning;
    case 'success': return colors.success;
    default: return colors.textSecondary;
  }
}

export type ThreadChatDisplay = {
  title: string;
  sublineLead: string;
  sublineAccent?: string;
  sublineTone: ChatSublineTone;
  usePetAvatar: boolean;
  isUnread: boolean;
};

export type AdoptionChatPanelKind =
  | 'mark_adopted'
  | 'status'
  | 'check_in'
  | 'relist';

export type AdoptionChatStatus = {
  title: string;
  sublineLead: string;
  sublineAccent?: string;
  sublineTone: ChatSublineTone;
  usePetAvatar: boolean;
  isUnread: boolean;
  needsAction: boolean;
  isPoster: boolean;
  isAdopter: boolean;
  petName: string;
  panelKind: AdoptionChatPanelKind;
  panelStatusLabel?: string;
  panelStatusTone?: ChatSublineTone;
  panelHint?: string;
  panelMilestone?: string;
  panelDueLabel?: string;
  panelOverdueDays?: number;
  panelButtonLabel?: string;
};

function findThreadRequest(
  thread: ChatThread,
  requests: AdoptionRequest[],
  listingId: string | null | undefined,
  isPoster: boolean,
): AdoptionRequest | undefined {
  if (!listingId) return undefined;
  const requesterId = isPoster ? thread.participantId : 'you';
  return requests.find(r => (
    r.listingId === listingId
    && r.requesterId === requesterId
    && (r.threadId === thread.id || !r.threadId)
  ));
}

/** Pre-adoption threads whose request was rejected — hidden from Chats (inbox already filters these). */
export function isDismissedAdoptionThread(
  thread: ChatThread,
  records: AdoptionRecord[],
  listings: AdoptionListing[],
  requests: AdoptionRequest[],
  group: AdoptionChatGroup,
): boolean {
  const record = records.find(
    r => r.id === thread.adoptionRecordId || r.chatThreadId === thread.id,
  );
  if (record) return false;
  if (!thread.adoptionPostId) return false;

  const listing = resolveListingForThread(thread, listings);
  const isPoster = group.isMyListing || listing?.userId === 'you';
  const listingId = thread.adoptionPostId ?? group.listingId;
  const request = findThreadRequest(thread, requests, listingId, isPoster);
  return request?.status === 'rejected';
}

/** Single source of truth for list rows, chat headers, and adoption panels */
export function resolveAdoptionChatStatus(
  thread: ChatThread,
  records: AdoptionRecord[],
  listings: AdoptionListing[],
  requests: AdoptionRequest[],
  group: AdoptionChatGroup,
): AdoptionChatStatus | null {
  const user = users[thread.participantId as keyof typeof users];
  if (!user) return null;

  const record = records.find(
    r => r.id === thread.adoptionRecordId || r.chatThreadId === thread.id,
  );
  const listing = resolveListingForThread(thread, listings);
  const isPoster = group.isMyListing || listing?.userId === 'you' || record?.posterId === 'you';
  const listingId = thread.adoptionPostId ?? group.listingId;
  const request = findThreadRequest(thread, requests, listingId, isPoster);
  const isAdopter = record?.adopterId === 'you'
    || (!isPoster && request?.requesterId === 'you');
  const petName = group.petName;
  const partnerName = getThreadPartnerName(thread);
  const isUnread = thread.unread > 0;
  const activePrompt = record ? getActivePrompt(record) : null;
  const nextUpdateLine = record ? getNextUpdateSummary(record) : null;
  const fosterName = record
    ? users[record.posterId as keyof typeof users]?.name ?? 'Foster'
    : user.name;

  const base = {
    isUnread,
    isPoster,
    isAdopter,
    petName,
  };

  if (!record && request?.status === 'rejected') {
    return null;
  }

  if (thread.adoptionPostId && !record && isPoster) {
    const accent = request?.status === 'submitted' ? 'New request' : 'In chat';
    const inChat = request?.status === 'approved';
    return {
      ...base,
      title: user.name,
      sublineLead: petName,
      sublineAccent: accent,
      sublineTone: request?.status === 'submitted' ? 'primary' : 'default',
      usePetAvatar: false,
      needsAction: false,
      panelKind: inChat ? 'mark_adopted' : 'status',
      panelStatusLabel: accent,
      panelStatusTone: request?.status === 'submitted' ? 'primary' : 'default',
      panelHint: request?.status === 'submitted'
        ? `Review ${user.name.split(' ')[0]}'s request for ${petName}.`
        : `Mark ${petName} adopted once you've agreed on a home.`,
      panelButtonLabel: 'Mark as adopted',
    };
  }

  if (thread.adoptionPostId && !record && isAdopter) {
    const accent = request?.status === 'submitted' ? 'Requested' : 'In chat';
    return {
      ...base,
      title: petName,
      sublineLead: `with ${partnerName}`,
      sublineAccent: accent,
      sublineTone: request?.status === 'submitted' ? 'primary' : 'default',
      usePetAvatar: true,
      needsAction: false,
      panelKind: 'status',
      panelStatusLabel: accent,
      panelStatusTone: request?.status === 'submitted' ? 'primary' : 'default',
      panelHint: request?.status === 'submitted'
        ? `Waiting for ${fosterName} to reply about ${petName}.`
        : `Keep chatting — ${fosterName} will mark ${petName} adopted when ready.`,
    };
  }

  if (record && isPoster && canPosterRelistAdoption(record)) {
    const adopterFirst = user.name.split(' ')[0];
    const updateRequested = !!activePrompt?.overdue;
    const accent = updateRequested ? 'Update requested' : 'Adopted';
    const accentTone: ChatSublineTone = updateRequested ? 'warning' : 'success';
    const panelHint = updateRequested
      ? `${adopterFirst}'s ${activePrompt!.milestone.label.toLowerCase()} is ${activePrompt!.overdueDays} day${activePrompt!.overdueDays !== 1 ? 's' : ''} overdue. ${petName} stays adopted under your listing — re-list if the placement didn't work out. This chat will be cleared.`
      : `${petName} is marked adopted under your listing. Re-list if ${adopterFirst} returns ${petName} or the placement didn't work out. This chat will be cleared.`;

    return {
      ...base,
      title: user.name,
      sublineLead: petName,
      sublineAccent: accent,
      sublineTone: accentTone,
      usePetAvatar: false,
      needsAction: false,
      panelKind: 'relist',
      panelStatusLabel: accent,
      panelStatusTone: accentTone,
      panelHint,
      panelButtonLabel: 'Re-list for adoption',
    };
  }

  if (record?.status === 'pending_confirmation') {
    return {
      ...base,
      title: isPoster ? user.name : petName,
      sublineLead: isPoster ? petName : `with ${partnerName}`,
      sublineAccent: 'Adopted',
      sublineTone: 'success',
      usePetAvatar: !isPoster,
      needsAction: false,
      panelKind: 'status',
      panelStatusLabel: 'Adopted',
      panelStatusTone: 'success',
      panelHint: isAdopter
        ? `${fosterName} marked ${petName} as adopted.`
        : `${petName} is marked adopted.`,
    };
  }

  if (record && activePrompt && isAdopter) {
    const tone: ChatSublineTone = activePrompt.overdue ? 'warning' : 'primary';
    const dueLabel = activePrompt.overdue
      ? `${activePrompt.overdueDays} day${activePrompt.overdueDays !== 1 ? 's' : ''} overdue`
      : `due ${formatUpdateDueDate(activePrompt.dueMs)}`;

    return {
      ...base,
      title: petName,
      sublineLead: `with ${partnerName}`,
      sublineAccent: activePrompt.overdue ? 'Post home update' : 'Check-in due',
      sublineTone: tone,
      usePetAvatar: true,
      needsAction: true,
      panelKind: 'check_in',
      panelMilestone: activePrompt.milestone.label,
      panelDueLabel: dueLabel,
      panelOverdueDays: activePrompt.overdue ? activePrompt.overdueDays : undefined,
      panelButtonLabel: 'Post home update',
    };
  }

  if (record?.status === 'confirmed' || record?.status === 'update_due') {
    return {
      ...base,
      title: isPoster ? user.name : petName,
      sublineLead: isPoster ? petName : `with ${partnerName}`,
      sublineAccent: 'Adopted',
      sublineTone: 'success',
      usePetAvatar: !isPoster,
      needsAction: false,
      panelKind: 'status',
      panelStatusLabel: 'Adopted',
      panelStatusTone: 'success',
      panelHint: nextUpdateLine ?? (isAdopter
        ? 'On track — view timeline on your Adopted tab'
        : `${petName} is home with ${user.name.split(' ')[0]}.`),
    };
  }

  if (record) {
    return {
      ...base,
      title: isPoster ? user.name : petName,
      sublineLead: isPoster ? petName : `with ${partnerName}`,
      sublineAccent: 'Adopted',
      sublineTone: 'success',
      usePetAvatar: !isPoster,
      needsAction: false,
      panelKind: 'status',
      panelStatusLabel: 'Adopted',
      panelStatusTone: 'success',
      panelHint: nextUpdateLine ?? (isAdopter
        ? 'On track — view timeline on your Adopted tab'
        : `${petName} is home with ${user.name.split(' ')[0]}.`),
    };
  }

  return null;
}

export function getThreadChatDisplay(
  thread: ChatThread,
  records: AdoptionRecord[],
  listings: AdoptionListing[],
  requests: AdoptionRequest[],
  group: AdoptionChatGroup,
): ThreadChatDisplay | null {
  const status = resolveAdoptionChatStatus(thread, records, listings, requests, group);
  if (!status) return null;
  return {
    title: status.title,
    sublineLead: status.sublineLead,
    sublineAccent: status.sublineAccent,
    sublineTone: status.sublineTone,
    usePetAvatar: status.usePetAvatar,
    isUnread: status.isUnread,
  };
}

export type AdoptionChatSectionId = 'action' | 'my-listings' | 'adopting';

export type AdoptionChatSectionItem =
  | { kind: 'thread'; thread: ChatThread; group: AdoptionChatGroup }
  | { kind: 'pet-group'; group: AdoptionChatGroup; threads: ChatThread[] };

export type AdoptionChatSection = {
  id: AdoptionChatSectionId;
  label: string;
  hint: string;
  items: AdoptionChatSectionItem[];
};

type AdoptionChatPhase = 'ongoing' | 'attention' | 'settled';

const PHASE_SORT_BASE: Record<AdoptionChatPhase, number> = {
  ongoing: 300,
  attention: 200,
  settled: 100,
};

const ACCENT_SORT_ORDER: Record<string, number> = {
  'New request': 40,
  Requested: 35,
  'In chat': 30,
  'Post home update': 25,
  'Check-in due': 22,
  'Update requested': 20,
  Adopted: 10,
};

function adoptionChatPhase(accent?: string): AdoptionChatPhase {
  switch (accent) {
    case 'New request':
    case 'In chat':
    case 'Requested':
      return 'ongoing';
    case 'Post home update':
    case 'Check-in due':
    case 'Update requested':
      return 'attention';
    default:
      return 'settled';
  }
}

export function threadSortScore(
  thread: ChatThread,
  records: AdoptionRecord[],
  listings: AdoptionListing[],
  requests: AdoptionRequest[],
  group: AdoptionChatGroup,
): number {
  const status = resolveAdoptionChatStatus(thread, records, listings, requests, group);
  if (!status) return 0;
  const phase = adoptionChatPhase(status.sublineAccent);
  let score = PHASE_SORT_BASE[phase];
  score += ACCENT_SORT_ORDER[status.sublineAccent ?? ''] ?? 5;
  if (status.needsAction) score += 50;
  if (status.isUnread) score += 30;
  score += threadRecencyScore(thread) / 100;
  return score;
}

function sortThreads(
  threads: ChatThread[],
  records: AdoptionRecord[],
  listings: AdoptionListing[],
  requests: AdoptionRequest[],
  group: AdoptionChatGroup,
): ChatThread[] {
  return [...threads].sort(
    (a, b) => threadSortScore(b, records, listings, requests, group)
      - threadSortScore(a, records, listings, requests, group),
  );
}

function petGroupSortScore(
  threads: ChatThread[],
  records: AdoptionRecord[],
  listings: AdoptionListing[],
  requests: AdoptionRequest[],
  group: AdoptionChatGroup,
): number {
  if (threads.length === 0) return 0;
  const top = threadSortScore(threads[0], records, listings, requests, group);
  const unread = threads.reduce((sum, t) => sum + t.unread, 0);
  return top + unread * 5;
}

function buildPetGroupItems(
  groups: AdoptionChatGroup[],
  threadFilter: (thread: ChatThread, group: AdoptionChatGroup) => boolean,
  records: AdoptionRecord[],
  listings: AdoptionListing[],
  requests: AdoptionRequest[],
): AdoptionChatSectionItem[] {
  const petGroups: { group: AdoptionChatGroup; threads: ChatThread[]; score: number }[] = [];

  for (const group of groups) {
    const visibleThreads = sortThreads(
      group.threads.filter(t => threadFilter(t, group)),
      records,
      listings,
      requests,
      group,
    );
    if (visibleThreads.length === 0) continue;
    petGroups.push({
      group,
      threads: visibleThreads,
      score: petGroupSortScore(visibleThreads, records, listings, requests, group),
    });
  }

  petGroups.sort((a, b) => b.score - a.score);

  return petGroups.map(({ group, threads }) => ({
    kind: 'pet-group' as const,
    group,
    threads,
  }));
}

export function categorizeAdoptionChatSections(
  threads: ChatThread[],
  records: AdoptionRecord[],
  listings: AdoptionListing[],
  requests: AdoptionRequest[],
): AdoptionChatSection[] {
  const groups = groupAdoptionChatThreads(threads, records, listings);
  const actionThreads = new Set<ChatThread>();
  for (const thread of threads) {
    const group = groups.find(g => g.threads.some(t => t.id === thread.id));
    if (!group) continue;
    if (isDismissedAdoptionThread(thread, records, listings, requests, group)) continue;
    const status = resolveAdoptionChatStatus(thread, records, listings, requests, group);
    if (status?.needsAction) actionThreads.add(thread);
  }

  const isVisible = (thread: ChatThread, group: AdoptionChatGroup) => (
    !isDismissedAdoptionThread(thread, records, listings, requests, group)
  );

  const sections: AdoptionChatSection[] = [];

  const actionCandidates: { thread: ChatThread; group: AdoptionChatGroup }[] = [];
  for (const group of groups) {
    for (const thread of group.threads) {
      if (actionThreads.has(thread) && isVisible(thread, group)) {
        actionCandidates.push({ thread, group });
      }
    }
  }
  if (actionCandidates.length > 0) {
    actionCandidates.sort(
      (a, b) => threadSortScore(b.thread, records, listings, requests, b.group)
        - threadSortScore(a.thread, records, listings, requests, a.group),
    );
    sections.push({
      id: 'action',
      label: 'Needs you',
      hint: 'Check-ins and other steps only you can complete',
      items: actionCandidates.map(({ thread, group }) => ({ kind: 'thread', thread, group })),
    });
  }

  const listingItems = buildPetGroupItems(
    groups.filter(g => g.isMyListing),
    (t, g) => !actionThreads.has(t) && isVisible(t, g),
    records,
    listings,
    requests,
  );
  if (listingItems.length > 0) {
    sections.push({
      id: 'my-listings',
      label: 'Pets you listed',
      hint: 'People interested in pets you\'re rehoming',
      items: listingItems,
    });
  }

  const adoptingItems = buildPetGroupItems(
    groups.filter(g => !g.isMyListing),
    (t, g) => !actionThreads.has(t) && isVisible(t, g),
    records,
    listings,
    requests,
  );
  if (adoptingItems.length > 0) {
    sections.push({
      id: 'adopting',
      label: 'Pets you\'re adopting',
      hint: 'Your requests and confirmed adoptions',
      items: adoptingItems,
    });
  }

  return sections;
}
