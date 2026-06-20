import { supabase } from '../lib/supabase';
import type { ChatMessage, ChatThread } from '../context/AdoptionContext';
import { HELP_TYPES, helpTypeLabel, type HelpOfferType } from './rescueHelpOffers';
import { startDirectMessage } from './startDirectMessage';

export type RescueHelpChatContext = {
  caseId: string;
  caseName: string;
  helpType: HelpOfferType;
  role: 'poster' | 'helper';
};

const CASE_MARKER_PREFIX = 'RESCUE_CASE:';

const rescueContextByThreadId = new Map<string, RescueHelpChatContext>();

export function setRescueHelpContext(threadId: string, context: RescueHelpChatContext): void {
  rescueContextByThreadId.set(threadId, context);
}

export function getRescueHelpContext(threadId: string): RescueHelpChatContext | undefined {
  return rescueContextByThreadId.get(threadId);
}

export function buildRescueHelpIntroText(context: RescueHelpChatContext): string {
  const typeLabel = helpTypeLabel(context.helpType);
  return `${CASE_MARKER_PREFIX}${context.caseId}|Rescue help · ${context.caseName} (${typeLabel}): coordinate next steps here.`;
}

export function rescueHelpIntroDisplayText(introText: string): string {
  const pipe = introText.indexOf('|');
  return pipe >= 0 ? introText.slice(pipe + 1) : introText;
}

/** True when preview text is the rescue system intro, not a user message. */
export function isRescueIntroPreview(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('Rescue help ·')) return true;
  if (trimmed.includes(CASE_MARKER_PREFIX)) return true;
  return false;
}

function helpTypeFromLabel(label: string): HelpOfferType {
  return HELP_TYPES.find(t => t.label === label)?.id ?? 'other';
}

export function parseRescueContextFromIntro(text: string): RescueHelpChatContext | null {
  if (!text.startsWith(CASE_MARKER_PREFIX)) return null;

  const pipe = text.indexOf('|');
  if (pipe < 0) return null;

  const caseId = text.slice(CASE_MARKER_PREFIX.length, pipe);
  const display = text.slice(pipe + 1);
  const match = display.match(/^Rescue help · (.+) \((.+)\) [:—]/);
  if (!match) {
    return {
      caseId,
      caseName: 'Rescue case',
      helpType: 'other',
      role: 'helper',
    };
  }

  return {
    caseId,
    caseName: match[1]!.trim(),
    helpType: helpTypeFromLabel(match[2]!.trim()),
    role: 'helper',
  };
}

export function parseRescueContextFromMessages(messages: ChatMessage[]): RescueHelpChatContext | null {
  for (const msg of messages) {
    if (msg.kind !== 'system' || !msg.text) continue;
    const parsed = parseRescueContextFromIntro(msg.text);
    if (parsed) return parsed;
  }
  return null;
}

export function resolveRescueHelpContext(
  thread: ChatThread,
  messages: ChatMessage[],
): RescueHelpChatContext | undefined {
  if (thread.rescueContext) {
    setRescueHelpContext(thread.id, thread.rescueContext);
    return thread.rescueContext;
  }

  const cached = getRescueHelpContext(thread.id);
  if (cached) return cached;

  const parsed = parseRescueContextFromMessages(messages);
  if (parsed) {
    setRescueHelpContext(thread.id, parsed);
    return parsed;
  }

  return undefined;
}

export function getRescueContextForInbox(
  thread: ChatThread,
  messages?: ChatMessage[],
): RescueHelpChatContext | undefined {
  return resolveRescueHelpContext(thread, messages ?? []);
}

export function isRescueHelpThread(
  thread: ChatThread,
  messages?: ChatMessage[],
): boolean {
  return getRescueContextForInbox(thread, messages) != null;
}

