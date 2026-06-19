import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, FlatList, TextInput, StyleSheet, KeyboardAvoidingView, Platform,
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
import { ChatPeerOptionsSheet } from '../components/messages/ChatPeerOptionsSheet';
import { Toast, ToastData } from '../components/ui/Toast';
import { useHideTabBarWhileMounted } from '../context/SheetOverlayContext';
import type { CirclesStackParamList } from '../navigation/CirclesNavigator';
import { useAuth } from '../context/AuthContext';
import { chatThreadParticipantUser } from '../utils/chatParticipant';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAdoption, type ChatMessage, type ChatThread } from '../context/AdoptionContext';
import { useFeedPosts } from '../context/FeedPostContext';
import { useHomeHub } from '../context/HomeHubContext';
import { openFeedSharedPost } from '../navigation/feedPostRouting';
import { selectFeedRows, rowToPost } from '../hooks/useFeedQuery';
import { supabase } from '../lib/supabase';
import type { Post } from '../data/mockData';
import { buildChatListItems, isAlertSharedPost, type ChatListItem } from '../utils/chatMessageListItems';
import { sharedPostLoadingLabel } from '../utils/chatPreviewText';
import { CircleSharedPostCard } from './pawCircles/CircleSharedPostCard';
import { CircleAttachSheet, type CircleAttachAction } from '../components/pawCircles/CircleAttachSheet';
import { CircleMediaBubble } from '../components/pawCircles/CircleMediaBubble';
import { useMediaPicker } from '../hooks/useMediaPicker';
import { useFilePicker } from '../hooks/useFilePicker';
import {
  ChatPendingAttachmentPreview,
  type ChatAttachmentDraft,
} from '../components/chat/ChatComposerAttachment';
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

