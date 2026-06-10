import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import {
  ADOPTION_RECORDS,
  AdoptionRecord,
  AdoptionUpdatePrompt,
  syncAllRecordStatuses,
  type AdoptionUpdate,
  type AdoptionUpdatePayload,
} from '../data/adoptionRecords';
import {
  getActivePrompt,
  milestoneAfterUpdate,
  canPosterAddPlacementNote,
  canPosterEndorse,
  recomputeRecordStatus,
  getNextUpdateSummaryFromConfirmedAt,
} from '../utils/adoptionUpdateSchedule';
import { useFeedPosts } from './FeedPostContext';

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

const INITIAL_THREADS: ChatThread[] = [
  {
    id: 't-adopt-dev-pending',
    participantId: 'dev',
    preview: 'Ready to finalize Pepper\'s adoption?',
    time: '5m',
    unread: 1,
    adoptionPostId: 'p2',
    adoptionRecordId: 'ar-pending-dev',
  },
  {
    id: 't-adopt-priya',
    participantId: 'priya',
    preview: 'We can do a home visit this weekend!',
    time: '2m',
    unread: 1,
    adoptionPostId: 'p-you-adopt',
  },
  {
    id: 't-adopt-sam',
    participantId: 'sam',
    preview: 'Chhotu update — vet says all good',
    time: '1d',
    unread: 0,
    adoptionPostId: 'p-sam-adopt',
    adoptionRecordId: 'ar1',
  },
  {
    id: 't1',
    participantId: 'omar',
    preview: 'Rocky loved the park yesterday!',
    time: '2m',
    unread: 2,
  },
  {
    id: 't2',
    participantId: 'dev',
    preview: 'Thanks for the vet recommendation 🐾',
    time: '1h',
    unread: 0,
  },
];

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  't-adopt-dev-pending': [
    { id: 'md1', threadId: 't-adopt-dev-pending', kind: 'text', senderId: 'dev', text: 'Pepper loved meeting you!', time: '9:00' },
    { id: 'md2', threadId: 't-adopt-dev-pending', kind: 'text', senderId: 'you', text: 'We\'re so excited to bring her home.', time: '9:05' },
    { id: 'md3', threadId: 't-adopt-dev-pending', kind: 'system', text: 'Dev marked this adoption complete — awaiting confirmation', time: '9:10' },
    { id: 'md4', threadId: 't-adopt-dev-pending', kind: 'text', senderId: 'dev', text: 'Ready to finalize Pepper\'s adoption?', time: '9:12' },
  ],
  't-adopt-priya': [
    { id: 'm1', threadId: 't-adopt-priya', kind: 'text', senderId: 'priya', text: 'Misty sounds perfect for our apartment.', time: '10:02' },
    { id: 'm2', threadId: 't-adopt-priya', kind: 'text', senderId: 'you', text: 'Happy to arrange a meet-and-greet first.', time: '10:05' },
    { id: 'm3', threadId: 't-adopt-priya', kind: 'text', senderId: 'priya', text: 'We can do a home visit this weekend!', time: '10:08' },
  ],
  't-adopt-sam': [
    { id: 'm4', threadId: 't-adopt-sam', kind: 'text', senderId: 'sam', text: 'Chhotu is ready when you are.', time: 'Yesterday' },
    { id: 'm5', threadId: 't-adopt-sam', kind: 'system', text: 'Adoption confirmed 🐾', time: 'Yesterday' },
    { id: 'm6', threadId: 't-adopt-sam', kind: 'text', senderId: 'you', text: 'Chhotu update — vet says all good', time: '1d' },
  ],
  t1: [
    { id: 'm7', threadId: 't1', kind: 'text', senderId: 'omar', text: 'Rocky loved the park yesterday!', time: '2m' },
  ],
  t2: [
    { id: 'm8', threadId: 't2', kind: 'text', senderId: 'dev', text: 'Thanks for the vet recommendation 🐾', time: '1h' },
  ],
};

const PENDING_SEED: AdoptionRecord = {
  id: 'ar-pending-dev',
  adoptionPostId: 'p2',
  chatThreadId: 't-adopt-dev-pending',
  posterId: 'dev',
  adopterId: 'you',
  petName: 'Pepper',
  species: 'dog',
  icon: 'dog',
  tint: '#E0503F',
  status: 'pending_confirmation',
  updates: [],
};