async function threadHasRescueIntro(threadId: string, caseId: string): Promise<boolean> {
  const marker = `${CASE_MARKER_PREFIX}${caseId}|`;
  const { data, error } = await supabase
    .from('messages')
    .select('id')
    .eq('thread_id', threadId)
    .eq('kind', 'system')
    .is('deleted_at', null)
    .ilike('text', `${marker}%`)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

async function seedRescueHelpIntroMessage(
  threadId: string,
  context: RescueHelpChatContext,
): Promise<string> {
  const introText = buildRescueHelpIntroText(context);
  const exists = await threadHasRescueIntro(threadId, context.caseId);
  if (exists) return rescueHelpIntroDisplayText(introText);

  const { error } = await supabase.rpc('seed_rescue_help_intro', {
    p_thread_id: threadId,
    p_intro_text: introText,
  });

  if (error) {
    console.warn('[seedRescueHelpIntroMessage]', error.message);
  }

  return rescueHelpIntroDisplayText(introText);
}

async function seedRescueHelpOfferMessage(
  threadId: string,
  caseId: string,
  helperUserId: string,
): Promise<string | null> {
  const trimmedHelper = helperUserId.trim();
  if (!trimmedHelper) return null;

  const { error } = await supabase.rpc('seed_rescue_help_offer_message', {
    p_thread_id: threadId,
    p_case_id: caseId,
    p_helper_user_id: trimmedHelper,
  });

  if (error) {
    console.warn('[seedRescueHelpOfferMessage]', error.message);
    return null;
  }

  const { data, error: fetchError } = await supabase
    .from('rescue_help_offers')
    .select('message')
    .eq('case_id', caseId)
    .eq('helper_user_id', trimmedHelper)
    .eq('status', 'accepted')
    .maybeSingle();

  if (fetchError || !data?.message?.trim()) return null;
  return data.message.trim();
}

/** Fire-and-forget repair when context came from offers but intro was never persisted. */
export function repairRescueHelpIntro(threadId: string, context: RescueHelpChatContext): void {
  void seedRescueHelpIntroMessage(threadId, context);
}

/** Fire-and-forget repair for accepted offer text missing from the thread. */
export function repairRescueHelpOfferMessage(
  threadId: string,
  context: RescueHelpChatContext,
  helperUserId: string,
): void {
  void seedRescueHelpOfferMessage(threadId, context.caseId, helperUserId);
}

type DbRescueOfferRow = {
  case_id: string;
  type: HelpOfferType;
  reviewed_at: string | null;
  helper_user_id: string;
  rescue_cases: {
    id: string;
    name: string;
    poster_user_id: string;
  };
};

/** Accepted rescue offers → peer user id → context (most recent reviewed_at wins). */
export async function fetchRescueContextsFromOffers(
  userId: string,
  peerIds: string[],
): Promise<Map<string, RescueHelpChatContext>> {
  const result = new Map<string, RescueHelpChatContext>();
  if (peerIds.length === 0) return result;

  const peerSet = new Set(peerIds);
  const { data, error } = await supabase
    .from('rescue_help_offers')
    .select('case_id, type, reviewed_at, helper_user_id, rescue_cases!inner(id, name, poster_user_id)')
    .eq('status', 'accepted');

  if (error || !data) return result;

  const ranked = [...(data as DbRescueOfferRow[])].sort((a, b) => {
    const aTs = a.reviewed_at ? Date.parse(a.reviewed_at) : 0;
    const bTs = b.reviewed_at ? Date.parse(b.reviewed_at) : 0;
    return bTs - aTs;
  });

  for (const row of ranked) {
    const rc = row.rescue_cases;
    const posterId = rc.poster_user_id;
    const helperId = row.helper_user_id;
    let peerId: string | null = null;
    let role: RescueHelpChatContext['role'];

    if (userId === posterId && peerSet.has(helperId)) {
      peerId = helperId;
      role = 'poster';
    } else if (userId === helperId && peerSet.has(posterId)) {
      peerId = posterId;
      role = 'helper';
    }

    if (!peerId || result.has(peerId)) continue;

    result.set(peerId, {
      caseId: row.case_id,
      caseName: rc.name,
      helpType: row.type,
      role: role!,
    });
  }

  return result;
}

export async function openRescueHelpChat(params: {
  peerUserId: string;
  peerName?: string;
  peerHandle?: string;
  peerTint?: string;
  context: RescueHelpChatContext;
  helperUserId: string;
}): Promise<{ thread: ChatThread } | { error: string }> {
  const dm = await startDirectMessage(params.peerUserId);
  if ('error' in dm) return { error: dm.error };

  setRescueHelpContext(dm.threadId, params.context);

  await seedRescueHelpIntroMessage(dm.threadId, params.context);
  const offerPreview = await seedRescueHelpOfferMessage(
    dm.threadId,
    params.context.caseId,
    params.helperUserId,
  );

  const preview = offerPreview ?? '';

  const thread: ChatThread = {
    id: dm.threadId,
    participantId: params.peerUserId,
    participantName: params.peerName,
    participantHandle: params.peerHandle,
    participantTint: params.peerTint,
    preview,
    time: 'Now',
    unread: 0,
    rescueContext: params.context,
  };

  return { thread };
}