export function ChatThreadScreen({ thread, onClose }: Props) {
  const { colors, mode } = useTheme();
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
  const [draft, setDraft] = useState('');
  const [updateSheetOpen, setUpdateSheetOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [muted, setMuted] = useState(thread.muted ?? false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [sendingMedia, setSendingMedia] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachmentDraft | null>(null);
  const listRef = useRef<FlatList<ChatListItem>>(null);
  const inputRef = useRef<TextInput>(null);
  const { pickImage, takePhoto } = useMediaPicker();
  const { pickFile } = useFilePicker();

  const scrollToLatest = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

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
  const alertAttachBg = outgoingBg;

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

  useEffect(() => {
    scrollToLatest(false);
  }, [chatListItems.length, scrollToLatest]);

  // Mark thread as read when opened or new messages arrive
  useEffect(() => {
    if (chatMessages.length > 0) markRead(thread.id);
  }, [thread.id, chatMessages.length, markRead]);

  useEffect(() => {
    if (!isPoster || posterHasReplied || chatLocked) return;
    const t = setTimeout(() => inputRef.current?.focus(), 320);
    return () => clearTimeout(t);
  }, [isPoster, posterHasReplied, chatLocked, thread.id]);

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
    ).then(({ data }) => {
      if (!data) return;
      const loaded: Record<string, Post> = {};
      for (const row of data as any[]) {
        const post = rowToPost(row, authUser?.id ?? '');
        loaded[post.id] = post;
      }
      setSharedPostMap(prev => ({ ...prev, ...loaded }));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatMessages.length, authUser?.id]);

  useEffect(() => {
    setMuted(thread.muted ?? false);
  }, [thread.muted]);

  const handleSend = async () => {
    const caption = draft.trim() || undefined;
    if (pendingAttachment?.kind === 'photo') {
      setSendingMedia(true);
      try {
        const ok = await sendPhoto(thread.id, pendingAttachment.asset, caption);
        if (ok) {
          setDraft('');
          setPendingAttachment(null);
          scrollToLatest(true);
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
          setDraft('');
          setPendingAttachment(null);
          scrollToLatest(true);
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
    setDraft('');
    scrollToLatest(true);
  };

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
  const headerSublineLead = headerDisplay
    ? (record?.adopterId === myId && adoptionChatHasCareTimeline(record)
      ? 'You'
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

  const renderSharedPostCluster = (
    item: ChatMessage,
    attachedText?: string,
    timeLabel?: string,
  ) => {
    const isMe = item.senderId === myId;
    const sender = isMe ? null : peer;
    const sharedPost = item.postId
      ? (feedPosts.find(p => p.id === item.postId) ?? sharedPostMap[item.postId])
      : undefined;
    const isAlertCard = isAlertSharedPost(sharedPost);
    const cardTint = resolveSharedPostTint(sharedPost, isMe, peer?.tint, colors);
    const time = timeLabel ?? item.time;

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
              attachedText={attachedText}
              attachedBubbleBg={attachedText ? alertAttachBg : undefined}
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
              {attachedText ? (
                <Text style={[styles.bubbleText, { color: colors.text, marginTop: 8 }]}>{attachedText}</Text>
              ) : null}
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

  const renderListItem = ({ item }: { item: ChatListItem }) => {
    if (item.type === 'shared_with_text') {
      return renderSharedPostCluster(item.shared, item.text.text, item.text.time);
    }

    const message = item.message;
    if (message.kind === 'system') {
      return (
        <View style={styles.systemWrap}>
          <Text style={[styles.systemText, { color: colors.textTertiary }]}>
            {message.text}
          </Text>
        </View>
      );
    }

    const isMe = message.senderId === myId;
    const sender = isMe ? null : peer;

    if (message.kind === 'shared_post') {
      return renderSharedPostCluster(message);
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
              <Text style={[styles.bubbleText, { color: colors.text }]}>{message.text}</Text>
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
              <Text style={[styles.bubbleText, { color: colors.text }]}>{message.text}</Text>
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
                <Avatar user={peer} size={HEADER_AVATAR_SIZE} />
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
                <Text
                  style={[styles.headerSub, { color: colors.textSecondary, fontWeight: '600' }]}
                  numberOfLines={1}
                >
                  {headerSublineLead}
                </Text>
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
                      accessibilityLabel={`Check updates for ${headerDisplay.sublineLead}`}
                    >
                      <Text
                        style={[
                          styles.headerSub,
                          { color: colors.primary, fontWeight: '700' },
                        ]}
                      >
                        Check updates
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
            onContentSizeChange={() => scrollToLatest(false)}
            onLayout={() => scrollToLatest(false)}
            ListHeaderComponent={
              chatMessages.length > 0
                ? <DatePill label="Today" bg={colors.border} text={colors.textSecondary} />
                : null
            }
            ListEmptyComponent={
              <Text style={[styles.emptyChat, { color: colors.textTertiary }]}>
                {chatLocked && isAdopter
                  ? 'Waiting for the foster to accept your request'
                  : chatLocked && isPoster
                    ? 'Accept the request to start chatting'
                    : isPoster && isAdoptionThread
                      ? 'Send the first message to start the conversation'
                      : isAdoptionThread
                        ? 'Waiting for the foster to message you'
                        : 'Say hello — start the conversation'}
              </Text>
            }
          />

          {peerBlocked ? (
            <View style={[styles.composer, { backgroundColor: chatBg, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              <Text style={[styles.blockedNotice, { color: colors.textTertiary }]}>
                You've blocked this user — messaging is disabled.
              </Text>
            </View>
          ) : chatLocked ? (
            <View style={[styles.composer, { backgroundColor: chatBg, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              <Text style={[styles.blockedNotice, { color: colors.textTertiary }]}>
                {isPoster
                  ? 'Accept the adoption request before messaging.'
                  : 'The foster needs to accept your request before you can chat.'}
              </Text>
            </View>
          ) : (
            <View style={[styles.composer, { backgroundColor: chatBg, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              {pendingAttachment ? (
                <ChatPendingAttachmentPreview
                  draft={pendingAttachment}
                  onClear={() => setPendingAttachment(null)}
                />
              ) : null}
              <View style={[styles.composerRow, { backgroundColor: colors.primary + '0A' }]}>
                <Pressable
                  onPress={() => setAttachOpen(true)}
                  disabled={sendingMedia}
                  accessibilityRole="button"
                  accessibilityLabel="Add attachment"
                  style={({ pressed }) => [
                    styles.composerBtn,
                    { backgroundColor: colors.primary + '14', opacity: sendingMedia ? 0.5 : 1 },
                    pressed && styles.composerBtnPressed,
                  ]}
                  hitSlop={6}
                >
                  <Icon name="plus" size={18} color={colors.primary} sw={2} />
                </Pressable>
                <View style={styles.composerInputWrap}>
                  <TextInput
                    ref={inputRef}
                    style={[styles.composerInput, { color: colors.text }]}
                    placeholder={isPoster && !posterHasReplied ? 'Write your first message…' : 'Type a message…'}
                    placeholderTextColor={colors.textTertiary}
                    value={draft}
                    onChangeText={setDraft}
                    multiline
                    maxLength={2000}
                    onSubmitEditing={handleSend}
                  />
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.composerBtn,
                    {
                      backgroundColor: (draft.trim() || pendingAttachment) ? colors.primary : colors.primary + '14',
                      opacity: !(draft.trim() || pendingAttachment) || sendingMedia ? 0.5 : pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => { void handleSend(); }}
                  disabled={!(draft.trim() || pendingAttachment) || sendingMedia}
                >
                  <Icon
                    name="send"
                    size={16}
                    color={(draft.trim() || pendingAttachment) ? colors.onPrimary : colors.textTertiary}
                  />
                </Pressable>
              </View>
            </View>
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
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 56,
  },
  composerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...Platform.select({
      web: { cursor: 'pointer' as const },
      default: {},
    }),
  },
  composerBtnPressed: { opacity: 0.72 },
  composerInputWrap: {
    flex: 1,
    minHeight: 40,
    maxHeight: 96,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  composerInput: {
    fontSize: 16,
    lineHeight: 22,
    padding: 0,
    margin: 0,
    maxHeight: 88,
    ...Platform.select({
      web: { outlineStyle: 'none', minHeight: 22 } as object,
      default: { minHeight: 22 },
    }),
  },
});
