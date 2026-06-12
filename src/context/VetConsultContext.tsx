import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { registerDevReset } from '../dev/devResetRegistry';
import {
  ConsultMode,
  ConsultStatus,
  PaymentMethod,
  VetProfile,
  pickAvailableVet,
  getVetById,
  feeBreakdown,
} from '../data/vetData';

export type ConsultMessage = {
  id: string;
  sender: 'you' | 'vet' | 'system';
  text: string;
  time: string;
};

export type VetConsultation = {
  id: string;
  mode: ConsultMode;
  status: ConsultStatus;
  issueId: string;
  issueLabel: string;
  petId: string;
  petName: string;
  petSpecies: string;
  symptoms: string;
  hasImage: boolean;
  vetId: string | null;
  vetName: string | null;
  consultFee: number;
  platformFee: number;
  totalFee: number;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  createdAt: string;
  estimatedResponse: string;
  messages: ConsultMessage[];
  receiptId: string | null;
};

type VetConsultContextValue = {
  consultations: VetConsultation[];
  activeConsultId: string | null;
  getConsult: (id: string) => VetConsultation | undefined;
  startUrgentConsult: (input: {
    issueId: string;
    issueLabel: string;
    petId: string;
    petName: string;
    petSpecies: string;
    symptoms: string;
    hasImage: boolean;
  }) => string;
  startChosenConsult: (input: {
    vetId: string;
    issueId: string;
    issueLabel: string;
    petId: string;
    petName: string;
    petSpecies: string;
    symptoms: string;
    hasImage: boolean;
  }) => string;
  assignVet: (consultId: string, vet?: VetProfile) => void;
  updateStatus: (consultId: string, status: ConsultStatus) => void;
  processPayment: (consultId: string, method: PaymentMethod, simulateFail?: boolean) => Promise<boolean>;
  retryPayment: (consultId: string) => void;
  startSession: (consultId: string) => void;
  completeSession: (consultId: string) => void;
  cancelConsult: (consultId: string) => void;
  addMessage: (consultId: string, text: string, sender?: 'you' | 'vet') => void;
  setActiveConsult: (id: string | null) => void;
};

const VetConsultContext = createContext<VetConsultContextValue | null>(null);

function makeConsult(
  partial: Partial<VetConsultation> & Pick<VetConsultation, 'mode' | 'issueId' | 'issueLabel' | 'petId' | 'petName' | 'petSpecies' | 'symptoms'>,
): VetConsultation {
  const id = `vc-${Date.now()}`;
  return {
    id,
    status: partial.mode === 'urgent' ? 'finding_vet' : 'vet_assigned',
    hasImage: false,
    vetId: null,
    vetName: null,
    consultFee: 499,
    platformFee: 49,
    totalFee: 548,
    paymentMethod: null,
    paidAt: null,
    createdAt: 'Just now',
    estimatedResponse: '3–5 min',
    messages: [],
    receiptId: null,
    ...partial,
  };
}

const SEED_VET_CONSULTATIONS: VetConsultation[] = [
  {
    id: 'vc-demo-1',
    mode: 'choose',
    status: 'completed',
    issueId: 'vaccine',
    issueLabel: 'Vaccination',
    petId: 'max',
    petName: 'Max',
    petSpecies: 'dog',
    symptoms: 'Annual booster due — checking schedule.',
    hasImage: false,
    vetId: 'v1',
    vetName: 'Dr. Ananya Rahman',
    consultFee: 499,
    platformFee: 49,
    totalFee: 548,
    paymentMethod: 'upi',
    paidAt: '2 days ago',
    createdAt: '2 days ago',
    estimatedResponse: '3 min',
    receiptId: 'RCP-28491',
    messages: [
      { id: 'm1', sender: 'vet', text: 'Hi Aisha! Happy to help with Max\'s vaccine schedule.', time: '2d ago' },
      { id: 'm2', sender: 'you', text: 'Thank you — he had his last rabies shot 11 months ago.', time: '2d ago' },
      { id: 'm3', sender: 'vet', text: 'Perfect timing for a booster. I\'ll note the recommended window in your summary.', time: '2d ago' },
    ],
  },
];

