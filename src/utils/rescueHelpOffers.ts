import { supabase } from '../lib/supabase';

export type HelpOfferType = 'foster' | 'transport' | 'vet' | 'supplies' | 'search' | 'other';

export type HelpOfferStatus = 'offered' | 'viewed' | 'accepted' | 'declined' | 'withdrawn';

export type ReviewHelpOfferAction = 'viewed' | 'accepted' | 'declined';

export const HELP_TYPES: { id: HelpOfferType; label: string }[] = [
  { id: 'foster', label: 'Foster' },
  { id: 'transport', label: 'Transport' },
  { id: 'vet', label: 'Vet care' },
  { id: 'supplies', label: 'Supplies' },
  { id: 'search', label: 'Search' },
  { id: 'other', label: 'Other' },
];

export function helpTypeLabel(type: HelpOfferType): string {
  return HELP_TYPES.find(t => t.id === type)?.label ?? 'Other';
}

export type RescueHelpOffer = {
  id: string;
  caseId: string;
  helperUserId: string;
  type: HelpOfferType;
  message: string | null;
  status: HelpOfferStatus;
  createdAt: string;
  helperName?: string;
  helperHandle?: string;
};

type DbOfferRow = {
  id: string;
  case_id: string;
  helper_user_id: string;
  type: string;
  message: string | null;
  status: string;
  created_at: string;
  users?: { name: string; handle: string | null } | null;
};

function mapOffer(row: DbOfferRow): RescueHelpOffer {
  return {
    id: row.id,
    caseId: row.case_id,
    helperUserId: row.helper_user_id,
    type: row.type as HelpOfferType,
    message: row.message,
    status: row.status as HelpOfferStatus,
    createdAt: row.created_at,
    helperName: row.users?.name,
    helperHandle: row.users?.handle ?? undefined,
  };
}

export function countPendingHelpOffers(offers: RescueHelpOffer[]): number {
  return offers.filter(o => o.status === 'offered' || o.status === 'viewed').length;
}

export async function fetchMyOffer(caseId: string, userId: string): Promise<RescueHelpOffer | null> {
  const { data, error } = await supabase
    .from('rescue_help_offers')
    .select('id, case_id, helper_user_id, type, message, status, created_at')
    .eq('case_id', caseId)
    .eq('helper_user_id', userId)
    .in('status', ['offered', 'viewed', 'accepted', 'declined'])
    .maybeSingle();

  if (error || !data) return null;
  return mapOffer(data as DbOfferRow);
}

export async function fetchCaseHelpOffers(caseId: string): Promise<RescueHelpOffer[]> {
  const { data, error } = await supabase
    .from('rescue_help_offers')
    .select('id, case_id, helper_user_id, type, message, status, created_at, users(name, handle)')
    .eq('case_id', caseId)
    .in('status', ['offered', 'viewed', 'accepted'])
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as DbOfferRow[]).map(mapOffer);
}

export async function submitHelpOffer(
  caseId: string,
  userId: string,
  type: HelpOfferType,
  message: string,
  posterUserId: string,
  actorName?: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmedMessage = message.trim() || null;

  const { error } = await supabase.from('rescue_help_offers').upsert(
    {
      case_id: caseId,
      helper_user_id: userId,
      type,
      message: trimmedMessage,
      status: 'offered',
    },
    { onConflict: 'case_id,helper_user_id' },
  );

  if (error) return { ok: false, error: error.message };

  if (posterUserId !== userId) {
    const name = actorName?.trim() || 'Someone';
    const typeLabel = helpTypeLabel(type);
    await supabase.from('notifications').insert({
      recipient_id: posterUserId,
      type: 'rescue_help',
      actor_user_id: userId,
      entity_type: 'rescue_case',
      entity_id: caseId,
      title: `${name} offered help`,
      body: trimmedMessage ?? `Can help with ${typeLabel.toLowerCase()}.`,
      data: { case_id: caseId, help_type: type },
    });
  }

  return { ok: true };
}

export async function withdrawHelpOffer(
  caseId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('rescue_help_offers')
    .update({ status: 'withdrawn' })
    .eq('case_id', caseId)
    .eq('helper_user_id', userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markOffersViewed(
  offerIds: string[],
  reviewerUserId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (offerIds.length === 0) return { ok: true };

  const { error } = await supabase
    .from('rescue_help_offers')
    .update({
      status: 'viewed',
      reviewed_by_user_id: reviewerUserId,
      reviewed_at: new Date().toISOString(),
    })
    .in('id', offerIds)
    .eq('status', 'offered');

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function reviewHelpOffer(
  offerId: string,
  action: ReviewHelpOfferAction,
  reviewerUserId: string,
  opts?: {
    helperUserId?: string;
    caseId?: string;
    caseName?: string;
    posterName?: string;
    helpType?: HelpOfferType;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('rescue_help_offers')
    .update({
      status: action,
      reviewed_by_user_id: reviewerUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', offerId);

  if (error) return { ok: false, error: error.message };

  if (
    action === 'accepted'
    && opts?.helperUserId
    && opts.caseId
    && opts.helperUserId !== reviewerUserId
  ) {
    const posterName = opts.posterName?.trim() || 'The poster';
    const caseName = opts.caseName?.trim() || 'your rescue case';
    const typeLabel = opts.helpType ? helpTypeLabel(opts.helpType).toLowerCase() : 'help';
    await supabase.from('notifications').insert({
      recipient_id: opts.helperUserId,
      type: 'rescue_help',
      actor_user_id: reviewerUserId,
      entity_type: 'rescue_case',
      entity_id: opts.caseId,
      title: `${posterName} accepted your help`,
      body: `On ${caseName} (${typeLabel}).`,
      data: { case_id: opts.caseId, help_type: opts.helpType, action: 'accepted' },
    });
  }

  return { ok: true };
}
