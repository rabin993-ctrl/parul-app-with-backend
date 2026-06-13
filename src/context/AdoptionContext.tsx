import React, {
  createContext, useCallback, useContext, useEffect, useMemo,
} from 'react';
import { registerDevReset } from '../dev/devResetRegistry';
import type { AdoptionRecord, AdoptionUpdatePayload } from '../data/adoptionRecords';
import {
  enforceAdoptionRecordIntegrity,
  syncAllRecordStatuses,
  type AdoptionUpdatePrompt,
} from '../data/adoptionRecords';
import {
  getActivePrompt,
  canPosterAddPlacementNote,
  canPosterEndorse,
  canPosterPostNote,
  getNextUpdateSummaryFromConfirmedAt,
} from '../utils/adoptionUpdateSchedule';
import { useAdoptionRecords } from '../hooks/useAdoptionRecords';
import { useAdoptionThreads } from '../hooks/useAdoptionThreads';

export type ChatMessage = {
  id: string;
  threadId: string;
  kind: 'text' | 'system' | 'update_request';
  senderId?: string;
  text: string;
  time: string;
  recordId?: string;
};

export type ChatThread = {
  id: string;
  participantId: string;
  preview: string;
  time: string;
  unread: number;
  adoptionPostId?: string;
  adoptionRecordId?: string;
};

export type AdoptionNotification = {
  id: string;
  type: 'update_request' | 'adoption_confirmed' | 'endorsement_received';
  recordId: string;
  petName: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  recipientId: string;
  milestoneId?: string;
};

function buildPrompts(records: AdoptionRecord[]): AdoptionUpdatePrompt[] {
  const prompts: AdoptionUpdatePrompt[] = [];
  for (const record of records) {
    if (record.status === 'pending_confirmation' || record.status === 'closed') continue;
    const active = getActivePrompt(record);
    if (!active) continue;
    prompts.push({
      id: `prompt-${record.id}-${active.milestone.id}`,
      recordId: record.id,
      petName: record.petName,
      recipientId: record.adopterId,
      milestoneId: active.milestone.id,
      milestoneLabel: active.milestone.label,
      promptText: active.milestone.prompt,
      overdue: active.overdue,
      overdueDays: active.overdueDays,
    });
  }
  return prompts;
}

type AdoptionContextValue = {
  records: AdoptionRecord[];
  threads: ChatThread[];
  messages: Record<string, ChatMessage[]>;
  updatePrompts: AdoptionUpdatePrompt[];
  adoptionNotifications: AdoptionNotification[];
  getThreadMessages: (threadId: string) => ChatMessage[];
  getPromptsForUser: (userId: string) => AdoptionUpdatePrompt[];
  getNotificationsForUser: (userId: string) => AdoptionNotification[];
  sendMessage: (threadId: string, text: string, senderId?: string) => void;
  proposeAdoption: (params: {
    threadId: string;
    adoptionPostId: string;
    posterId: string;
    adopterId: string;
    petName: string;
    species: string;
    icon: string;
    tint: string;
  }) => void;
  confirmAdoption: (recordId: string) => void;
  relistAdoptionPlacement: (recordId: string) => {
    listingId: string;
    adopterId: string;
    threadId?: string;
  } | null;
  getRecordByThread: (threadId: string) => AdoptionRecord | undefined;
  submitAdopterUpdate: (recordId: string, payload: AdoptionUpdatePayload) => void;
  submitPosterPlacement: (recordId: string, text: string) => void;
  submitPosterEndorsement: (
    recordId: string,
    recommendation: 'recommended' | 'not_recommended',
    text?: string,
  ) => void;
  submitAdopterResponse: (recordId: string, text: string) => void;
  dismissNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  canAddPlacementNote: (recordId: string, posterId: string) => boolean;
  canPostOwnerNote: (recordId: string, posterId: string) => boolean;
  canEndorse: (recordId: string, posterId: string) => boolean;
  ensureAdoptionRequestThread: (params: {
    listingId: string;
    peerId: string;
    threadId?: string;
  }) => ChatThread;
  dismissAdoptionThread: (threadId: string) => void;
};

const AdoptionContext = createContext<AdoptionContextValue | null>(null);

