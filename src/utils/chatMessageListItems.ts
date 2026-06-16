import type { ChatMessage } from '../context/AdoptionContext';

export type ChatListItem =
  | { type: 'message'; id: string; message: ChatMessage }
  | { type: 'shared_with_text'; id: string; shared: ChatMessage; text: ChatMessage };

/** Merge a shared_post + immediate follow-up text from the same sender into one chat row. */
export function buildChatListItems(messages: ChatMessage[]): ChatListItem[] {
  const items: ChatListItem[] = [];

  for (let i = 0; i < messages.length; i += 1) {
    const current = messages[i];
    const next = messages[i + 1];

    if (
      current.kind === 'shared_post'
      && next?.kind === 'text'
      && next.senderId === current.senderId
      && next.text.trim().length > 0
    ) {
      items.push({
        type: 'shared_with_text',
        id: `${current.id}:${next.id}`,
        shared: current,
        text: next,
      });
      i += 1;
      continue;
    }

    items.push({ type: 'message', id: current.id, message: current });
  }

  return items;
}
