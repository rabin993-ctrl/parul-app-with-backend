import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { registerDevReset } from '../dev/devResetRegistry';
import {
  TreatGift,
  TreatWallet,
  createFreshWallet,
  daysUntilReset,
  normalizeWallet,
  sumGiftsForCompanion,
  sumGiftsForOwner,
} from '../utils/treatWallet';
import { supabase } from '../lib/supabase';
import { upsertShowTreatsOnProfile } from '../utils/userPrivacySettings';
import { useAuth } from './AuthContext';

const GIVE_DEBOUNCE_MS = 600;

export type GiveTreatResult =
  | { ok: true; remaining: number; ownerId: string }
  | { ok: false; reason: 'empty' | 'own_pet' | 'not_ready' | 'debounce' | 'unknown_pet' };

type DbGiftRow = {
  id: string;
  from_user_id: string;
  companion_id: string;
  owner_id: string;
  amount: number;
  created_at: string;
  gifter: { name: string; handle: string; tint: string | null } | null;
};

function mapDbGift(row: DbGiftRow): TreatGift {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    companionId: row.companion_id,
    ownerId: row.owner_id,
    amount: row.amount,
    at: row.created_at,
    gifterName: row.gifter?.name,
    gifterHandle: row.gifter?.handle,
    gifterTint: row.gifter?.tint ?? undefined,
  };
}

