import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, FlatList, StyleSheet, KeyboardAvoidingView, Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows, spacing, typography } from '../theme/tokens';
import { Avatar, CompanionAvatar } from '../components/ui/Avatar';
import { getPetAvatarFrameSize } from '../components/ui/PawPadShape';
import { IconButton } from '../components/ui/Button';
import {
  APP_HEADER_PADDING_H,
  APP_HEADER_PADDING_TOP,
} from '../components/ui/AppSubHeader';
import { Icon } from '../components/icons/Icon';
import { PostHomeUpdateSheet } from '../components/adoption/AdoptionUpdateUI';
import { ChatAdoptionPanel } from '../components/adoption/ChatAdoptionPanel';
import { RescueHelpChatBanner } from '../components/rescue/RescueHelpChatBanner';
import { ChatPeerOptionsSheet } from '../components/messages/ChatPeerOptionsSheet';
import { Toast, ToastData } from '../components/ui/Toast';
import { MentionText } from '../components/ui/MentionText';
import { useHideTabBarWhileMounted } from '../context/SheetOverlayContext';
import type { CirclesStackParamList } from '../navigation/CirclesNavigator';
import { useAuth } from '../context/AuthContext';
import { chatThreadParticipantUser } from '../utils/chatParticipant';
import { useUserProfile, getCachedProfile } from '../hooks/useUserProfile';
import { useUserOnlineStatus } from '../hooks/useUserPrivacyFlags';
import { refreshUserPrivacyFlags } from '../lib/userPrivacyFlagCache';
import { useMobileWeb } from '../hooks/useMobileWeb';
import { useVisualViewportInset } from '../hooks/useVisualViewportInset';
import { useChatListScrollToEnd } from '../hooks/useChatListScrollToEnd';
import { useAdoption, type ChatMessage, type ChatThread } from '../context/AdoptionContext';
import { useFeedPosts } from '../context/FeedPostContext';
import { useHomeHub } from '../context/HomeHubContext';
import { openFeedSharedPost } from '../navigation/feedPostRouting';
import { selectFeedRows, postsFromDbRows, type DbPostRow } from '../hooks/useFeedQuery';
import { supabase } from '../lib/supabase';
import type { Post } from '../data/mockData';
import { buildChatListItems, isAlertSharedPost, type ChatListItem } from '../utils/chatMessageListItems';
import { sharedPostLoadingLabel } from '../utils/chatPreviewText';
import { RescueCaseShareCard } from '../components/rescue/RescueCaseShareCard';
import { useRescueFeedOptional } from '../context/RescueFeedContext';
import { getRescueCaseById } from '../data/rescueData';
import { fetchRescueCaseById } from '../utils/rescueCases';
import {
  isRescueCaseShareText,
  parseRescueCaseShareText,
} from '../utils/shareRescueCase';
import type { RescueCase } from '../data/profileData';
import { resolveRescueHelpContext, rescueHelpIntroDisplayText } from '../utils/rescueHelpChat';
import { getRootNavigation } from '../navigation/notificationRouting';
import { openRescueCaseDetail } from '../navigation/rescueCaseRouting';
import { CircleSharedPostCard } from './pawCircles/CircleSharedPostCard';
import { CircleAttachSheet, type CircleAttachAction } from '../components/pawCircles/CircleAttachSheet';
import { CircleMediaBubble } from '../components/pawCircles/CircleMediaBubble';
import { useMediaPicker } from '../hooks/useMediaPicker';
import { useFilePicker } from '../hooks/useFilePicker';
import {
  type ChatAttachmentDraft,
} from '../components/chat/ChatComposerAttachment';
import { ChatThreadComposer, type ChatThreadComposerHandle } from '../components/chat/ChatThreadComposer';
import { useUserPrivacy } from '../context/UserPrivacyContext';
import { useAdoptionFeed } from '../context/AdoptionFeedContext';
import { performPosterRelist } from '../utils/adoptionRelist';
import { getActivePrompt } from '../utils/adoptionUpdateSchedule';
import {
  chatSublineAccentColor,
  getThreadAdoptionMeta,
  getThreadChatDisplay,
  getThreadPetVisual,
  groupAdoptionChatThreads,
  adoptionChatHasCareTimeline,
  isSettledPlacementAccent,
  sublineAccentOpensAdoptionDetail,
} from '../utils/chatThreadMeta';

type TabParamList = {
  Feed: undefined;
  Circles: { screen?: keyof CirclesStackParamList; params?: CirclesStackParamList[keyof CirclesStackParamList] };
  Vet: undefined;
  Profile: { screen?: string; params?: { recordId: string; openOwnerPost?: boolean } };
};

type Props = {
  thread: ChatThread;
  onClose: () => void;
  /** DM thread id still resolving (e.g. profile Message tap) — keep composer focused but block send. */
  threadConnecting?: boolean;
  rescueCaseOriginId?: string;
  onViewRescueCase?: (caseId: string) => void;
};

const INPUT_BG_LIGHT = '#EFF1F5';
const INPUT_BG_DARK = '#2A243C';
const OUTGOING_BUBBLE_LIGHT = '#D6E4FF';
const OUTGOING_BUBBLE_DARK = '#1E2A42';

