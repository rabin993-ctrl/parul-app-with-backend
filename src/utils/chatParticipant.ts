import type { ChatThread } from '../context/AdoptionContext';
import type { User } from '../data/mockData';

export function chatThreadParticipantUser(
  thread: ChatThread,
): Pick<User, 'id' | 'name' | 'tint' | 'avatarUrl' | 'avatarFallbackUrl' | 'avatarOriginalUrl'> {
  return {
    id: thread.participantId,
    name: thread.participantName ?? thread.participantId.slice(0, 8),
    tint: thread.participantTint ?? '#888888',
    avatarUrl: thread.participantAvatarUrl,
    avatarFallbackUrl: thread.participantAvatarFallbackUrl,
    avatarOriginalUrl: thread.participantAvatarOriginalUrl,
  };
}
