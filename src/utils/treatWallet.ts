export const TREAT_ALLOWANCE = 100;
export const TREAT_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export const STORAGE_KEYS = {
  wallet: 'parul:treatWallet:you',
  gifts: 'parul:treatGifts:v1',
  showTreatsOnProfile: 'parul:showTreatsOnProfile:you',
} as const;

export type TreatWallet = {
  periodStartAt: string;
  remaining: number;
  allowance: number;
};

export type TreatGift = {
  id: string;
  fromUserId: string;
  companionId: string;
  ownerId: string;
  amount: number;
  at: string;
  gifterName?: string;
  gifterHandle?: string;
  gifterTint?: string;
};

export function createFreshWallet(now = Date.now()): TreatWallet {
  return {
    periodStartAt: new Date(now).toISOString(),
    remaining: TREAT_ALLOWANCE,
    allowance: TREAT_ALLOWANCE,
  };
}

export function isPeriodExpired(periodStartAt: string, now = Date.now()): boolean {
  const start = new Date(periodStartAt).getTime();
  return now - start >= TREAT_PERIOD_MS;
}

export function normalizeWallet(wallet: TreatWallet | null, now = Date.now()): TreatWallet {
  if (!wallet) return createFreshWallet(now);
  if (isPeriodExpired(wallet.periodStartAt, now)) return createFreshWallet(now);
  return {
    ...wallet,
    allowance: wallet.allowance ?? TREAT_ALLOWANCE,
    remaining: Math.max(0, Math.min(wallet.remaining, wallet.allowance ?? TREAT_ALLOWANCE)),
  };
}

export function daysUntilReset(periodStartAt: string, now = Date.now()): number {
  const start = new Date(periodStartAt).getTime();
  const end = start + TREAT_PERIOD_MS;
  const diff = end - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function makeGiftId(): string {
  return `gift-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function sumGiftsForOwner(
  gifts: TreatGift[],
  ownerId: string,
): number {
  return gifts
    .filter(g => g.ownerId === ownerId)
    .reduce((sum, g) => sum + g.amount, 0);
}

export function sumGiftsForCompanion(
  gifts: TreatGift[],
  companionId: string,
): number {
  return gifts
    .filter(g => g.companionId === companionId)
    .reduce((sum, g) => sum + g.amount, 0);
}
