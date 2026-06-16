import type { ChatMessage } from '../context/AdoptionContext';
import type { Post } from '../data/mockData';

export function isAlertSharedPost(post: Post | undefined): boolean {
  if (!post) return false;
  return post.label === 'lost' || post.label === 'found' || !!post.lost || !!post.found;
}

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

    if (
      current.kind === 'text'
      && current.text.trim().length > 0
      && next?.kind === 'shared_post'
      && next.senderId === current.senderId
    ) {
      items.push({
        type: 'shared_with_text',
        id: `${next.id}:${current.id}`,
        shared: next,
        text: current,
      });
      i += 1;
      continue;
    }

    items.push({ type: 'message', id: current.id, message: current });
  }

  return items;
}
