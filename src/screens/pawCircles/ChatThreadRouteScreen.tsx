import React, { useCallback, useEffect, useMemo } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAdoption, type ChatThread } from '../../context/AdoptionContext';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';
import { getRescueHelpContext, resolveRescueHelpContext } from '../../utils/rescueHelpChat';
import { ChatThreadScreen } from '../ChatThreadScreen';
import { getRootNavigation } from '../../navigation/notificationRouting';
import { openRescueCaseDetail } from '../../navigation/rescueCaseRouting';

type Route = RouteProp<CirclesStackParamList, 'ChatThread'>;
type Nav = NativeStackNavigationProp<CirclesStackParamList, 'ChatThread'>;

export function ChatThreadRouteScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const params = route.params;
  const { threads, messages, reloadThreads } = useAdoption();

  const contextThread = useMemo(
    () => threads.find(t => t.id === params.threadId),
    [threads, params.threadId],
  );

  const thread = useMemo((): ChatThread => {
    const base: ChatThread = contextThread ? { ...contextThread } : {
      id: params.threadId,
      participantId: params.participantId ?? '',
      participantName: params.participantName,
      participantHandle: params.participantHandle,
      participantTint: params.participantTint,
      participantAvatarUrl: params.participantAvatarUrl,
      participantAvatarFallbackUrl: params.participantAvatarFallbackUrl,
      participantAvatarOriginalUrl: params.participantAvatarOriginalUrl,
      preview: '',
      time: '',
      unread: 0,
      adoptionPostId: params.adoptionPostId,
      adoptionRecordId: params.adoptionRecordId,
    };

    const threadMessages = messages[params.threadId] ?? [];
    const rescueContext = base.rescueContext
      ?? getRescueHelpContext(params.threadId)
      ?? resolveRescueHelpContext(base, threadMessages);

    return rescueContext ? { ...base, rescueContext } : base;
  }, [
    contextThread,
    messages,
    params.threadId,
    params.participantId,
    params.participantName,
    params.participantHandle,
    params.participantTint,
    params.participantAvatarUrl,
    params.participantAvatarFallbackUrl,
    params.participantAvatarOriginalUrl,
    params.adoptionPostId,
    params.adoptionRecordId,
  ]);

  useEffect(() => {
    if (Object.prototype.hasOwnProperty.call(messages, params.threadId)) return;
    void reloadThreads();
  }, [messages, params.threadId, reloadThreads]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleViewRescueCase = useCallback((caseId: string) => {
    navigation.goBack();
    openRescueCaseDetail(getRootNavigation(navigation), caseId);
  }, [navigation]);

  return (
    <ChatThreadScreen
      thread={thread}
      threadConnecting={params.threadConnecting ?? false}
      rescueCaseOriginId={params.rescueCaseOriginId}
      onClose={handleClose}
      onViewRescueCase={handleViewRescueCase}
    />
  );
}
