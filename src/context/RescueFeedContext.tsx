import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { registerDevReset } from '../dev/devResetRegistry';
import { ALL_RESCUE_CASES } from '../data/rescueData';
import {
  formatRescueUpdateTime,
  type RescueCase,
  type RescueStatus,
  type RescueUpdate,
} from '../data/profileData';
export type CreateCaseInput = {
  name: string;
  species: 'dog' | 'cat' | 'other';
  headline: string;
  location: string;
  story: string;
  status: RescueStatus;
  tint?: string;
  icon?: string;
  photoCount?: number;
};

export type RescueUpdatePayload = {
  text: string;
  hasPhoto: boolean;
  photoCount: number;
};

type RescueFeedContextValue = {
  cases: RescueCase[];
  followedIds: Set<string>;
  isFollowing: (id: string) => boolean;
  toggleFollow: (id: string) => void;
  addCase: (input: CreateCaseInput) => RescueCase;
  addUpdate: (caseId: string, payload: RescueUpdatePayload) => void;
};

const RescueFeedContext = createContext<RescueFeedContextValue | null>(null);

const SPECIES_META = {
  dog: { tint: '#14A697', icon: 'dog' },
  cat: { tint: '#7A5AE0', icon: 'cat' },
  other: { tint: '#C98E2A', icon: 'paw' },
} as const;

export function RescueFeedProvider({ children }: { children: React.ReactNode }) {
  const [cases, setCases] = useState<RescueCase[]>(ALL_RESCUE_CASES);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set(['r2', 'r5']));

  const resetDevState = useCallback(() => {
    setCases(ALL_RESCUE_CASES);
    setFollowedIds(new Set(['r2', 'r5']));
  }, []);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

  const isFollowing = useCallback((id: string) => followedIds.has(id), [followedIds]);

  const toggleFollow = useCallback((id: string) => {
    setFollowedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addUpdate = useCallback((caseId: string, payload: RescueUpdatePayload) => {
    const stampedAt = formatRescueUpdateTime();
    const update: RescueUpdate = {
      id: `u${Date.now()}`,
      time: stampedAt,
      text: payload.text,
      hasPhoto: payload.hasPhoto,
    };
    setCases(prev => prev.map(c => (
      c.id === caseId
        ? { ...c, updates: [update, ...(c.updates ?? [])] }
        : c
    )));
  }, []);

  const addCase = useCallback((input: CreateCaseInput): RescueCase => {
    const meta = SPECIES_META[input.species];
    const id = `r${Date.now()}`;
    const item: RescueCase = {
      id,
      userId: 'you',
      name: input.name.trim(),
      species: input.species === 'other' ? 'other' : input.species,
      icon: input.icon ?? meta.icon,
      tint: input.tint ?? meta.tint,
      status: input.status,
      date: formatRescueUpdateTime(),
      location: input.location.trim(),
      headline: input.headline.trim(),
      story: input.story.trim(),
      caseId: `RC${String(Date.now()).slice(-6)}`,
      followers: 0,
      tags: [input.species === 'dog' ? 'Dog' : input.species === 'cat' ? 'Cat' : 'Other'],
      updates: [
        {
          id: `u${Date.now()}`,
          time: formatRescueUpdateTime(),
          text: input.story.trim(),
          hasPhoto: (input.photoCount ?? 0) > 0,
        },
      ],
    };
    setCases(prev => [item, ...prev]);
    return item;
  }, []);

  const value = useMemo(
    () => ({ cases, followedIds, isFollowing, toggleFollow, addCase, addUpdate }),
    [cases, followedIds, isFollowing, toggleFollow, addCase, addUpdate],
  );

  return (
    <RescueFeedContext.Provider value={value}>
      {children}
    </RescueFeedContext.Provider>
  );
}

export function useRescueFeed() {
  const ctx = useContext(RescueFeedContext);
  if (!ctx) throw new Error('useRescueFeed must be used within RescueFeedProvider');
  return ctx;
}

export function useRescueFeedOptional() {
  return useContext(RescueFeedContext);
}
