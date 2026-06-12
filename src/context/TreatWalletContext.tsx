import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { companions, users } from '../data/mockData';
import { registerDevReset } from '../dev/devResetRegistry';
import {
  STORAGE_KEYS,
  TreatGift,
  TreatWallet,
  createFreshWallet,
  daysUntilReset,
  makeGiftId,
  normalizeWallet,
  sumGiftsForCompanion,
  sumGiftsForOwner,
} from '../utils/treatWallet';

const CURRENT_USER_ID = 'you';
const GIVE_DEBOUNCE_MS = 600;

export type GiveTreatResult =
  | { ok: true; remaining: number; ownerId: string }
  | { ok: false; reason: 'empty' | 'own_pet' | 'not_ready' | 'debounce' | 'unknown_pet' };

const MOCK_SEED_GIFTS: TreatGift[] = [
  { id: 'seed-lena-rocky', fromUserId: 'lena', companionId: 'rocky', ownerId: 'omar', amount: 1, at: daysAgoISO(2) },
  { id: 'seed-sam-rocky', fromUserId: 'sam', companionId: 'rocky', ownerId: 'omar', amount: 1, at: daysAgoISO(5) },
  { id: 'seed-dev-rocky', fromUserId: 'dev', companionId: 'rocky', ownerId: 'omar', amount: 1, at: daysAgoISO(8) },
  { id: 'seed-omar-max', fromUserId: 'omar', companionId: 'max', ownerId: 'you', amount: 1, at: daysAgoISO(3) },
  { id: 'seed-lena-coco', fromUserId: 'lena', companionId: 'coco', ownerId: 'lena', amount: 1, at: daysAgoISO(1) },
];

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function seedGifts(existing: TreatGift[]): TreatGift[] {
  const ids = new Set(existing.map(g => g.id));
  const merged = [...existing];
  for (const gift of MOCK_SEED_GIFTS) {
    if (!ids.has(gift.id)) merged.push(gift);
  }
  return merged
    .map(g => ({
      ...g,
      ownerId: g.ownerId ?? companions[g.companionId]?.ownerId ?? '',
    }))
    .filter(g => g.ownerId)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

interface TreatWalletContextValue {
  ready: boolean;
  remaining: number;
  daysUntilReset: number;
  showTreatsOnProfile: boolean;
  setShowTreatsOnProfile: (show: boolean) => void;
  canGive: (companionId: string) => boolean;
  isOwnPet: (companionId: string) => boolean;
  giveTreat: (companionId: string) => Promise<GiveTreatResult>;
  getOwnerReceivedTreats: (ownerId: string) => number;
  getCompanionReceivedTreats: (companionId: string) => number;
  getRecentGifts: (companionId: string, limit?: number) => TreatGift[];
  getRecentGiftsForOwner: (ownerId: string, limit?: number) => TreatGift[];
  lastGiftBanner: { companionId: string; ownerId: string; fromUserId: string; handle: string } | null;
  clearGiftBanner: () => void;
}

const TreatWalletContext = createContext<TreatWalletContextValue | null>(null);

export function TreatWalletProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [wallet, setWallet] = useState<TreatWallet>(createFreshWallet());
  const [gifts, setGifts] = useState<TreatGift[]>([]);
  const [showTreatsOnProfile, setShowTreatsState] = useState(true);
  const [lastGiftBanner, setLastGiftBanner] = useState<TreatWalletContextValue['lastGiftBanner']>(null);
  const lastGiveAt = useRef(0);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [walletRaw, giftsRaw, showRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.wallet),
          AsyncStorage.getItem(STORAGE_KEYS.gifts),
          AsyncStorage.getItem(STORAGE_KEYS.showTreatsOnProfile),
        ]);

        if (cancelled) return;

        const parsedWallet = walletRaw ? normalizeWallet(JSON.parse(walletRaw) as TreatWallet) : createFreshWallet();
        const parsedGifts = seedGifts(giftsRaw ? (JSON.parse(giftsRaw) as TreatGift[]) : []);
        const parsedShow = showRaw === null ? true : showRaw === 'true';

        setWallet(parsedWallet);
        setGifts(parsedGifts);
        setShowTreatsState(parsedShow);

        await Promise.all([
          AsyncStorage.setItem(STORAGE_KEYS.wallet, JSON.stringify(parsedWallet)),
          AsyncStorage.setItem(STORAGE_KEYS.gifts, JSON.stringify(parsedGifts)),
          AsyncStorage.setItem(STORAGE_KEYS.showTreatsOnProfile, String(parsedShow)),
        ]);
      } catch {
        if (!cancelled) {
          setWallet(createFreshWallet());
          setGifts(seedGifts([]));
          setShowTreatsState(true);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(async (w: TreatWallet, g: TreatGift[], show: boolean) => {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.wallet, JSON.stringify(w)),
      AsyncStorage.setItem(STORAGE_KEYS.gifts, JSON.stringify(g)),
      AsyncStorage.setItem(STORAGE_KEYS.showTreatsOnProfile, String(show)),
    ]);
  }, []);

  const resetDevState = useCallback(async () => {
    const w = createFreshWallet();
    const g = seedGifts([]);
    setWallet(w);
    setGifts(g);
    setShowTreatsState(true);
    setLastGiftBanner(null);
    await persist(w, g, true);
  }, [persist]);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

  const setShowTreatsOnProfile = useCallback(async (show: boolean) => {
    setShowTreatsState(show);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.showTreatsOnProfile, String(show));
    } catch {
      // ignore
    }
  }, []);

  const isOwnPet = useCallback((companionId: string) => {
    const companion = companions[companionId];
    return companion?.ownerId === CURRENT_USER_ID;
  }, []);

  const canGive = useCallback((companionId: string) => {
    if (!ready) return false;
    if (!companions[companionId]) return false;
    if (isOwnPet(companionId)) return false;
    return wallet.remaining > 0;
  }, [ready, wallet.remaining, isOwnPet]);

  const getOwnerReceivedTreats = useCallback((ownerId: string) => {
    return sumGiftsForOwner(gifts, ownerId);
  }, [gifts]);

  const getCompanionReceivedTreats = useCallback((companionId: string) => {
    const base = companions[companionId]?.treats ?? 0;
    return base + sumGiftsForCompanion(gifts, companionId);
  }, [gifts]);

  const getRecentGifts = useCallback((companionId: string, limit = 8) => {
    return gifts.filter(g => g.companionId === companionId).slice(0, limit);
  }, [gifts]);

  const getRecentGiftsForOwner = useCallback((ownerId: string, limit = 12) => {
    return gifts.filter(g => g.ownerId === ownerId).slice(0, limit);
  }, [gifts]);

  const clearGiftBanner = useCallback(() => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setLastGiftBanner(null);
  }, []);

  const showGiftBanner = useCallback((companionId: string, ownerId: string, fromUserId: string) => {
    const user = users[fromUserId];
    const handle = user?.handle ?? fromUserId;
    setLastGiftBanner({ companionId, ownerId, fromUserId, handle });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setLastGiftBanner(null), 2500);
  }, []);

  const giveTreat = useCallback(async (companionId: string): Promise<GiveTreatResult> => {
    if (!ready) return { ok: false, reason: 'not_ready' };
    const companion = companions[companionId];
    if (!companion) return { ok: false, reason: 'unknown_pet' };
    if (isOwnPet(companionId)) return { ok: false, reason: 'own_pet' };

    const now = Date.now();
    if (now - lastGiveAt.current < GIVE_DEBOUNCE_MS) return { ok: false, reason: 'debounce' };

    const normalized = normalizeWallet(wallet, now);
    if (normalized.remaining <= 0) return { ok: false, reason: 'empty' };

    lastGiveAt.current = now;

    const nextWallet: TreatWallet = {
      ...normalized,
      remaining: normalized.remaining - 1,
    };
    const gift: TreatGift = {
      id: makeGiftId(),
      fromUserId: CURRENT_USER_ID,
      companionId,
      ownerId: companion.ownerId,
      amount: 1,
      at: new Date(now).toISOString(),
    };
    const nextGifts = [gift, ...gifts];

    setWallet(nextWallet);
    setGifts(nextGifts);
    showGiftBanner(companionId, companion.ownerId, CURRENT_USER_ID);

    try {
      await persist(nextWallet, nextGifts, showTreatsOnProfile);
    } catch {
      // optimistic update already applied
    }

    return { ok: true, remaining: nextWallet.remaining, ownerId: companion.ownerId };
  }, [ready, wallet, gifts, isOwnPet, persist, showTreatsOnProfile, showGiftBanner]);

  const value = useMemo<TreatWalletContextValue>(() => ({
    ready,
    remaining: wallet.remaining,
    daysUntilReset: daysUntilReset(wallet.periodStartAt),
    showTreatsOnProfile,
    setShowTreatsOnProfile,
    canGive,
    isOwnPet,
    giveTreat,
    getOwnerReceivedTreats,
    getCompanionReceivedTreats,
    getRecentGifts,
    getRecentGiftsForOwner,
    lastGiftBanner,
    clearGiftBanner,
  }), [
    ready, wallet, showTreatsOnProfile, setShowTreatsOnProfile,
    canGive, isOwnPet, giveTreat, getOwnerReceivedTreats, getCompanionReceivedTreats,
    getRecentGifts, getRecentGiftsForOwner, lastGiftBanner, clearGiftBanner,
  ]);

  return (
    <TreatWalletContext.Provider value={value}>
      {children}
    </TreatWalletContext.Provider>
  );
}

export function useTreatWallet() {
  const ctx = useContext(TreatWalletContext);
  if (!ctx) throw new Error('useTreatWallet must be used within TreatWalletProvider');
  return ctx;
}