function buildPrompts(records: AdoptionRecord[]): AdoptionUpdatePrompt[] {
  const prompts: AdoptionUpdatePrompt[] = [];
  for (const record of records) {
    if (record.status === 'pending_confirmation') continue;
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

function buildNotifications(records: AdoptionRecord[], dismissed: Set<string>): AdoptionNotification[] {
  const notifs: AdoptionNotification[] = [];
  for (const record of records) {
    const active = getActivePrompt(record);
    if (active?.overdue) {
      const nid = `n-update-${record.id}-${active.milestone.id}`;
      if (!dismissed.has(nid)) {
        notifs.push({
          id: nid,
          type: 'update_request',
          recordId: record.id,
          petName: record.petName,
          title: `Home update requested · ${record.petName}`,
          body: `${active.milestone.label} is ${active.overdueDays} days overdue. Share a quick update.`,
          time: 'Now',
          unread: true,
          recipientId: record.adopterId,
          milestoneId: active.milestone.id,
        });
      }
    }
  }
  return notifs;
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
  getRecordByThread: (threadId: string) => AdoptionRecord | undefined;
  submitAdopterUpdate: (recordId: string, payload: AdoptionUpdatePayload) => void;
  submitPosterPlacement: (recordId: string, text: string) => void;
  submitPosterEndorsement: (recordId: string, rating: number, text: string) => void;
  dismissNotification: (id: string) => void;
  markNotificationRead: (id: string) => void;
  canAddPlacementNote: (recordId: string, posterId: string) => boolean;
  canEndorse: (recordId: string, posterId: string) => boolean;
};

const AdoptionContext = createContext<AdoptionContextValue | null>(null);

export function AdoptionProvider({ children }: { children: React.ReactNode }) {
  const { setPosts } = useFeedPosts();
  const [records, setRecords] = useState<AdoptionRecord[]>(() =>
    syncAllRecordStatuses([...ADOPTION_RECORDS, PENDING_SEED]),
  );
  const [threads, setThreads] = useState<ChatThread[]>(INITIAL_THREADS);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(new Set());
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const interval = setInterval(() => {
      setRecords(prev => syncAllRecordStatuses(prev));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const updatePrompts = useMemo(() => buildPrompts(records), [records]);
  const adoptionNotifications = useMemo(() => {
    const built = buildNotifications(records, dismissedNotifIds);
    return built.map(n => ({ ...n, unread: !readNotifIds.has(n.id) }));
  }, [records, dismissedNotifIds, readNotifIds]);

  const appendMessage = useCallback((threadId: string, msg: ChatMessage) => {
    setMessages(prev => ({
      ...prev,
      [threadId]: [...(prev[threadId] ?? []), msg],
    }));
    setThreads(prev => prev.map(t => (
      t.id === threadId ? { ...t, preview: msg.text, time: msg.time } : t
    )));
  }, []);

  const patchRecord = useCallback((recordId: string, patcher: (r: AdoptionRecord) => AdoptionRecord) => {
    setRecords(prev => syncAllRecordStatuses(
      prev.map(r => (r.id === recordId ? patcher(r) : r)),
    ));
  }, []);

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

  const sendMessage = useCallback((threadId: string, text: string, senderId = 'you') => {
    appendMessage(threadId, {
      id: `m-${Date.now()}`,
      threadId,
      kind: 'text',
      senderId,
      text,
      time: 'Now',
    });
  }, [appendMessage]);

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
    const recordId = `ar-pending-${Date.now()}`;
    const record: AdoptionRecord = {
      id: recordId,
      adoptionPostId: params.adoptionPostId,
      chatThreadId: params.threadId,
      posterId: params.posterId,
      adopterId: params.adopterId,
      petName: params.petName,
      species: params.species,
      icon: params.icon,
      tint: params.tint,
      status: 'pending_confirmation',
      updates: [],
    };
    setRecords(prev => [...prev, record]);
    setThreads(prev => prev.map(t => (
      t.id === params.threadId
        ? { ...t, adoptionRecordId: recordId, adoptionPostId: params.adoptionPostId }
        : t
    )));
    appendMessage(params.threadId, {
      id: `sys-${Date.now()}`,
      threadId: params.threadId,
      kind: 'system',
      text: params.posterId === 'you'
        ? 'You marked this adoption complete — awaiting confirmation'
        : 'Poster marked this adoption complete — awaiting confirmation',
      time: 'Now',
    });
  }, [appendMessage]);

  const confirmAdoption = useCallback((recordId: string) => {
    const nowMs = Date.now();
    const now = new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    setRecords(prev => {
      const target = prev.find(r => r.id === recordId);
      if (target?.chatThreadId) {
        appendMessage(target.chatThreadId, {
          id: `sys-confirm-${Date.now()}`,
          threadId: target.chatThreadId,
          kind: 'system',
          text: 'Adoption confirmed 🐾 · Share a 1-week check-in soon',
          time: 'Now',
        });
        appendMessage(target.chatThreadId, {
          id: `sys-prompt-${Date.now()}`,
          threadId: target.chatThreadId,
          kind: 'update_request',
          text: getNextUpdateSummaryFromConfirmedAt(nowMs),
          time: 'Now',
          recordId,
        });
      }
      if (target?.adoptionPostId) {
        setPosts(p => p.map(post => (
          post.id === target.adoptionPostId
            ? { ...post, adoptionStatus: 'adopted' as const }
            : post
        )));
      }
      return syncAllRecordStatuses(prev.map(r => {
        if (r.id !== recordId) return r;
        return {
          ...r,
          status: 'confirmed' as const,
          confirmedAt: now,
          confirmedAtMs: nowMs,
          completedMilestones: [],
          updates: [
            ...r.updates,
            {
              id: `u-${Date.now()}`,
              type: 'adopter_home' as const,
              authorId: r.adopterId,
              text: 'First day home — settling in well.',
              createdAt: now,
              createdAtMs: nowMs,
            },
          ],
        };
      }));
    });
  }, [appendMessage, setPosts]);

  const getRecordByThread = useCallback(
    (threadId: string) => records.find(r => r.chatThreadId === threadId),
    [records],
  );

  const submitAdopterUpdate = useCallback((recordId: string, payload: AdoptionUpdatePayload) => {
    const nowMs = Date.now();
    const now = new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const mediaParts: string[] = [];
    if (payload.photoCount) {
      mediaParts.push(`${payload.photoCount} photo${payload.photoCount > 1 ? 's' : ''}`);
    }
    if (payload.hasVideo) mediaParts.push('1 video');
    const mediaLine = mediaParts.length > 0 ? `📸 ${mediaParts.join(' · ')}` : '';
    const text = [payload.text?.trim(), mediaLine].filter(Boolean).join('\n') || 'Home update shared';

    patchRecord(recordId, r => {
      const milestoneId = milestoneAfterUpdate(r, nowMs);
      const completed = new Set(r.completedMilestones ?? []);
      if (milestoneId) completed.add(milestoneId);

      const updated: AdoptionRecord = {
        ...r,
        updates: [
          ...r.updates,
          {
            id: `u-${nowMs}`,
            type: 'adopter_home',
            authorId: r.adopterId,
            text,
            photoCount: payload.photoCount,
            hasVideo: payload.hasVideo,
            milestoneId: milestoneId ?? undefined,
            createdAt: now,
            createdAtMs: nowMs,
          },
        ],
        completedMilestones: [...completed],
        status: 'confirmed',
      };
      updated.status = recomputeRecordStatus(updated);
      return updated;
    });

    const record = records.find(r => r.id === recordId);
    if (record?.chatThreadId) {
      appendMessage(record.chatThreadId, {
        id: `upd-${Date.now()}`,
        threadId: record.chatThreadId,
        kind: 'system',
        text: `Home update posted for ${record.petName} 🐾`,
        time: 'Now',
        recordId,
      });
    }
  }, [patchRecord, records, appendMessage]);

  const submitPosterPlacement = useCallback((recordId: string, text: string) => {
    const nowMs = Date.now();
    const now = new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    patchRecord(recordId, r => ({
      ...r,
      updates: [
        ...r.updates,
        {
          id: `u-pl-${nowMs}`,
          type: 'poster_placement',
          authorId: r.posterId,
          text,
          createdAt: now,
          createdAtMs: nowMs,
        },
      ],
    }));
  }, [patchRecord]);

  const submitPosterEndorsement = useCallback((recordId: string, rating: number, text: string) => {
    const nowMs = Date.now();
    const now = new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    patchRecord(recordId, r => ({
      ...r,
      posterEndorsed: true,
      posterEndorsementRating: rating,
      updates: [
        ...r.updates,
        {
          id: `u-end-${nowMs}`,
          type: 'poster_endorsement',
          authorId: r.posterId,
          text,
          createdAt: now,
          createdAtMs: nowMs,
        },
      ],
    }));
  }, [patchRecord]);

  const dismissNotification = useCallback((id: string) => {
    setDismissedNotifIds(prev => new Set([...prev, id]));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setReadNotifIds(prev => new Set([...prev, id]));
  }, []);

  const canAddPlacementNote = useCallback(
    (recordId: string, posterId: string) => {
      const r = records.find(x => x.id === recordId);
      return r ? canPosterAddPlacementNote(r, posterId) : false;
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
    getRecordByThread,
    submitAdopterUpdate,
    submitPosterPlacement,
    submitPosterEndorsement,
    dismissNotification,
    markNotificationRead,
    canAddPlacementNote,
    canEndorse,
  }), [
    records, threads, messages, updatePrompts, adoptionNotifications,
    getThreadMessages, getPromptsForUser, getNotificationsForUser,
    sendMessage, proposeAdoption, confirmAdoption, getRecordByThread,
    submitAdopterUpdate, submitPosterPlacement, submitPosterEndorsement,
    dismissNotification, markNotificationRead, canAddPlacementNote, canEndorse,
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
