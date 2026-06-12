import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerDevReset } from '../dev/devResetRegistry';
import {
  DEFAULT_CREATED_CIRCLE,
  EXPLORE_CIRCLES,
  FeedCircleEntry,
  LOCAL_PAW_CIRCLE,
  PawCircle,
  allJoinedCircles,
  resolvePawCircle,
  toFeedEntry,
} from '../data/pawCircles';

const STORAGE_KEY = 'parul:pawCircles:v1';

type StoredState = {
  onboardingComplete: boolean;
  created: PawCircle[];
  joinedIds: string[];
};

type PawCircleContextValue = {
  ready: boolean;
  onboardingComplete: boolean;
  createdCircles: PawCircle[];
  joinedCircles: PawCircle[];
  feedCreated: FeedCircleEntry[];
  feedJoined: FeedCircleEntry[];
  defaultCircleId: string | null;
  completeOnboarding: (opts: { joinLocal: boolean }) => Promise<void>;
  joinCircle: (id: string) => Promise<void>;
  leaveCircle: (id: string) => Promise<void>;
  createCircle: (name: string, location: string, privacy?: PawCircle['privacy']) => Promise<PawCircle>;
  updateCircle: (id: string, patch: { name?: string; bio?: string }) => Promise<void>;
  isJoined: (id: string) => boolean;
  getCircle: (id: string) => PawCircle | null;
  exploreCircles: PawCircle[];
  resetPawCircles: () => Promise<void>;
};

const defaultStored: StoredState = {
  onboardingComplete: false,
  created: [],
  joinedIds: [],
};

function normalizeStored(parsed: StoredState): StoredState {
  let created = parsed.created ?? [];
  // Migrate legacy auto-seeded Circle 101 that was never user-created
  if (
    created.length === 1
    && created[0].id === DEFAULT_CREATED_CIRCLE.id
    && created[0].name === DEFAULT_CREATED_CIRCLE.name
  ) {
    created = [];
  }
  return {
    onboardingComplete: !!parsed.onboardingComplete,
    created,
    joinedIds: parsed.joinedIds ?? [],
  };
}

const PawCircleContext = createContext<PawCircleContextValue | null>(null);

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'circle';
}

export function PawCircleProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<StoredState>(defaultStored);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as StoredState;
          setState(normalizeStored(parsed));
        } catch {
          setState(defaultStored);
        }
      }
      setReady(true);
    });
  }, []);

  const persist = useCallback(async (next: StoredState) => {
    setState(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const completeOnboarding = useCallback(async ({ joinLocal }: { joinLocal: boolean }) => {
    const joinedIds = joinLocal && !state.joinedIds.includes(LOCAL_PAW_CIRCLE.id)
      ? [...state.joinedIds, LOCAL_PAW_CIRCLE.id]
      : state.joinedIds;
    await persist({ ...state, onboardingComplete: true, joinedIds });
  }, [persist, state]);

  const joinCircle = useCallback(async (id: string) => {
    if (state.joinedIds.includes(id)) return;
    await persist({ ...state, joinedIds: [...state.joinedIds, id] });
  }, [persist, state]);

  const leaveCircle = useCallback(async (id: string) => {
    await persist({ ...state, joinedIds: state.joinedIds.filter(j => j !== id) });
  }, [persist, state]);

  const resetPawCircles = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setState(defaultStored);
  }, []);

  useEffect(() => registerDevReset(resetPawCircles), [resetPawCircles]);

  const updateCircle = useCallback(async (
    id: string,
    patch: { name?: string; bio?: string },
  ) => {
    const created = state.created.map(c => {
      if (c.id !== id) return c;
      return {
        ...c,
        ...(patch.name != null && { name: patch.name.trim() }),
        ...(patch.bio != null && { bio: patch.bio.trim() }),
      };
    });
    if (!created.some(c => c.id === id)) return;
    await persist({ ...state, created });
  }, [persist, state]);

  const createCircle = useCallback(async (
    name: string,
    location: string,
    privacy: PawCircle['privacy'] = 'open',
  ) => {
    const base = slugify(name);
    let id = base;
    let n = 1;
    while (state.created.some(c => c.id === id) || resolvePawCircle(id, state.created)) {
      id = `${base}-${n++}`;
    }
    const circle: PawCircle = {
      id,
      name: name.trim(),
      location: location.trim(),
      memberCount: 1,
      icon: 'paw',
      tint: '#7C5CBF',
      iconBg: '#F0EBFA',
      privacy,
    };
    await persist({ ...state, created: [...state.created, circle] });
    return circle;
  }, [persist, state]);

  const value = useMemo((): PawCircleContextValue => {
    const joinedCircles = allJoinedCircles(state.joinedIds, state.created);
    const feedCreated = state.created.map(toFeedEntry);
    const createdIds = new Set(state.created.map(c => c.id));
    const feedJoined = joinedCircles
      .filter(c => !createdIds.has(c.id))
      .map(toFeedEntry);
    const defaultCircleId = feedCreated[0]?.id ?? feedJoined[0]?.id ?? null;

    return {
      ready,
      onboardingComplete: state.onboardingComplete,
      createdCircles: state.created,
      joinedCircles,
      feedCreated,
      feedJoined,
      defaultCircleId,
      completeOnboarding,
      joinCircle,
      leaveCircle,
      createCircle,
      updateCircle,
      isJoined: (id: string) => state.joinedIds.includes(id),
      getCircle: (id: string) => resolvePawCircle(id, state.created),
      exploreCircles: EXPLORE_CIRCLES,
      resetPawCircles,
    };
  }, [state, ready, completeOnboarding, joinCircle, leaveCircle, createCircle, updateCircle, resetPawCircles]);

  return (
    <PawCircleContext.Provider value={value}>
      {children}
    </PawCircleContext.Provider>
  );
}

export function usePawCircles() {
  const ctx = useContext(PawCircleContext);
  if (!ctx) throw new Error('usePawCircles must be used within PawCircleProvider');
  return ctx;
}
