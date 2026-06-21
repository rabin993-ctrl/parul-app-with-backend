import React, {
  createContext, useCallback, useContext, useMemo, useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { usePawCircles } from './PawCircleContext';
import { supabase } from '../lib/supabase';
import { navigateToUserProfile } from '../navigation/userProfileRouting';
import type { MentionTarget } from '../utils/mentionText';
import { CircleMentionJoinDialog } from '../components/pawCircles/CircleMentionJoinDialog';
import { Toast, ToastData } from '../components/ui/Toast';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CirclePromptState = {
  circleId: string;
  returnTo?: 'Feed' | 'Hub' | 'Messages' | 'Profile';
  mode: 'join' | 'pending';
};

type MentionPressOptions = {
  returnTo?: 'Feed' | 'Hub' | 'Messages' | 'Profile';
  onBeforeNavigate?: () => void;
};

type MentionActionContextValue = {
  handleMentionPress: (target: MentionTarget, options?: MentionPressOptions) => void;
};

const MentionActionContext = createContext<MentionActionContextValue | null>(null);

export function MentionActionProvider({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation<{ navigate: (name: string, params?: object) => void; getParent?: () => { navigate: (name: string, params?: object) => void } | undefined }>();
  const { user } = useAuth();
  const { isJoined, isPending, joinCircle, cancelCircleRequest, getCircle } = usePawCircles();
  const [prompt, setPrompt] = useState<CirclePromptState | null>(null);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const tabNav = useCallback(
    () => navigation.getParent?.() ?? navigation,
    [navigation],
  );

  const navigateToCircleChat = useCallback((
    circleId: string,
    returnTo: 'Feed' | 'Hub' | 'Messages' | 'Profile' = 'Feed',
  ) => {
    tabNav().navigate('Circles', {
      screen: 'CircleChat',
      params: { circleId, returnTo },
    });
  }, [tabNav]);

  const handleMentionPress = useCallback(async (
    target: MentionTarget,
    options?: MentionPressOptions,
  ) => {
    const returnTo = options?.returnTo ?? 'Feed';

    if (target.type === 'circle') {
      options?.onBeforeNavigate?.();

      if (!user) {
        setToast({ msg: 'Sign in to join circles', icon: 'alert', tone: 'danger' });
        return;
      }

      if (isJoined(target.id)) {
        navigateToCircleChat(target.id, returnTo);
        return;
      }

      if (isPending(target.id)) {
        setPrompt({ circleId: target.id, returnTo, mode: 'pending' });
        return;
      }

      setPrompt({ circleId: target.id, returnTo, mode: 'join' });
      return;
    }

    options?.onBeforeNavigate?.();

    switch (target.type) {
      case 'community':
        tabNav().navigate('Community', {
          screen: 'Group',
          params: { communityId: target.id },
        });
        break;
      case 'member': {
        let userId = target.id;
        if (!UUID_RE.test(userId)) {
          const { data } = await supabase
            .from('users')
            .select('id')
            .eq('handle', target.id)
            .maybeSingle();
          if (!data?.id) return;
          userId = data.id;
        }
        navigateToUserProfile(tabNav(), userId, user?.id, { returnTo });
        break;
      }
      default:
        break;
    }
  }, [user, isJoined, isPending, navigateToCircleChat, tabNav]);

  const handleJoin = useCallback(async () => {
    if (!prompt) return;
    const circle = getCircle(prompt.circleId);
    setJoining(true);
    try {
      await joinCircle(prompt.circleId);
      if (circle?.privacy === 'request') {
        setPrompt({ ...prompt, mode: 'pending' });
        setToast({ msg: `Request sent to ${circle.name}!`, icon: 'check', tone: 'success' });
      } else {
        setPrompt(null);
        setToast({ msg: `Joined ${circle?.name ?? 'circle'}!`, icon: 'check', tone: 'success' });
        navigateToCircleChat(prompt.circleId, prompt.returnTo ?? 'Feed');
      }
    } finally {
      setJoining(false);
    }
  }, [prompt, getCircle, joinCircle, navigateToCircleChat]);

  const handleCancel = useCallback(async () => {
    if (!prompt) return;
    const circle = getCircle(prompt.circleId);
    setCancelling(true);
    try {
      await cancelCircleRequest(prompt.circleId);
      setPrompt(null);
      setToast({ msg: `Cancelled request to ${circle?.name ?? 'circle'}`, icon: 'check', tone: 'neutral' });
    } catch {
      setToast({ msg: 'Failed to cancel request', icon: 'close', tone: 'neutral' });
    } finally {
      setCancelling(false);
    }
  }, [prompt, getCircle, cancelCircleRequest]);

  const circle = prompt ? getCircle(prompt.circleId) : null;

  const value = useMemo(
    () => ({ handleMentionPress }),
    [handleMentionPress],
  );

  return (
    <MentionActionContext.Provider value={value}>
      {children}
      <CircleMentionJoinDialog
        visible={!!prompt && !!circle}
        circle={circle}
        mode={prompt?.mode ?? 'join'}
        loading={joining || cancelling}
        onJoin={handleJoin}
        onCancel={prompt?.mode === 'pending' ? handleCancel : undefined}
        onDismiss={() => setPrompt(null)}
      />
      <Toast data={toast} onHide={() => setToast(null)} />
    </MentionActionContext.Provider>
  );
}

export function useMentionActions() {
  const ctx = useContext(MentionActionContext);
  if (!ctx) throw new Error('useMentionActions must be used within MentionActionProvider');
  return ctx;
}
