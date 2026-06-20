import { supabase } from '../lib/supabase';
import type { ForwardDest } from '../components/ForwardSheet';
import { RESCUE_STATUS_META, type RescueCase } from '../data/profileData';

export const RESCUE_CASE_LINK_RE = /parul:\/\/rescue\/([0-9a-f-]{36})/i;

export type RescueCaseSharePreview = {
  headline: string;
  caseCode?: string;
  statusLabel?: string;
  location?: string;
  storySnippet?: string;
};

export type ParsedRescueCaseShare = {
  caseId: string;
  preview?: RescueCaseSharePreview;
};

export function isRescueCaseShareText(text: string): boolean {
  return RESCUE_CASE_LINK_RE.test(text.trim());
}

export function parseRescueCaseShareText(text: string): ParsedRescueCaseShare | null {
  const trimmed = text.trim();
  const linkMatch = trimmed.match(RESCUE_CASE_LINK_RE);
  if (!linkMatch?.[1]) return null;

  const caseId = linkMatch[1];
  const withoutLink = trimmed.replace(/\n?parul:\/\/rescue\/[0-9a-f-]+/i, '').trim();
  const lines = withoutLink.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length === 0) return { caseId };

  const line0 = lines[0]!;
  let headline = line0;
  let caseCode: string | undefined;
  const codeSep = line0.lastIndexOf(' · ');
  if (codeSep >= 0 && /^RC\d/i.test(line0.slice(codeSep + 3).trim())) {
    headline = line0.slice(0, codeSep).trim();
    caseCode = line0.slice(codeSep + 3).trim();
  }

  let statusLabel: string | undefined;
  let location: string | undefined;
  if (lines[1]) {
    const metaSep = lines[1].indexOf(' · ');
    if (metaSep >= 0) {
      statusLabel = lines[1].slice(0, metaSep).trim();
      location = lines[1].slice(metaSep + 3).trim() || undefined;
    } else {
      statusLabel = lines[1];
    }
  }

  return {
    caseId,
    preview: {
      headline,
      caseCode,
      statusLabel,
      location,
      storySnippet: lines[2],
    },
  };
}

function buildCaseShareText(item: RescueCase): { title: string; body: string } {
  const statusLabel = RESCUE_STATUS_META[item.status]?.label ?? item.status;
  const headline = item.headline?.trim() || item.name;
  const storySnippet = item.story?.trim()
    ? (item.story.length > 120 ? `${item.story.slice(0, 117)}…` : item.story)
    : '';
  const location = item.location?.trim() || 'Location not listed';
  const caseCode = item.caseId ? ` · ${item.caseId}` : '';
  const link = `parul://rescue/${item.id}`;

  const title = `Rescue case: ${headline}`;
  const bodyParts = [
    `${headline}${caseCode}`,
    `${statusLabel} · ${location}`,
    storySnippet,
    link,
  ].filter(Boolean);

  return { title, body: bodyParts.join('\n') };
}

export async function shareRescueCase(
  item: RescueCase,
  dests: ForwardDest[],
  userId: string,
  note?: string,
): Promise<void> {
  const trimmedNote = note?.trim();
  const { title, body } = buildCaseShareText(item);

  for (const dest of dests) {
    if (dest.type === 'circle' && dest.dbId) {
      if (trimmedNote) {
        await supabase.from('circle_messages').insert({
          circle_id: dest.dbId,
          type: 'text',
          sender_user_id: userId,
          text: trimmedNote,
        });
      }
      await supabase.from('circle_messages').insert({
        circle_id: dest.dbId,
        type: 'text',
        sender_user_id: userId,
        text: body,
      });
    } else if (dest.type === 'community') {
      const sharedBody = trimmedNote ? `${trimmedNote}\n\n${body}` : body;
      const postTitle = title.length > 80 ? title.slice(0, 77) + '…' : title;
      await supabase.from('community_posts').insert({
        community_id: dest.id,
        author_user_id: userId,
        title: postTitle,
        body: sharedBody,
        category: 'general',
      });
    } else if (dest.type === 'member') {
      const { data: existing } = await supabase
        .from('thread_participants')
        .select('thread_id, threads!inner(type)')
        .eq('user_id', dest.id)
        .filter('threads.type', 'eq', 'dm');

      let threadId: string | null = null;
      if (existing && existing.length > 0) {
        const { data: mine } = await supabase
          .from('thread_participants')
          .select('thread_id')
          .eq('user_id', userId)
          .in('thread_id', (existing as { thread_id: string }[]).map(r => r.thread_id));
        threadId = (mine as { thread_id: string }[] | null)?.[0]?.thread_id ?? null;
      }

      if (!threadId) {
        const { data: newThread } = await supabase
          .from('threads')
          .insert({ type: 'dm' })
          .select('id')
          .single();
        if (!newThread) continue;
        threadId = (newThread as { id: string }).id;
        await supabase.from('thread_participants').insert([
          { thread_id: threadId, user_id: userId },
          { thread_id: threadId, user_id: dest.id },
        ]);
      }

      if (trimmedNote) {
        await supabase.from('messages').insert({
          thread_id: threadId,
          sender_user_id: userId,
          kind: 'text',
          text: trimmedNote,
        } as never);
      }
      await supabase.from('messages').insert({
        thread_id: threadId,
        sender_user_id: userId,
        kind: 'text',
        text: body,
      } as never);
    }
  }
}
