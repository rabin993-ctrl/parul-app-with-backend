import type { ChatThread } from '../context/AdoptionContext';
import type { User } from '../data/mockData';
import { getCachedProfile } from '../hooks/useUserProfile';

export function chatThreadParticipantUser(
  thread: ChatThread,
): Pick<User, 'id' | 'name' | 'tint' | 'avatarUrl' | 'avatarFallbackUrl' | 'avatarOriginalUrl'> {
  const cached = getCachedProfile(thread.participantId);
  return {
    id: thread.participantId,
    name: thread.participantName ?? cached?.name ?? 'Someone',
    tint: thread.participantTint ?? cached?.tint ?? '#888888',
    avatarUrl: thread.participantAvatarUrl ?? cached?.avatarUrl,
    avatarFallbackUrl: thread.participantAvatarFallbackUrl ?? cached?.avatarFallbackUrl,
    avatarOriginalUrl: thread.participantAvatarOriginalUrl ?? cached?.avatarOriginalUrl,
  };
}