export function AdoptionProvider({ children }: { children: React.ReactNode }) {
  const {
    records: rawRecords, adoptionNotifications,
    proposeAdoption: proposeAdoptionRpc, confirmAdoption: confirmAdoptionRpc,
    relistAdoptionPlacement, submitAdopterUpdate, submitPosterPlacement,
    submitPosterEndorsement, submitAdopterResponse,
    dismissNotification, markNotificationRead: markRecordNotifRead,
    reload: reloadRecords,
  } = useAdoptionRecords();

  const {
    threads, messages, sendMessage: sendDbMessage,
    ensureAdoptionRequestThread, appendSystemMessage, dismissThread,
    patchThread, reload: reloadThreads,
  } = useAdoptionThreads();

  // Apply client-side status sync (milestone math)
  const records = useMemo(
    () => syncAllRecordStatuses([...rawRecords]),
    [rawRecords],
  );

  const resetDevState = useCallback(() => {
    reloadRecords();
    reloadThreads();
  }, [reloadRecords, reloadThreads]);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

  const updatePrompts = useMemo(() => buildPrompts(records), [records]);

  const getThreadMessages = useCallback(
    (threadId: string) => messages[threadId] ?? [],
    [messages],
  );

  const getPromptsForUser = useCallback(
    (userId: string) => updatePrompts.filter(p => p.recipientId === userId),
    [updatePrompts],
  );

  const getNotificationsForUser = useCallback(
    (userId: string) => adoptionNotifications.filter(n => n.recipientId === userId),
    [adoptionNotifications],
  );

  const sendMessage = useCallback((threadId: string, text: string, senderId?: string) => {
    sendDbMessage(threadId, text, senderId);
  }, [sendDbMessage]);

  const proposeAdoption = useCallback((params: {
    threadId: string;
    adoptionPostId: string;
    posterId: string;
    adopterId: string;
    petName: string;
    species: string;
    icon: string;
    tint: string;
  }) => {
    const nowMs = Date.now();
    proposeAdoptionRpc(params).then(recordId => {
      if (!recordId) return;

      // Patch thread to link the real record id
      if (params.threadId) {
        patchThread(params.threadId, { adoptionRecordId: recordId });
      }

      // Append system messages to the thread
      if (params.threadId) {
        appendSystemMessage(
          params.threadId,
          `${params.petName} marked as adopted`,
        );
        appendSystemMessage(
          params.threadId,
          'Adoption confirmed 🐾 · Share a 1-week check-in soon',
        );
        appendSystemMessage(
          params.threadId,
          getNextUpdateSummaryFromConfirmedAt(nowMs),
          'update_request',
          recordId,
        );
      }
    });
  }, [proposeAdoptionRpc, appendSystemMessage, patchThread]);

  const confirmAdoption = useCallback((recordId: string) => {
    const nowMs = Date.now();
    const target = records.find(r => r.id === recordId);

    confirmAdoptionRpc(recordId).then(() => {
      if (target?.chatThreadId) {
        appendSystemMessage(
          target.chatThreadId,
          'Adoption confirmed 🐾 · Share a 1-week check-in soon',
        );
        appendSystemMessage(
          target.chatThreadId,
          getNextUpdateSummaryFromConfirmedAt(nowMs),
          'update_request',
          recordId,
        );
      }
    });
  }, [records, confirmAdoptionRpc, appendSystemMessage]);

  const getRecordByThread = useCallback(
    (threadId: string) => records.find(r => r.chatThreadId === threadId),
    [records],
  );

  const canAddPlacementNote = useCallback(
    (recordId: string, posterId: string) => {
      const r = records.find(x => x.id === recordId);
      return r ? canPosterAddPlacementNote(r, posterId) : false;
    },
    [records],
  );

  const canPostOwnerNote = useCallback(
    (recordId: string, posterId: string) => {
      const r = records.find(x => x.id === recordId);
      return r ? canPosterPostNote(r, posterId) : false;
    },
    [records],
  );

  const canEndorse = useCallback(
    (recordId: string, posterId: string) => {
      const r = records.find(x => x.id === recordId);
      return r ? canPosterEndorse(r, posterId) : false;
    },
    [records],
  );

  const dismissAdoptionThread = useCallback((threadId: string) => {
    dismissThread(threadId);
  }, [dismissThread]);

  const markNotificationRead = useCallback((id: string) => {
    markRecordNotifRead(id);
  }, [markRecordNotifRead]);

  const value = useMemo<AdoptionContextValue>(() => ({
    records,
    threads,
    messages,
    updatePrompts,
    adoptionNotifications,
    getThreadMessages,
    getPromptsForUser,
    getNotificationsForUser,
    sendMessage,
    proposeAdoption,
    confirmAdoption,
    relistAdoptionPlacement,
    getRecordByThread,
    submitAdopterUpdate,
    submitPosterPlacement,
    submitPosterEndorsement,
    submitAdopterResponse,
    dismissNotification,
    markNotificationRead,
    canAddPlacementNote,
    canPostOwnerNote,
    canEndorse,
    ensureAdoptionRequestThread,
    dismissAdoptionThread,
  }), [
    records, threads, messages, updatePrompts, adoptionNotifications,
    getThreadMessages, getPromptsForUser, getNotificationsForUser,
    sendMessage, proposeAdoption, confirmAdoption, relistAdoptionPlacement, getRecordByThread,
    submitAdopterUpdate, submitPosterPlacement, submitPosterEndorsement, submitAdopterResponse,
    dismissNotification, markNotificationRead, canAddPlacementNote, canPostOwnerNote, canEndorse,
    ensureAdoptionRequestThread, dismissAdoptionThread,
  ]);

  return (
    <AdoptionContext.Provider value={value}>
      {children}
    </AdoptionContext.Provider>
  );
}

export function useAdoption() {
  const ctx = useContext(AdoptionContext);
  if (!ctx) throw new Error('useAdoption must be used within AdoptionProvider');
  return ctx;
}

/** Safe for Avatar etc. — returns null outside AdoptionProvider. */
export function useOptionalAdoption() {
  return useContext(AdoptionContext);
}