export function VetConsultProvider({ children }: { children: React.ReactNode }) {
  const [consultations, setConsultations] = useState<VetConsultation[]>(SEED_VET_CONSULTATIONS);
  const [activeConsultId, setActiveConsultId] = useState<string | null>(null);

  const resetDevState = useCallback(() => {
    setConsultations(SEED_VET_CONSULTATIONS.map(c => ({
      ...c,
      messages: c.messages.map(m => ({ ...m })),
    })));
    setActiveConsultId(null);
  }, []);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

  const getConsult = useCallback((id: string) => consultations.find(c => c.id === id), [consultations]);

  const patchConsult = useCallback((id: string, patch: Partial<VetConsultation>) => {
    setConsultations(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const startUrgentConsult = useCallback((input: {
    issueId: string;
    issueLabel: string;
    petId: string;
    petName: string;
    petSpecies: string;
    symptoms: string;
    hasImage: boolean;
  }) => {
    const consult = makeConsult({ mode: 'urgent', ...input, status: 'finding_vet' });
    setConsultations(prev => [consult, ...prev]);
    setActiveConsultId(consult.id);
    return consult.id;
  }, []);

  const startChosenConsult = useCallback((input: {
    vetId: string;
    issueId: string;
    issueLabel: string;
    petId: string;
    petName: string;
    petSpecies: string;
    symptoms: string;
    hasImage: boolean;
  }) => {
    const vet = getVetById(input.vetId);
    const fees = feeBreakdown(vet?.fee ?? 499);
    const consult = makeConsult({
      mode: 'choose',
      ...input,
      status: 'payment_pending',
      vetId: input.vetId,
      vetName: vet?.name ?? null,
      consultFee: fees.consultFee,
      platformFee: fees.platformFee,
      totalFee: fees.total,
      estimatedResponse: vet ? `~${vet.responseMins} min` : '5 min',
    });
    setConsultations(prev => [consult, ...prev]);
    setActiveConsultId(consult.id);
    return consult.id;
  }, []);

  const assignVet = useCallback((consultId: string, vet?: VetProfile) => {
    const consult = consultations.find(c => c.id === consultId);
    const assigned = vet ?? pickAvailableVet(consult?.issueId);
    const fees = feeBreakdown(assigned.fee);
    patchConsult(consultId, {
      status: 'payment_pending',
      vetId: assigned.id,
      vetName: assigned.name,
      consultFee: fees.consultFee,
      platformFee: fees.platformFee,
      totalFee: fees.total,
      estimatedResponse: `~${assigned.responseMins} min`,
      messages: [
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: `${assigned.name} has been assigned to your consultation.`,
          time: 'Just now',
        },
      ],
    });
  }, [consultations, patchConsult]);

  const updateStatus = useCallback((consultId: string, status: ConsultStatus) => {
    patchConsult(consultId, { status });
  }, [patchConsult]);

  const processPayment = useCallback(async (consultId: string, method: PaymentMethod, simulateFail = false) => {
    if (simulateFail) {
      patchConsult(consultId, { status: 'payment_failed', paymentMethod: method });
      return false;
    }
    await new Promise(r => setTimeout(r, 1400));
    const receiptId = `RCP-${Math.floor(10000 + Math.random() * 90000)}`;
    patchConsult(consultId, {
      status: 'session_ready',
      paymentMethod: method,
      paidAt: 'Just now',
      receiptId,
      messages: [
        ...(getConsult(consultId)?.messages ?? []),
        {
          id: `sys-pay-${Date.now()}`,
          sender: 'system',
          text: 'Payment received. Your vet will join the session shortly.',
          time: 'Just now',
        },
      ],
    });
    return true;
  }, [patchConsult, getConsult]);

  const retryPayment = useCallback((consultId: string) => {
    patchConsult(consultId, { status: 'payment_pending' });
  }, [patchConsult]);

  const startSession = useCallback((consultId: string) => {
    const consult = getConsult(consultId);
    const vet = consult?.vetId ? getVetById(consult.vetId) : null;
    patchConsult(consultId, {
      status: 'active',
      messages: [
        ...(consult?.messages ?? []),
        {
          id: `vet-hi-${Date.now()}`,
          sender: 'vet',
          text: vet
            ? `Hello! I'm ${vet.name}. I've reviewed ${consult?.petName}'s details — how can I help today?`
            : 'Your vet has joined the consultation.',
          time: 'Just now',
        },
      ],
    });
  }, [getConsult, patchConsult]);

  const completeSession = useCallback((consultId: string) => {
    patchConsult(consultId, {
      status: 'completed',
      messages: [
        ...(getConsult(consultId)?.messages ?? []),
        {
          id: `sys-end-${Date.now()}`,
          sender: 'system',
          text: 'Consultation completed. A summary has been saved to your history.',
          time: 'Just now',
        },
      ],
    });
  }, [getConsult, patchConsult]);

  const cancelConsult = useCallback((consultId: string) => {
    patchConsult(consultId, { status: 'cancelled' });
  }, [patchConsult]);

  const addMessage = useCallback((consultId: string, text: string, sender: 'you' | 'vet' = 'you') => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const consult = getConsult(consultId);
    patchConsult(consultId, {
      messages: [
        ...(consult?.messages ?? []),
        { id: `msg-${Date.now()}`, sender, text: trimmed, time: 'Just now' },
      ],
    });
    if (sender === 'you') {
      setTimeout(() => {
        patchConsult(consultId, {
          messages: [
            ...(getConsult(consultId)?.messages ?? []),
            {
              id: `vet-reply-${Date.now()}`,
              sender: 'vet',
              text: 'Thank you for the update. I\'ll review this and guide you through the next steps.',
              time: 'Just now',
            },
          ],
        });
      }, 1200);
    }
  }, [getConsult, patchConsult]);

  const value = useMemo(
    () => ({
      consultations,
      activeConsultId,
      getConsult,
      startUrgentConsult,
      startChosenConsult,
      assignVet,
      updateStatus,
      processPayment,
      retryPayment,
      startSession,
      completeSession,
      cancelConsult,
      addMessage,
      setActiveConsult: setActiveConsultId,
    }),
    [
      consultations,
      activeConsultId,
      getConsult,
      startUrgentConsult,
      startChosenConsult,
      assignVet,
      updateStatus,
      processPayment,
      retryPayment,
      startSession,
      completeSession,
      cancelConsult,
      addMessage,
    ],
  );

  return (
    <VetConsultContext.Provider value={value}>
      {children}
    </VetConsultContext.Provider>
  );
}

export function useVetConsult() {
  const ctx = useContext(VetConsultContext);
  if (!ctx) throw new Error('useVetConsult must be used within VetConsultProvider');
  return ctx;
}
