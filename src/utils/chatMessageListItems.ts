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

export type ChatListItem = { type: 'message'; id: string; message: ChatMessage };

export function buildChatListItems(messages: ChatMessage[]): ChatListItem[] {
  return messages.map(message => ({ type: 'message', id: message.id, message }));
}

export type CircleChatListItem = { type: 'message'; id: string; message: DbCircleMessage };

export function buildCircleChatListItems(messages: DbCircleMessage[]): CircleChatListItem[] {
  return messages.map(message => ({ type: 'message', id: message.id, message }));
}
