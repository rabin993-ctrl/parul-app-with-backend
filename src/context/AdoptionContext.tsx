import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { registerDevReset } from '../dev/devResetRegistry';
import {
  ADOPTION_BOOTSTRAP_UPDATE,
  ADOPTION_RECORDS,
  AdoptionRecord,
  AdoptionUpdatePrompt,
  enforceAdoptionRecordIntegrity,
  syncAllRecordStatuses,
  type AdoptionUpdate,
  type AdoptionUpdatePayload,
} from '../data/adoptionRecords';
import {
  getActivePrompt,
  milestoneAfterUpdate,
  canPosterAddPlacementNote,
  canPosterEndorse,
  canPosterPostNote,
  recomputeRecordStatus,
  getNextUpdateSummaryFromConfirmedAt,
} from '../utils/adoptionUpdateSchedule';
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
    preview: 'Pepper loved meeting you!',
    time: '5m',
    unread: 1,
    adoptionPostId: 'a1',
  },
  {
    id: 't-misty-priya',
    participantId: 'priya',
    preview: 'New adoption request',
    time: '2h',
    unread: 0,
    adoptionPostId: 'a8',
  },
  {
    id: 't-misty-omar',
    participantId: 'omar',
    preview: 'New adoption request',
    time: '5h',
    unread: 0,
    adoptionPostId: 'a8',
  },
  {
    id: 't-adopt-priya',
    participantId: 'priya',
    preview: 'Coco is purring non-stop',
    time: '2m',
    unread: 0,
    adoptionPostId: 'p-you-adopt',
    adoptionRecordId: 'ar3',
  },
  {
    id: 't-adopt-bruno',
    participantId: 'omar',
    preview: '1-month home update requested',
    time: '2d',
    unread: 1,
    adoptionPostId: 'a5',
    adoptionRecordId: 'ar-bruno',
  },
  {
    id: 't-adopt-lena',
    participantId: 'lena',
    preview: '1-month home update requested',
    time: '1d',
    unread: 1,
    adoptionPostId: 'p-you-adopt2',
    adoptionRecordId: 'ar4',
  },
  {
    id: 't-adopt-biscuit',
    participantId: 'sam',
    preview: 'I\'d love to meet Biscuit',
    time: '6h',
    unread: 0,
    adoptionPostId: 'a3',
  },
  {
    id: 't-adopt-olive',
    participantId: 'lena',
    preview: '1-week check-in due soon',
    time: '8h',
    unread: 0,
    adoptionPostId: 'a4',
    adoptionRecordId: 'ar-olive',
  },
  {
    id: 't-adopt-dev',
    participantId: 'dev',
    preview: '1-month home update is overdue',
    time: '3d',
    unread: 1,
    adoptionPostId: 'p-dev-adopt',
    adoptionRecordId: 'ar2',
  },
  {
    id: 't-adopt-mochi',
    participantId: 'sam',
    preview: 'Mochi marked as adopted',
    time: '3d',
    unread: 0,
    adoptionPostId: 'a2',
    adoptionRecordId: 'ar-mochi',
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
    { id: 'md3', threadId: 't-adopt-dev-pending', kind: 'text', senderId: 'dev', text: 'Happy to do a quick home check before we finalize.', time: '9:10' },
  ],
  't-misty-priya': [],
  't-misty-omar': [
    { id: 'mo1', threadId: 't-misty-omar', kind: 'text', senderId: 'omar', text: 'Rocky is gentle with cats — we\'d love to meet Misty.', time: '5h' },
    { id: 'mo2', threadId: 't-misty-omar', kind: 'text', senderId: 'you', text: 'Happy to arrange a meet-and-greet this weekend.', time: '4h' },
  ],
  't-adopt-priya': [
    { id: 'm1', threadId: 't-adopt-priya', kind: 'text', senderId: 'priya', text: 'Misty sounds perfect for our apartment.', time: '10:02' },
    { id: 'm2', threadId: 't-adopt-priya', kind: 'text', senderId: 'you', text: 'Happy to arrange a meet-and-greet first.', time: '10:05' },
    { id: 'm3', threadId: 't-adopt-priya', kind: 'text', senderId: 'priya', text: 'We can do a home visit this weekend!', time: '10:08' },
    { id: 'm3b', threadId: 't-adopt-priya', kind: 'system', text: 'Coco marked as adopted', time: '90d' },
    { id: 'm3c', threadId: 't-adopt-priya', kind: 'system', text: 'Adoption confirmed 🐾 · Share a 1-week check-in soon', time: '90d' },
  ],
  't-adopt-bruno': [
    { id: 'mbr1', threadId: 't-adopt-bruno', kind: 'text', senderId: 'omar', text: 'Bruno is settling in beautifully.', time: '3d' },
    { id: 'mbr2', threadId: 't-adopt-bruno', kind: 'text', senderId: 'you', text: 'So glad to hear — keep us posted!', time: '2d' },
    { id: 'mbr3', threadId: 't-adopt-bruno', kind: 'system', text: 'Bruno marked as adopted', time: '45d' },
  ],
  't-adopt-lena': [
    { id: 'ml1', threadId: 't-adopt-lena', kind: 'text', senderId: 'lena', text: 'Oreo is settling in so well!', time: '2d' },
    { id: 'ml2', threadId: 't-adopt-lena', kind: 'text', senderId: 'you', text: 'So glad to hear — keep the updates coming.', time: '1d' },
    { id: 'ml3', threadId: 't-adopt-lena', kind: 'system', text: 'Oreo marked as adopted', time: '120d' },
  ],
  't-adopt-biscuit': [
    { id: 'mb1', threadId: 't-adopt-biscuit', kind: 'text', senderId: 'you', text: 'I\'d love to meet Biscuit — we have a secure yard.', time: '6h' },
  ],
  't-adopt-olive': [
    { id: 'mol1', threadId: 't-adopt-olive', kind: 'text', senderId: 'lena', text: 'Olive prefers quiet evenings — your home sounds perfect.', time: '1d' },
    { id: 'mol2', threadId: 't-adopt-olive', kind: 'text', senderId: 'you', text: 'She already found the softest blanket.', time: '12h' },
    { id: 'mol3', threadId: 't-adopt-olive', kind: 'system', text: 'Olive marked as adopted', time: '6d' },
    { id: 'mol4', threadId: 't-adopt-olive', kind: 'system', text: 'Adoption confirmed 🐾 · Share a 1-week check-in soon', time: '6d' },
  ],
  't-adopt-dev': [
    { id: 'mdv1', threadId: 't-adopt-dev', kind: 'text', senderId: 'dev', text: 'Willow is doing well in your care?', time: '4d' },
    { id: 'mdv2', threadId: 't-adopt-dev', kind: 'text', senderId: 'you', text: 'She\'s purring constantly — windowsill is her throne.', time: '3d' },
    { id: 'mdv3', threadId: 't-adopt-dev', kind: 'system', text: 'Willow was marked as adopted', time: '280d' },
    { id: 'mdv4', threadId: 't-adopt-dev', kind: 'system', text: 'Adoption confirmed 🐾 · Share a 1-week check-in soon', time: '280d' },
  ],
  't-adopt-mochi': [
    { id: 'mmc1', threadId: 't-adopt-mochi', kind: 'text', senderId: 'sam', text: 'Mochi would love your sunny flat.', time: '4d' },
    { id: 'mmc2', threadId: 't-adopt-mochi', kind: 'text', senderId: 'you', text: 'We\'re ready for a playful kitten!', time: '4d' },
    { id: 'mmc3', threadId: 't-adopt-mochi', kind: 'system', text: 'Mochi marked as adopted', time: '3d' },
    { id: 'mmc4', threadId: 't-adopt-mochi', kind: 'system', text: 'Adoption confirmed 🐾 · Share a 1-week check-in soon', time: '3d' },
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

function buildNotifications(records: AdoptionRecord[], dismissed: Set<string>): AdoptionNotification[] {
  const notifs: AdoptionNotification[] = [];
  for (const record of records) {
    if (record.status === 'closed') continue;
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
  const [records, setRecords] = useState<AdoptionRecord[]>(() =>
    syncAllRecordStatuses([...ADOPTION_RECORDS]),
  );
  const [threads, setThreads] = useState<ChatThread[]>(INITIAL_THREADS);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(new Set());
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());

  const resetDevState = useCallback(() => {
    setRecords(syncAllRecordStatuses([...ADOPTION_RECORDS]));
    setThreads(INITIAL_THREADS);
    setMessages(INITIAL_MESSAGES);
    setDismissedNotifIds(new Set());
    setReadNotifIds(new Set());
  }, []);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

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
      prev.map(r => {
        if (r.id !== recordId) return r;
        return enforceAdoptionRecordIntegrity(r, patcher(r));
      }),
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
    const recordId = `ar-${Date.now()}`;
    const nowMs = Date.now();
    const now = new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
      status: 'confirmed',
      confirmedAt: now,
      confirmedAtMs: nowMs,
      completedMilestones: [],
      updates: [{
        id: `u-${nowMs}`,
        type: 'adopter_home',
        authorId: params.adopterId,
        text: ADOPTION_BOOTSTRAP_UPDATE,
        createdAt: now,
        createdAtMs: nowMs,
      }],
    };
    setRecords(prev => syncAllRecordStatuses([...prev, record]));
    setThreads(prev => prev.map(t => (
      t.id === params.threadId
        ? { ...t, adoptionRecordId: recordId, adoptionPostId: params.adoptionPostId }
        : t
    )));
    appendMessage(params.threadId, {
      id: `sys-${nowMs}`,
      threadId: params.threadId,
      kind: 'system',
      text: params.posterId === 'you'
        ? `${params.petName} marked as adopted`
        : `${params.petName} was marked as adopted`,
      time: 'Now',
    });
    appendMessage(params.threadId, {
      id: `sys-confirm-${nowMs}`,
      threadId: params.threadId,
      kind: 'system',
      text: 'Adoption confirmed 🐾 · Share a 1-week check-in soon',
      time: 'Now',
    });
    appendMessage(params.threadId, {
      id: `sys-prompt-${nowMs}`,
      threadId: params.threadId,
      kind: 'update_request',
      text: getNextUpdateSummaryFromConfirmedAt(nowMs),
      time: 'Now',
      recordId,
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
              text: ADOPTION_BOOTSTRAP_UPDATE,
              createdAt: now,
              createdAtMs: nowMs,
            },
          ],
        };
      }));
    });
  }, [appendMessage]);

  const relistAdoptionPlacement = useCallback((recordId: string) => {
    const target = records.find(r => r.id === recordId);
    if (!target) return null;

    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const threadId = target.chatThreadId;

    setRecords(prev => syncAllRecordStatuses(prev.map(r => (
      r.id === recordId
        ? enforceAdoptionRecordIntegrity(r, {
          ...r,
          status: 'closed',
          closedReason: 'relisted',
          closedAt: now,
          chatThreadId: undefined,
        })
        : r
    ))));

    if (threadId) {
      setThreads(prev => prev.filter(t => t.id !== threadId));
      setMessages(prev => {
        const next = { ...prev };
        delete next[threadId];
        return next;
      });
    }

    return {
      listingId: target.adoptionPostId,
      adopterId: target.adopterId,
      threadId,
    };
  }, [records]);

  const getRecordByThread = useCallback(
    (threadId: string) => records.find(r => r.chatThreadId === threadId),
    [records],
  );

  const submitAdopterUpdate = useCallback((recordId: string, payload: AdoptionUpdatePayload) => {
    if (!payload.photoCount || payload.photoCount < 1) return;

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

  const submitPosterEndorsement = useCallback((
    recordId: string,
    recommendation: 'recommended' | 'not_recommended',
    text?: string,
  ) => {
    const nowMs = Date.now();
    const now = new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const defaultText = recommendation === 'recommended'
      ? 'Would give them another pet.'
      : 'Would not recommend for another adoption.';
    patchRecord(recordId, r => ({
      ...r,
      posterRecommendation: recommendation,
      posterEndorsed: recommendation === 'recommended',
      updates: [
        ...r.updates,
        {
          id: `u-end-${nowMs}`,
          type: 'poster_endorsement',
          authorId: r.posterId,
          endorsement: recommendation,
          text: text?.trim() || defaultText,
          createdAt: now,
          createdAtMs: nowMs,
        },
      ],
    }));
  }, [patchRecord]);

  const submitAdopterResponse = useCallback((recordId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const nowMs = Date.now();
    const now = new Date(nowMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    patchRecord(recordId, r => ({
      ...r,
      updates: [
        ...r.updates,
        {
          id: `u-resp-${nowMs}`,
          type: 'adopter_response',
          authorId: r.adopterId,
          text: trimmed,
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
    setThreads(prev => prev.filter(t => t.id !== threadId));
    setMessages(prev => {
      const next = { ...prev };
      delete next[threadId];
      return next;
    });
  }, []);

  const ensureAdoptionRequestThread = useCallback((params: {
    listingId: string;
    peerId: string;
    threadId?: string;
  }): ChatThread => {
    const existing = threads.find(t => (
      (params.threadId && t.id === params.threadId)
      || (t.participantId === params.peerId && t.adoptionPostId === params.listingId)
    ));
    if (existing) return existing;

    const threadId = params.threadId ?? `t-adopt-${params.listingId}-${params.peerId}`;
    const thread: ChatThread = {
      id: threadId,
      participantId: params.peerId,
      preview: 'New adoption request',
      time: 'Now',
      unread: 0,
      adoptionPostId: params.listingId,
    };
    setThreads(prev => [thread, ...prev]);
    setMessages(prev => ({ ...prev, [threadId]: [] }));
    return thread;
  }, [threads]);

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
