import type { AdoptionRecord } from '../data/adoptionRecords';
import type { ChatThread } from '../context/AdoptionContext';
import { companions, posts } from '../data/mockData';
import { getActivePrompt, getNextUpdateSummary } from './adoptionUpdateSchedule';

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
        statusLabel = 'Awaiting confirmation';
        statusTone = 'primary';
        if (isAdopter) {
          needsAction = true;
          actionLabel = 'Confirm adoption';
          statusLabel = 'Confirm adoption';
          statusTone = 'warning';
        } else if (isPoster) {
          statusLabel = 'Waiting on adopter';
          statusTone = 'info';
        }
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
          statusLabel = prompt.overdue ? 'Update requested' : 'Check-in due';
          statusTone = prompt.overdue ? 'warning' : 'info';
          if (prompt.overdue) {
            needsAction = true;
            actionLabel = 'Post home update';
          }
        } else {
          statusLabel = 'Adopted';
          statusTone = 'success';
        }
        break;
      }
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