interface TreatWalletContextValue {
  ready: boolean;
  remaining: number;
  daysUntilReset: number;
  showTreatsOnProfile: boolean;
  setShowTreatsOnProfile: (show: boolean) => Promise<boolean>;
  syncShowTreatsOnProfile: (show: boolean) => void;
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
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [wallet, setWallet] = useState<TreatWallet>(createFreshWallet());
  const [gifts, setGifts] = useState<TreatGift[]>([]);
  const [myCompanionIds, setMyCompanionIds] = useState<Set<string>>(new Set());
  const [showTreatsOnProfile, setShowTreatsState] = useState(true);
  const [lastGiftBanner, setLastGiftBanner] = useState<TreatWalletContextValue['lastGiftBanner']>(null);
  const lastGiveAt = useRef(0);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) {
      setReady(false);
      setWallet(createFreshWallet());
      setGifts([]);
      setMyCompanionIds(new Set());
      setShowTreatsState(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [walletRes, giftsRes, privacyRes, companionsRes] = await Promise.all([
          supabase
            .from('treat_wallets')
            .select('period_start_at, remaining, allowance')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('treat_gifts')
            .select('id, from_user_id, companion_id, owner_id, amount, created_at, gifter:users!treat_gifts_from_user_id_fkey(name, handle, tint)')
            .order('created_at', { ascending: false })
            .limit(300),
          supabase
            .from('user_privacy_settings')
            .select('show_treats_on_profile')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('companions')
            .select('id')
            .eq('owner_id', user.id)
            .is('deleted_at', null),
        ]);

        if (cancelled) return;

        if (walletRes.data) {
          setWallet(normalizeWallet({
            periodStartAt: walletRes.data.period_start_at,
            remaining: walletRes.data.remaining,
            allowance: walletRes.data.allowance,
          }));
        }

        if (giftsRes.data) {
          setGifts((giftsRes.data as DbGiftRow[]).map(mapDbGift));
        }

        if (privacyRes.data) {
          setShowTreatsState(privacyRes.data.show_treats_on_profile);
        }

        if (companionsRes.data) {
          setMyCompanionIds(new Set(companionsRes.data.map((c: { id: string }) => c.id)));
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  // Realtime: listen for new treat gifts so counts update instantly for all viewers
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`treat_gifts:viewer:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'treat_gifts' },
        (payload) => {
          const row = payload.new as DbGiftRow & { gifter?: { name: string; handle: string; tint: string | null } };
          const gift = mapDbGift(row);
          setGifts(prev => {
            if (prev.some(g => g.id === gift.id)) return prev;
            return [gift, ...prev];
          });
          if (row.owner_id === user.id && row.from_user_id !== user.id) {
            setLastGiftBanner({
              companionId: row.companion_id,
              ownerId: row.owner_id,
              fromUserId: row.from_user_id,
              handle: row.gifter?.handle ?? row.from_user_id.slice(0, 8),
            });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const resetDevState = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('treat_wallets')
      .update({ period_start_at: new Date().toISOString(), remaining: 100 })
      .eq('user_id', user.id);
    setWallet(createFreshWallet());
    setGifts([]);
    setLastGiftBanner(null);
  }, [user]);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

  const syncShowTreatsOnProfile = useCallback((show: boolean) => {
    setShowTreatsState(show);
  }, []);

  const setShowTreatsOnProfile = useCallback(async (show: boolean): Promise<boolean> => {
    let prev!: boolean;
    setShowTreatsState(current => {
      prev = current;
      return show;
    });
    if (!user) return true;

    const result = await upsertShowTreatsOnProfile(user.id, show);
    if (!result.ok) {
      setShowTreatsState(prev);
      if (__DEV__) {
        console.warn('[TreatWalletContext] setShowTreatsOnProfile failed:', result.message);
      }
      return false;
    }
    return true;
  }, [user]);

  const isOwnPet = useCallback((companionId: string) => {
    if (!user) return false;
    return myCompanionIds.has(companionId);
  }, [user, myCompanionIds]);

  const canGive = useCallback((companionId: string) => {
    if (!ready) return false;
    if (isOwnPet(companionId)) return false;
    return wallet.remaining > 0;
  }, [ready, wallet.remaining, isOwnPet]);

  const getOwnerReceivedTreats = useCallback((ownerId: string) => {
    return sumGiftsForOwner(gifts, ownerId);
  }, [gifts]);

  const getCompanionReceivedTreats = useCallback((companionId: string) => {
    return sumGiftsForCompanion(gifts, companionId);
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

  const showGiftBanner = useCallback((companionId: string, ownerId: string, fromUserId: string, fromHandle?: string) => {
    const handle = fromHandle ?? fromUserId.slice(0, 8);
    setLastGiftBanner({ companionId, ownerId, fromUserId, handle });
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setLastGiftBanner(null), 2500);
  }, []);

  const giveTreat = useCallback(async (companionId: string): Promise<GiveTreatResult> => {
    if (!ready || !user) return { ok: false, reason: 'not_ready' };

    const now = Date.now();
    if (now - lastGiveAt.current < GIVE_DEBOUNCE_MS) return { ok: false, reason: 'debounce' };

    if (isOwnPet(companionId)) return { ok: false, reason: 'own_pet' };
    if (wallet.remaining <= 0) return { ok: false, reason: 'empty' };

    lastGiveAt.current = now;

    const { data, error } = await supabase.rpc('give_treat', { p_companion_id: companionId });

    if (error) return { ok: false, reason: 'unknown_pet' };

    const result = data as { ok: boolean; reason?: string; remaining?: number; owner_id?: string; gift_id?: string };

    if (!result.ok) {
      if (result.reason === 'own_pet') return { ok: false, reason: 'own_pet' };
      if (result.reason === 'empty_wallet') return { ok: false, reason: 'empty' };
      return { ok: false, reason: 'unknown_pet' };
    }

    const remaining = result.remaining ?? wallet.remaining - 1;
    const ownerId = result.owner_id ?? '';
    const giftId = result.gift_id ?? `local-${now}`;

    const newGift: TreatGift = {
      id: giftId,
      fromUserId: user.id,
      companionId,
      ownerId,
      amount: 1,
      at: new Date(now).toISOString(),
      gifterHandle: user.email?.split('@')[0],
      gifterTint: '#F2972E',
    };

    setWallet(w => ({ ...w, remaining }));
    setGifts(g => [newGift, ...g]);
    showGiftBanner(companionId, ownerId, user.id, user.email?.split('@')[0]);

    return { ok: true, remaining, ownerId };
  }, [ready, user, wallet.remaining, isOwnPet, showGiftBanner]);

  const value = useMemo<TreatWalletContextValue>(() => ({
    ready,
    remaining: wallet.remaining,
    daysUntilReset: daysUntilReset(wallet.periodStartAt),
    showTreatsOnProfile,
    setShowTreatsOnProfile,
    syncShowTreatsOnProfile,
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
    ready, wallet, showTreatsOnProfile, setShowTreatsOnProfile, syncShowTreatsOnProfile,
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
