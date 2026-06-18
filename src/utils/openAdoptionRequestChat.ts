import type { AdoptionRequest } from '../context/AdoptionFeedContext';
import type { ChatThread } from '../context/AdoptionContext';
import { navigateToPawCircleInbox } from '../navigation/pawCircleInboxRouting';

type NavLike = {
  navigate: (name: string, params?: object) => void;
  getParent?: () => NavLike | undefined;
};

export async function openAdoptionRequestChat(params: {
  request: AdoptionRequest;
  approveRequest: (requestId: string) => Promise<string | null>;
  reloadThreads: () => Promise<ChatThread[]>;
  onOpen?: (thread: ChatThread) => void;
  navigation?: NavLike;
}): Promise<boolean> {
  const { request, approveRequest, reloadThreads, onOpen, navigation } = params;

  if (request.status === 'adopted' || request.status === 'rejected') return false;

  let threadId = request.threadId;

  if (request.status === 'submitted') {
    threadId = (await approveRequest(request.id)) ?? undefined;
    if (!threadId) return false;
  }

  if (!threadId) return false;

  const threads = await reloadThreads();
  const thread = threads.find(t => t.id === threadId);
  if (!thread) return false;

  if (onOpen) {
    onOpen(thread);
  } else if (navigation) {
    navigateToPawCircleInbox(navigation, { filter: 'adoption', threadId: thread.id });
  }

  return true;
}
