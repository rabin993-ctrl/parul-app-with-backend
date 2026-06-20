import { supabase } from '../lib/supabase';
import type { ForwardDest } from '../components/ForwardSheet';
import { RESCUE_STATUS_META, type RescueCase } from '../data/profileData';

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
