import { useCallback } from 'react';
import { useMentionActions } from '../context/MentionActionContext';
import type { MentionTarget } from '../utils/mentionText';

export function useMentionNavigation(options?: {
  returnTo?: 'Feed' | 'Hub' | 'Messages' | 'Profile';
  onBeforeNavigate?: () => void;
}) {
  const { handleMentionPress } = useMentionActions();

  return useCallback(
    (target: MentionTarget) => handleMentionPress(target, options),
    [handleMentionPress, options?.returnTo, options?.onBeforeNavigate],
  );
}