const HEADER_AVATAR_SIZE = 40;
const PET_AVATAR_FRAME = getPetAvatarFrameSize(HEADER_AVATAR_SIZE);
const BUBBLE_AVATAR_SIZE = 36;
const BUBBLE_MAX_WIDTH_RATIO = 0.68;
const BUBBLE_MAX_WIDTH_CAP = 280;

function resolveSharedPostTint(
  post: Post | undefined,
  isMe: boolean,
  peerTint: string | undefined,
  colors: { danger: string; success: string; primary: string },
): string {
  if (post?.label === 'lost') return colors.danger;
  if (post?.label === 'found') return colors.success;
  return isMe ? colors.primary : (peerTint ?? colors.primary);
}

function DatePill({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <View style={styles.dateWrap}>
      <View style={[styles.datePill, { backgroundColor: bg }]}>
        <Text style={[styles.dateText, { color: text }]}>{label}</Text>
      </View>
    </View>
  );
}

export function ChatThreadScreen({
  thread,
  onClose,
  threadConnecting = false,
  rescueCaseOriginId,
  onViewRescueCase,
}: Props) {
  const { colors, mode } = useTheme();
  const mobileWeb = useMobileWeb();
  const keyboardInset = useVisualViewportInset(mobileWeb);
  useHideTabBarWhileMounted();
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const { width: screenWidth } = useWindowDimensions();
  const bubbleMaxWidth = Math.min(
    Math.round(screenWidth * BUBBLE_MAX_WIDTH_RATIO),
    BUBBLE_MAX_WIDTH_CAP,
  );
  const {
    getThreadMessages,
    sendMessage,
    sendPhoto,
    sendFile,
    proposeAdoption,
    relistAdoptionPlacement,
    getRecordByThread,
    submitAdopterUpdate,
    records,
    markRead,
    toggleMute,
    dismissAdoptionThread,
    reloadThreads,
    setActiveChatThreadId,
  } = useAdoption();
  const {
    listings,
    requests,
    markAdopted,
    relistListing,
    clearRequestOnRelist,
    getRequestForListing,
    approveRequest,
  } = useAdoptionFeed();
  const { blockUser, reportUser, isBlocked } = useUserPrivacy();
  const { posts: feedPosts, ensureFeedPost } = useFeedPosts();
  const { selectSection } = useHomeHub();
  const [sharedPostMap, setSharedPostMap] = useState<Record<string, Post>>({});
  const [rescueCaseMap, setRescueCaseMap] = useState<Record<string, RescueCase>>({});
  const rescueFeed = useRescueFeedOptional();
  const composerRef = useRef<ChatThreadComposerHandle>(null);
  const [updateSheetOpen, setUpdateSheetOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [muted, setMuted] = useState(thread.muted ?? false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachmentDraft | null>(null);
  const listRef = useRef<FlatList<ChatListItem>>(null);
  const { scrollToLatest, scrollToLatestWithRetries } = useChatListScrollToEnd(listRef, true);
  const { pickImage, takePhoto } = useMediaPicker();
  const { pickFile } = useFilePicker();

  const allMessages = getThreadMessages(thread.id);
  const chatMessages = useMemo(
    () => allMessages.filter(m =>
      m.kind === 'text'
      || m.kind === 'system'
      || m.kind === 'shared_post'
      || m.kind === 'media',
    ),
    [allMessages],
  );
  const chatListItems = useMemo(() => buildChatListItems(chatMessages), [chatMessages]);
  const rescueContext = useMemo(
    () => resolveRescueHelpContext(thread, chatMessages),
    [thread, chatMessages],
  );

  const handleViewRescueCase = useCallback(() => {
    if (!rescueContext) return;
    onClose();
    if (rescueContext.caseId === rescueCaseOriginId) return;
    if (onViewRescueCase) {
      onViewRescueCase(rescueContext.caseId);
      return;
    }
    openRescueCaseDetail(getRootNavigation(navigation), rescueContext.caseId);
  }, [rescueContext, rescueCaseOriginId, onClose, onViewRescueCase, navigation]);
  const record = getRecordByThread(thread.id)
    ?? records.find(r => r.chatThreadId === thread.id || r.id === thread.adoptionRecordId);
  const peerProfile = useUserProfile(thread.participantId);
  const listingId = record?.adoptionPostId ?? thread.adoptionPostId;
  const listing = listingId ? listings.find(l => l.id === listingId) : undefined;
  const myId = authUser?.id;
  const isPoster = record
    ? record.posterId === myId
    : (listing?.userId === myId);
  const incomingRequest = listingId && isPoster
    ? getRequestForListing(listingId, thread.participantId)
    : undefined;
  const peer = thread.participantId
    ? {
      ...chatThreadParticipantUser(thread),
      name: thread.participantName
        ?? peerProfile?.name
        ?? incomingRequest?.requesterName
        ?? 'Someone',
      handle: thread.participantHandle
        ?? peerProfile?.handle
        ?? thread.participantId.slice(0, 8),
      tint: thread.participantTint ?? peerProfile?.tint ?? '#888888',
      avatarUrl: thread.participantAvatarUrl ?? peerProfile?.avatarUrl,
      avatarFallbackUrl: thread.participantAvatarFallbackUrl ?? peerProfile?.avatarFallbackUrl,
      avatarOriginalUrl: thread.participantAvatarOriginalUrl ?? peerProfile?.avatarOriginalUrl,
      loc: '',
      verified: false,
    }
    : null;
  const peerIsOnline = useUserOnlineStatus(peer?.id);

  useEffect(() => {
    if (!peer?.id) return;
    void refreshUserPrivacyFlags([peer.id]);
  }, [peer?.id]);
  const myRequest = listingId ? getRequestForListing(listingId, myId) : undefined;
  const isAdopter = (record?.adopterId === myId)
    || (!!myRequest && !isPoster);
  const activePrompt = useMemo(
    () => (record && isAdopter ? getActivePrompt(record) : null),
    [record, isAdopter],
  );
  const threadMeta = useMemo(
    () => getThreadAdoptionMeta(thread, records, authUser?.id ?? ''),
    [thread, records, authUser?.id],
  );
  const petVisual = useMemo(
    () => getThreadPetVisual(thread, records, authUser?.id ?? ''),
    [thread, records, authUser?.id],
  );
  const isAdoptionThread = !!(thread.adoptionPostId || record);
  const posterHasReplied = chatMessages.some(m => m.kind === 'text' && m.senderId === authUser?.id);
  const peerBlocked = !!(peer && isBlocked(peer.id));
  const chatLocked = isAdoptionThread && (
    (isPoster && incomingRequest?.status === 'submitted')
    || (isAdopter && myRequest?.status === 'submitted')
  );
  const chatBg = colors.bg;
  const inputBg = mode === 'dark' ? INPUT_BG_DARK : INPUT_BG_LIGHT;
  const outgoingBg = mode === 'dark' ? OUTGOING_BUBBLE_DARK : OUTGOING_BUBBLE_LIGHT;

  const chatGroup = useMemo(() => {
    const groups = groupAdoptionChatThreads([thread], records, listings, authUser?.id ?? '');
    if (groups[0]) return groups[0];
    return {
      key: thread.id,
      listingId: thread.adoptionPostId ?? null,
      petName: threadMeta?.petName ?? listing?.name ?? 'Adoption',
      petVisual,
      isMyListing: isPoster,
      threads: [thread],
      totalUnread: thread.unread,
    };
  }, [thread, records, listings, threadMeta, listing, petVisual, isPoster]);

  const headerDisplay = useMemo(() => {
    if (!isAdoptionThread) return null;
    return getThreadChatDisplay(thread, records, listings, requests, chatGroup, authUser?.id ?? '');
  }, [isAdoptionThread, thread, records, listings, requests, chatGroup]);

  const sharedPostKeys = useMemo(() => Object.keys(sharedPostMap).join(','), [sharedPostMap]);
  const rescueCaseKeys = useMemo(() => Object.keys(rescueCaseMap).join(','), [rescueCaseMap]);

  useEffect(() => {
    scrollToLatestWithRetries({ animated: false });
  }, [thread.id, scrollToLatestWithRetries]);

  useEffect(() => {
    scrollToLatest({ animated: false });
  }, [chatListItems.length, scrollToLatest]);

  useEffect(() => {
    if (!sharedPostKeys && !rescueCaseKeys) return;
    scrollToLatest({ animated: false });
  }, [sharedPostKeys, rescueCaseKeys, scrollToLatest]);

  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;

  useEffect(() => {
    setActiveChatThreadId(thread.id);
    return () => {
      void markReadRef.current(thread.id);
      setActiveChatThreadId(null);
    };
  }, [thread.id, setActiveChatThreadId]);

  // Mark thread as read when opened or new messages arrive
  useEffect(() => {
    if (chatMessages.length > 0) void markReadRef.current(thread.id);
  }, [thread.id, chatMessages.length]);

  const composerBottomPad = Math.max(
    insets.bottom,
    spacing.md,
    keyboardInset > 0 ? keyboardInset : 0,
  );

  const handleAcceptRequest = async () => {
    if (!incomingRequest || incomingRequest.status !== 'submitted') return;
    const threadId = await approveRequest(incomingRequest.id);
    if (!threadId) return;
    await reloadThreads();
    setToast({ msg: 'Request accepted — you can chat now', icon: 'comment', tone: 'success' });
  };

  // Load post data for shared_post messages not already in the feed
  useEffect(() => {
    const sharedIds = chatMessages
      .filter(m => m.kind === 'shared_post' && m.postId)
      .map(m => m.postId!)
      .filter(id => !feedPosts.find(p => p.id === id) && !sharedPostMap[id]);
    if (sharedIds.length === 0) return;
    selectFeedRows(select =>
      supabase.from('posts').select(select).in('id', sharedIds),
    ).then(async ({ data }) => {
      if (!data) return;
      const rows = data as unknown as DbPostRow[];
      const posts = await postsFromDbRows(rows, authUser?.id ?? '');
      const loaded: Record<string, Post> = {};
      for (const post of posts) {
        loaded[post.id] = post;
      }
      setSharedPostMap(prev => ({ ...prev, ...loaded }));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages.length, authUser?.id]);

  useEffect(() => {
    const caseIds = chatMessages
      .filter(m => m.kind === 'text' && isRescueCaseShareText(m.text))
      .map(m => parseRescueCaseShareText(m.text)!.caseId)
      .filter(id => {
        if (rescueCaseMap[id]) return false;
        if (rescueFeed?.cases.find(c => c.id === id)) return false;
        if (getRescueCaseById(id)) return false;
        return true;
      });
    const uniqueIds = [...new Set(caseIds)];
    if (uniqueIds.length === 0) return;
    void Promise.all(uniqueIds.map(id => fetchRescueCaseById(id))).then(rows => {
      const loaded: Record<string, RescueCase> = {};
      for (const row of rows) {
        if (row) loaded[row.id] = row;
      }
      if (Object.keys(loaded).length > 0) {
        setRescueCaseMap(prev => ({ ...prev, ...loaded }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages.length]);

  const resolveRescueCase = useCallback((caseId: string): RescueCase | null => {
    return rescueCaseMap[caseId]
      ?? rescueFeed?.cases.find(c => c.id === caseId)
      ?? getRescueCaseById(caseId);
  }, [rescueCaseMap, rescueFeed?.cases]);

  const handleViewRescueCaseFromShare = useCallback((caseId: string) => {
    openRescueCaseDetail(getRootNavigation(navigation), caseId);
  }, [navigation]);

  useEffect(() => {
    setMuted(thread.muted ?? false);
  }, [thread.muted]);

  const handleSend = useCallback(async (draft: string) => {
    if (threadConnecting) return;
    const caption = draft.trim() || undefined;
    if (pendingAttachment?.kind === 'photo') {
      setSendingMedia(true);
      try {
        const ok = await sendPhoto(thread.id, pendingAttachment.asset, caption);
        if (ok) {
          composerRef.current?.clear();
          setPendingAttachment(null);
          scrollToLatest({ animated: true });
        } else {
          setToast({ msg: 'Could not send photo', icon: 'close', tone: 'neutral' });
        }
      } finally {
        setSendingMedia(false);
      }
      return;
    }
    if (pendingAttachment?.kind === 'file') {
      setSendingMedia(true);
      try {
        const ok = await sendFile(thread.id, pendingAttachment.file, caption);
        if (ok) {
          composerRef.current?.clear();
          setPendingAttachment(null);
          scrollToLatest({ animated: true });
        } else {
          setToast({ msg: 'Could not attach file', icon: 'close', tone: 'neutral' });
        }
      } finally {
        setSendingMedia(false);
      }
      return;
    }
    if (!caption || chatLocked) return;
    sendMessage(thread.id, caption, 'you');
    composerRef.current?.clear();
    scrollToLatest({ animated: true });
  }, [
    threadConnecting,
    pendingAttachment,
    chatLocked,
    sendPhoto,
    thread.id,
    sendFile,
    sendMessage,
    scrollToLatest,
  ]);

  const handleAttachAction = useCallback(async (action: CircleAttachAction) => {
    if (sendingMedia || chatLocked) return;
    switch (action) {
      case 'photo_library': {
        const asset = await pickImage();
        if (asset) setPendingAttachment({ kind: 'photo', asset });
        break;
      }
      case 'camera': {
        const asset = await takePhoto();
        if (asset) setPendingAttachment({ kind: 'photo', asset });
        break;
      }
      case 'file': {
        const file = await pickFile();
        if (file) setPendingAttachment({ kind: 'file', file });
        break;
      }
    }
  }, [chatLocked, pickFile, pickImage, sendingMedia, takePhoto]);

  const handleMarkAdopted = () => {
    if (!thread.adoptionPostId) return;
    const petName = listing?.name ?? threadMeta?.petName ?? 'Pet';
    const species = listing?.species ?? 'cat';
    const icon = listing?.icon ?? 'paw';
    const tint = listing?.tint ?? colors.primary;
    const incomingRequest = getRequestForListing(thread.adoptionPostId, thread.participantId);
    proposeAdoption({
      threadId: thread.id,
      adoptionPostId: thread.adoptionPostId,
      posterId: authUser?.id ?? '',
      adopterId: thread.participantId,
      petName,
      species,
      icon,
      tint,
      requestId: incomingRequest?.id,
    });
    markAdopted(thread.adoptionPostId);
  };

  const handleRelist = () => {
    if (!record) return;
    const ok = performPosterRelist(
      record,
      relistAdoptionPlacement,
      relistListing,
      clearRequestOnRelist,
      dismissAdoptionThread,
      thread.id,
    );
    if (!ok) return;
    setToast({
      msg: `${record.petName} is live for adoption again`,
      icon: 'adoption',
      tone: 'success',
    });
    onClose();
  };

  const openPeerOptions = () => {
    if (!peer) return;
    setOptionsOpen(true);
  };

  const handleViewProfile = () => {
    if (!peer) return;
    setOptionsOpen(false);
    onClose();
    navigation.navigate('Circles', {
      screen: 'UserProfile',
      params: { userId: peer.id, returnTo: 'Hub' },
    });
  };

  const handleViewSharedPost = useCallback((post: Post) => {
    openFeedSharedPost({
      post,
      ensureFeedPost,
      tabNavigation: navigation,
      selectSection,
      onBeforeNavigate: onClose,
    });
  }, [navigation, onClose, ensureFeedPost, selectSection]);

  const handleOpenCareTimeline = () => {
    if (!record || !adoptionChatHasCareTimeline(record)) return;
    onClose();
    navigation.navigate('Profile', {
      screen: 'AdoptedDetail',
      params: { recordId: record.id },
    });
  };

  const headerAccent = headerDisplay?.sublineAccent
    && !isSettledPlacementAccent(headerDisplay.sublineAccent)
    ? headerDisplay.sublineAccent
    : undefined;
  const adoptionActionAccent = !!(
    headerAccent && sublineAccentOpensAdoptionDetail(headerAccent)
  );
  const posterCareLink = isPoster
    && adoptionChatHasCareTimeline(record)
    && !adoptionActionAccent;
  const fosterName = record?.posterId
    ? (getCachedProfile(record.posterId)?.name ?? peer?.name)
    : peer?.name;
  const headerSublineLead = headerDisplay
    ? (record?.adopterId === myId && adoptionChatHasCareTimeline(record)
      ? (fosterName ? `with ${fosterName}` : 'with …')
      : headerDisplay.sublineLead)
    : undefined;

  const handleBlockPeer = () => {
    if (!peer) return;
    blockUser(peer.id);
    setOptionsOpen(false);
    setToast({ msg: `${peer.name} blocked`, icon: 'block', tone: 'neutral' });
  };

  const handleReportPeer = () => {
    if (peer) reportUser(peer.id, 'User report from chat');
    setToast({ msg: 'Report submitted — we\'ll review this', icon: 'flag', tone: 'neutral' });
  };

  const handleMuteChange = (next: boolean) => {
    setMuted(next);
    setToast({
      msg: next ? 'Conversation muted' : 'Conversation unmuted',
      icon: 'bell',
      tone: 'neutral',
    });
    toggleMute(thread.id).then(newMuted => setMuted(newMuted));
  };

  const renderSharedPostCluster = (item: ChatMessage) => {
    const isMe = item.senderId === myId;
    const sender = isMe ? null : peer;
    const sharedPost = item.postId
      ? (feedPosts.find(p => p.id === item.postId) ?? sharedPostMap[item.postId])
      : undefined;
    const isAlertCard = isAlertSharedPost(sharedPost);
    const cardTint = resolveSharedPostTint(sharedPost, isMe, peer?.tint, colors);
    const time = item.time;

    return (
      <View style={isMe ? styles.outgoingWrap : styles.incomingRow}>
        {!isMe && sender && (
          <Pressable onPress={openPeerOptions} style={({ pressed }) => [styles.bubbleAvatarBtn, pressed && styles.headerPressed]} hitSlop={4}>
            <Avatar user={sender} size={BUBBLE_AVATAR_SIZE} />
          </Pressable>
        )}
        <View style={[styles.messageCluster, isMe && styles.messageClusterOutgoing, { maxWidth: bubbleMaxWidth }]}>
          {sharedPost ? (
            <CircleSharedPostCard
              post={sharedPost}
              circleTint={cardTint}
              onPress={() => handleViewSharedPost(sharedPost)}
              hideCaption={isAlertCard}
              variant={isAlertCard ? 'compact' : 'chat'}
              fullWidth={isAlertCard}
            />
          ) : (
            <View style={[styles.incomingBubble, { backgroundColor: inputBg, paddingHorizontal: 14, paddingVertical: 10 }]}>
              <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
                {myId
                  ? sharedPostLoadingLabel(myId, item.senderId ?? myId, peer?.name)
                  : 'Shared a post'}
              </Text>
            </View>
          )}
          <View style={styles.bubbleMeta}>
            <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{time}</Text>
            {isMe ? <Icon name="check" size={10} color={colors.primary} /> : null}
          </View>
        </View>
      </View>
    );
  };

  const renderRescueCaseShareCluster = (item: ChatMessage) => {
    const parsed = parseRescueCaseShareText(item.text);
    if (!parsed) return null;

    const isMe = item.senderId === myId;
    const sender = isMe ? null : peer;
    const rescueCase = resolveRescueCase(parsed.caseId);
    const cardTint = rescueCase?.tint ?? peer?.tint ?? colors.primary;
    const time = item.time;

    return (
      <View style={isMe ? styles.outgoingWrap : styles.incomingRow}>
        {!isMe && sender && (
          <Pressable onPress={openPeerOptions} style={({ pressed }) => [styles.bubbleAvatarBtn, pressed && styles.headerPressed]} hitSlop={4}>
            <Avatar user={sender} size={BUBBLE_AVATAR_SIZE} />
          </Pressable>
        )}
        <View style={[styles.messageCluster, isMe && styles.messageClusterOutgoing, { width: bubbleMaxWidth, maxWidth: bubbleMaxWidth }]}>
          <RescueCaseShareCard
            caseId={parsed.caseId}
            item={rescueCase}
            preview={parsed.preview}
            tint={cardTint}
            onPress={() => handleViewRescueCaseFromShare(parsed.caseId)}
            maxWidth={bubbleMaxWidth}
          />
          <View style={styles.bubbleMeta}>
            <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{time}</Text>
            {isMe ? <Icon name="check" size={10} color={colors.primary} /> : null}
          </View>
        </View>
      </View>
    );
  };

  const renderListItem = ({ item }: { item: ChatListItem }) => {
    const message = item.message;
    if (message.kind === 'system') {
      return (
        <View style={styles.systemWrap}>
          <Text style={[styles.systemText, { color: colors.textTertiary }]}>
            {rescueHelpIntroDisplayText(message.text)}
          </Text>
        </View>
      );
    }

    const isMe = message.senderId === myId;
    const sender = isMe ? null : peer;

    if (message.kind === 'shared_post') {
      return renderSharedPostCluster(message);
    }

    if (message.kind === 'text' && isRescueCaseShareText(message.text)) {
      return renderRescueCaseShareCluster(message);
    }

    if (message.kind === 'media' && message.mediaKind) {
      const bubbleBg = isMe ? outgoingBg : inputBg;
      if (!message.mediaUrl) {
        return (
          <View style={isMe ? styles.outgoingWrap : styles.incomingRow}>
            {!isMe && sender && <Avatar user={sender} size={BUBBLE_AVATAR_SIZE} />}
            <View style={[styles.incomingBubble, { backgroundColor: bubbleBg, paddingHorizontal: 14, paddingVertical: 10 }]}>
              <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
                {isMe ? 'Sending…' : `${peer?.name?.split(/\s+/)[0] ?? 'Someone'} sent an attachment`}
              </Text>
            </View>
          </View>
        );
      }
      return (
        <View style={isMe ? styles.outgoingWrap : styles.incomingRow}>
          {!isMe && sender && (
            <Pressable
              onPress={openPeerOptions}
              style={({ pressed }) => [styles.bubbleAvatarBtn, pressed && styles.headerPressed]}
              hitSlop={4}
            >
              <Avatar user={sender} size={BUBBLE_AVATAR_SIZE} />
            </Pressable>
          )}
          <View style={[styles.messageCluster, isMe && styles.messageClusterOutgoing, { maxWidth: bubbleMaxWidth }]}>
            <CircleMediaBubble
              mediaKind={message.mediaKind === 'audio' ? 'file' : message.mediaKind}
              name={message.name ?? 'Attachment'}
              size={message.size ?? ''}
              mediaUrl={message.mediaUrl}
              thumbUrl={message.thumbUrl}
              mime={message.mime}
              caption={message.caption}
              bubbleBg={bubbleBg}
              maxWidth={bubbleMaxWidth}
            />
            <View style={styles.bubbleMeta}>
              <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{message.time}</Text>
              {isMe ? <Icon name="check" size={10} color={colors.primary} /> : null}
            </View>
          </View>
        </View>
      );
    }

    if (isMe) {
      return (
        <View style={styles.outgoingWrap}>
          <View style={styles.outgoingCluster}>
            <View style={styles.bubbleMeta}>
              <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{message.time}</Text>
              <Icon name="check" size={10} color={colors.primary} />
            </View>
            <View
              style={[
                styles.outgoingBubble,
                { backgroundColor: outgoingBg, maxWidth: bubbleMaxWidth },
                shadows.sm,
              ]}
            >
              <MentionText style={[styles.bubbleText, { color: colors.text }]} returnTo="Messages">
                {message.text}
              </MentionText>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.incomingRow}>
        {sender && (
          <Pressable
            onPress={openPeerOptions}
            style={({ pressed }) => [styles.bubbleAvatarBtn, pressed && styles.headerPressed]}
            hitSlop={4}
          >
            <Avatar user={sender} size={BUBBLE_AVATAR_SIZE} />
          </Pressable>
        )}
        <View style={styles.incomingCol}>
          <View style={styles.incomingCluster}>
            <View
              style={[
                styles.incomingBubble,
                { backgroundColor: inputBg, maxWidth: bubbleMaxWidth },
                shadows.sm,
              ]}
            >
              <MentionText style={[styles.bubbleText, { color: colors.text }]} returnTo="Messages">
                {message.text}
              </MentionText>
            </View>
            <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{message.time}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: chatBg }]} edges={['bottom']}>
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, spacing.sm) + APP_HEADER_PADDING_TOP },
        ]}
      >
        <IconButton name="chevronLeft" size={40} tone="ghost" color={colors.text} onPress={onClose} />
        <View style={styles.headerCenter}>
          <Pressable
            onPress={openPeerOptions}
            disabled={!peer}
            style={({ pressed }) => [pressed && styles.headerPressed]}
          >
            <View
              style={[
                styles.avatarWrap,
                {
                  width: headerDisplay?.usePetAvatar && chatGroup.petVisual
                    ? PET_AVATAR_FRAME.width
                    : HEADER_AVATAR_SIZE,
                  minHeight: headerDisplay?.usePetAvatar && chatGroup.petVisual
                    ? PET_AVATAR_FRAME.height
                    : HEADER_AVATAR_SIZE,
                },
              ]}
            >
              {headerDisplay?.usePetAvatar && chatGroup.petVisual ? (
                <CompanionAvatar
                  pet={{
                    icon: chatGroup.petVisual.icon,
                    tint: chatGroup.petVisual.tint,
                    name: chatGroup.petVisual.petName,
                  }}
                  size={HEADER_AVATAR_SIZE}
                />
              ) : peer ? (
                <Avatar user={peer} size={HEADER_AVATAR_SIZE} showOnlineIndicator isOnline={peerIsOnline} />
              ) : null}
            </View>
          </Pressable>
          <View style={styles.headerMeta}>
            <Pressable
              onPress={openPeerOptions}
              disabled={!peer}
              style={({ pressed }) => [pressed && styles.headerPressed]}
            >
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {headerDisplay?.title ?? peer?.name ?? 'Chat'}
              </Text>
            </Pressable>
            {headerDisplay ? (
              <View style={styles.headerSubRow}>
                {headerSublineLead ? (
                  <Text
                    style={[styles.headerSub, { color: colors.textSecondary, fontWeight: '600' }]}
                    numberOfLines={1}
                  >
                    {headerSublineLead}
                  </Text>
                ) : posterCareLink ? (
                  <Text
                    style={[styles.headerSub, { color: colors.textSecondary, fontWeight: '600' }]}
                    numberOfLines={1}
                  >
                    {chatGroup.petName}
                  </Text>
                ) : null}
                {posterCareLink ? (
                  <View style={styles.headerSubAccentRow}>
                    <Text style={[styles.headerSub, { color: colors.textTertiary }]}> · </Text>
                    <Pressable
                      onPress={handleOpenCareTimeline}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.headerSubLink,
                        pressed && styles.headerPressed,
                      ]}
                      accessibilityRole="link"
                      accessibilityLabel={`Check updates for ${chatGroup.petName}`}
                    >
                      <Text
                        style={[
                          styles.headerSub,
                          { color: colors.primary, fontWeight: '700' },
                        ]}
                      >
                        Check Updates
                      </Text>
                      <Icon name="chevronRight" size={12} color={colors.primary} />
                    </Pressable>
                  </View>
                ) : null}
                {headerAccent ? (
                  <View style={styles.headerSubAccentRow}>
                    <Text style={[styles.headerSub, { color: colors.textTertiary }]}> · </Text>
                    {adoptionActionAccent ? (
                      <Pressable
                        onPress={handleOpenCareTimeline}
                        hitSlop={6}
                        accessibilityRole="link"
                        accessibilityLabel={`${headerAccent} — open care timeline`}
                      >
                        <Text
                          style={[
                            styles.headerSub,
                            {
                              color: chatSublineAccentColor(headerDisplay.sublineTone, colors),
                              fontWeight: '700',
                            },
                          ]}
                        >
                          {headerAccent}
                        </Text>
                      </Pressable>
                    ) : (
                      <Text
                        style={[
                          styles.headerSub,
                          {
                            color: chatSublineAccentColor(headerDisplay.sublineTone, colors),
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {headerAccent}
                      </Text>
                    )}
                  </View>
                ) : null}
              </View>
            ) : peer ? (
              <Pressable
                onPress={openPeerOptions}
                style={({ pressed }) => [pressed && styles.headerPressed]}
              >
                <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  @{peer.handle}
                  {peerIsOnline ? (
                    <>
                      <Text style={{ color: colors.textTertiary }}> · </Text>
                      <Text style={{ color: '#22C55E', fontWeight: '600' }}>Online</Text>
                    </>
                  ) : null}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <IconButton
          name="more"
          size={36}
          tone="ghost"
          color={colors.textSecondary}
          onPress={openPeerOptions}
        />
      </View>

      <View style={[styles.body, { backgroundColor: chatBg }]}>
        {rescueContext ? (
          <RescueHelpChatBanner
            context={rescueContext}
            backgroundColor={chatBg}
            onViewCase={handleViewRescueCase}
          />
        ) : null}
        <ChatAdoptionPanel
          thread={thread}
          records={records}
          listings={listings}
          requests={requests}
          posterHasMessaged={posterHasReplied}
          onMarkAdopted={handleMarkAdopted}
          onPostUpdate={() => setUpdateSheetOpen(true)}
          onRelist={handleRelist}
          onAcceptRequest={handleAcceptRequest}
          backgroundColor={chatBg}
        />

        <KeyboardAvoidingView
          style={styles.chatColumn}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <FlatList
            ref={listRef}
            data={chatListItems}
            keyExtractor={m => m.id}
            renderItem={renderListItem}
            style={styles.messageListView}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollToLatest({ animated: false })}
            onLayout={() => scrollToLatest({ animated: false })}
            initialNumToRender={mobileWeb ? Math.min(chatListItems.length, 40) : undefined}
            ListHeaderComponent={
              chatMessages.length > 0
                ? <DatePill label="Today" bg={colors.border} text={colors.textSecondary} />
                : null
            }
            ListEmptyComponent={
              <Text style={[styles.emptyChat, { color: colors.textTertiary }]}>
                {chatLocked && isAdopter
                  ? 'Waiting for the poster to accept your request'
                  : chatLocked && isPoster
                    ? 'Accept the request to start chatting'
                    : isPoster && isAdoptionThread
                      ? 'Send the first message to start the conversation'
                      : isAdoptionThread
                        ? 'Waiting for the poster to message you'
                        : 'Say hello: start the conversation'}
              </Text>
            }
          />

          {peerBlocked ? (
            <View style={[styles.composer, { backgroundColor: chatBg, paddingBottom: composerBottomPad }]}>
              <Text style={[styles.blockedNotice, { color: colors.textTertiary }]}>
                You've blocked this user — messaging is disabled.
              </Text>
            </View>
          ) : chatLocked ? (
            <View style={[styles.composer, { backgroundColor: chatBg, paddingBottom: composerBottomPad }]}>
              <Text style={[styles.blockedNotice, { color: colors.textTertiary }]}>
                {isPoster
                  ? 'Accept the adoption request before messaging.'
                  : 'The poster needs to accept your request before you can chat.'}
              </Text>
            </View>
          ) : (
            <ChatThreadComposer
              ref={composerRef}
              threadId={thread.id}
              disabled={peerBlocked || chatLocked}
              threadConnecting={threadConnecting}
              placeholder={
                isPoster && !posterHasReplied
                  ? 'Write your first message…'
                  : 'Type a message…'
              }
              bottomPad={composerBottomPad}
              backgroundColor={chatBg}
              sendingMedia={sendingMedia}
              pendingAttachment={pendingAttachment}
              onClearAttachment={() => setPendingAttachment(null)}
              onAttach={() => setAttachOpen(true)}
              onSend={handleSend}
            />
          )}
        </KeyboardAvoidingView>
      </View>

      {record && activePrompt && (
        <PostHomeUpdateSheet
          visible={updateSheetOpen}
          onClose={() => setUpdateSheetOpen(false)}
          record={record}
          milestoneLabel={activePrompt.milestone.label}
          promptText={activePrompt.milestone.prompt}
          onSubmit={payload => submitAdopterUpdate(record.id, payload)}
        />
      )}

      {peer && (
        <ChatPeerOptionsSheet
          visible={optionsOpen}
          peer={peer}
          onClose={() => setOptionsOpen(false)}
          onViewProfile={handleViewProfile}
          onBlock={handleBlockPeer}
          onReport={handleReportPeer}
          muted={muted}
          onMuteChange={handleMuteChange}
        />
      )}

      <CircleAttachSheet
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onSelect={handleAttachAction}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: APP_HEADER_PADDING_H,
    paddingBottom: 10,
    gap: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  headerPressed: { opacity: 0.65 },
  avatarWrap: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  headerMeta: { flex: 1, gap: 2, minWidth: 0 },
  headerTitle: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, lineHeight: 20 },
  headerSub: { ...typography.caption, fontSize: 13, lineHeight: 18 },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', minWidth: 0, flexShrink: 1 },
  headerSubLink: { flexDirection: 'row', alignItems: 'center', gap: 1, flexShrink: 1, minWidth: 0 },
  headerSubAccentRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  body: { flex: 1, overflow: 'hidden' },
  chatColumn: { flex: 1, minHeight: 0, overflow: 'hidden' },
  messageListView: { flex: 1, minHeight: 0 },
  messageList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 16,
  },
  dateWrap: { alignItems: 'center', marginBottom: 4 },
  datePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  dateText: { fontSize: 12, fontWeight: '600' },
  systemWrap: { alignItems: 'center', marginVertical: 2 },
  systemText: { fontSize: 12, fontStyle: 'italic' },
  incomingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleAvatarBtn: {
    flexShrink: 0,
  },
  incomingCol: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  incomingCluster: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    alignSelf: 'flex-start',
    flexShrink: 1,
  },
  incomingBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    alignSelf: 'flex-start',
    flexGrow: 0,
    flexShrink: 1,
  },
  outgoingWrap: {
    alignItems: 'flex-end',
  },
  outgoingCluster: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    alignSelf: 'flex-end',
    flexShrink: 1,
  },
  outgoingBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    alignSelf: 'flex-end',
    flexGrow: 0,
    flexShrink: 1,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
    flexShrink: 1,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-end',
    paddingRight: 2,
    flexShrink: 0,
  },
  messageCluster: {
    gap: 2,
    minWidth: 0,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  messageClusterOutgoing: {
    alignSelf: 'flex-end',
  },
  bubbleTime: {
    fontSize: 10,
    lineHeight: 12,
    opacity: 0.72,
    paddingBottom: 3,
    flexShrink: 0,
  },
  emptyChat: {
    ...typography.small,
    textAlign: 'center',
    paddingVertical: 32,
    fontStyle: 'italic',
  },
  composer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  blockedNotice: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 14,
    fontStyle: 'italic',
  },
});
