import type { ChatMessage } from '../context/AdoptionContext';
import type { Post } from '../data/mockData';
import type { DbCircleMessage } from '../hooks/useCircleMessages';

export function isAlertSharedPost(post: Post | undefined): boolean {
  if (!post) return false;
  return post.label === 'lost' || post.label === 'found' || !!post.lost || !!post.found;
}

export function resolveSharedPostTint(
  post: Post | undefined,
  isMe: boolean,
  peerTint: string | undefined,
  colors: { danger: string; success: string; primary: string },
): string {
  if (post?.label === 'lost') return colors.danger;
  if (post?.label === 'found') return colors.success;
  return isMe ? colors.primary : (peerTint ?? colors.primary);
}

export function sharedPostChatCardProps(
  post: Post | undefined,
  isMe: boolean,
  peerTint: string | undefined,
  colors: { danger: string; success: string; primary: string },
) {
  const isAlertCard = isAlertSharedPost(post);
  return {
    circleTint: resolveSharedPostTint(post, isMe, peerTint, colors),
    hideCaption: isAlertCard,
    variant: (isAlertCard ? 'compact' : 'chat') as 'compact' | 'chat' | 'default',
    fullWidth: isAlertCard,
  };
}

export type ChatListItem =
  | { type: 'message'; id: string; message: ChatMessage }
  | { type: 'shared_with_text'; id: string; shared: ChatMessage; text: ChatMessage };

/** Merge an optional forward note (text) with the shared_post sent immediately after. */
export function buildChatListItems(messages: ChatMessage[]): ChatListItem[] {
  const items: ChatListItem[] = [];

  for (let i = 0; i < messages.length; i += 1) {
    const current = messages[i];
    const next = messages[i + 1];

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

export type CircleChatListItem =
  | { type: 'message'; id: string; message: DbCircleMessage }
  | {
      type: 'shared_with_text';
      id: string;
      shared: Extract<DbCircleMessage, { type: 'shared_post' }>;
      text: Extract<DbCircleMessage, { type: 'text' }>;
    };

/** Merge an optional forward note (text) with the shared_post sent immediately after. */
export function buildCircleChatListItems(messages: DbCircleMessage[]): CircleChatListItem[] {
  const items: CircleChatListItem[] = [];

  for (let i = 0; i < messages.length; i += 1) {
    const current = messages[i];
    const next = messages[i + 1];

    if (
      current.type === 'text'
      && current.text.trim().length > 0
      && next?.type === 'shared_post'
      && next.userId === current.userId
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
