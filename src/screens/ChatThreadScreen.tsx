import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, FlatList, TextInput, StyleSheet, KeyboardAvoidingView, Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';
import { radius, shadows, typography } from '../theme/tokens';
import { Avatar, CompanionAvatar } from '../components/ui/Avatar';
import { getPetAvatarFrameSize } from '../components/ui/PawPadShape';
import { IconButton } from '../components/ui/Button';
import { Icon } from '../components/icons/Icon';
import { PostHomeUpdateSheet } from '../components/adoption/AdoptionUpdateUI';
import { ChatAdoptionPanel } from '../components/adoption/ChatAdoptionPanel';
import { ChatPeerOptionsSheet } from '../components/messages/ChatPeerOptionsSheet';
import { Toast, ToastData } from '../components/ui/Toast';
import type { CirclesStackParamList } from '../navigation/CirclesNavigator';
import { useAuth } from '../context/AuthContext';
import { chatThreadParticipantUser } from '../utils/chatParticipant';
import { useAdoption, type ChatMessage, type ChatThread } from '../context/AdoptionContext';
import { useFeedPosts } from '../context/FeedPostContext';
import { FEED_SELECT, rowToPost } from '../hooks/useFeedQuery';
import { supabase } from '../lib/supabase';
import type { Post } from '../data/mockData';
import { CircleSharedPostCard } from './pawCircles/CircleSharedPostCard';
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
    proposeAdoption,
    relistAdoptionPlacement,
    getRecordByThread,
    submitAdopterUpdate,
    records,
    markRead,
    toggleMute,
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
  const { posts: feedPosts } = useFeedPosts();
  const [sharedPostMap, setSharedPostMap] = useState<Record<string, Post>>({});
  const [draft, setDraft] = useState('');
  const [updateSheetOpen, setUpdateSheetOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [muted, setMuted] = useState(thread.muted ?? false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  const scrollToLatest = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const allMessages = getThreadMessages(thread.id);
  const chatMessages = useMemo(
    () => allMessages.filter(m => m.kind === 'text' || m.kind === 'system' || m.kind === 'shared_post'),
    [allMessages],
  );
  const record = getRecordByThread(thread.id) ?? records.find(r => r.chatThreadId === thread.id);
  const peer = thread.participantId
    ? {
      ...chatThreadParticipantUser(thread),
      handle: thread.participantHandle ?? thread.participantId.slice(0, 8),
      loc: '',
      verified: false,
    }
    : null;
  const listingId = record?.adoptionPostId ?? thread.adoptionPostId;
  const listing = listingId ? listings.find(l => l.id === listingId) : undefined;
  const myId = authUser?.id;
  const isPoster = record
    ? record.posterId === myId
    : (listing?.userId === myId);
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

  useEffect(() => {
    scrollToLatest(false);
  }, [chatMessages.length, scrollToLatest]);

  // Mark thread as read when opened or new messages arrive
  useEffect(() => {
    if (chatMessages.length > 0) markRead(thread.id);
  }, [thread.id, chatMessages.length, markRead]);

  useEffect(() => {
    if (!isPoster || posterHasReplied) return;
    const t = setTimeout(() => inputRef.current?.focus(), 320);
    return () => clearTimeout(t);
  }, [isPoster, posterHasReplied, thread.id]);

  // Load post data for shared_post messages not already in the feed
  useEffect(() => {
    const sharedIds = chatMessages
      .filter(m => m.kind === 'shared_post' && m.postId)
      .map(m => m.postId!)
      .filter(id => !feedPosts.find(p => p.id === id) && !sharedPostMap[id]);
    if (sharedIds.length === 0) return;
    supabase.from('posts').select(FEED_SELECT).in('id', sharedIds).then(({ data }) => {
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

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage(thread.id, draft.trim(), 'you');
    if (isPoster && listingId) {
      const incoming = getRequestForListing(listingId, thread.participantId);
      if (incoming?.status === 'submitted') {
        approveRequest(incoming.id);
      }
    }
    setDraft('');
    scrollToLatest(true);
  };

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

  const handleOpenAdoptionDetail = () => {
    if (!record || !headerDisplay?.sublineAccent) return;
    if (!sublineAccentOpensAdoptionDetail(headerDisplay.sublineAccent)) return;
    onClose();
    navigation.navigate('Profile', {
      screen: 'AdoptedDetail',
      params: { recordId: record.id },
    });
  };

  const adoptionDetailAccent = !!(
    record
    && headerDisplay?.sublineAccent
    && sublineAccentOpensAdoptionDetail(headerDisplay.sublineAccent)
  );

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

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.kind === 'system') {
      return (
        <View style={styles.systemWrap}>
          <Text style={[styles.systemText, { color: colors.textTertiary }]}>
            {item.text}
          </Text>
        </View>
      );
    }

    const isMe = item.senderId === myId;
    const sender = isMe ? null : peer;

    if (item.kind === 'shared_post') {
      const sharedPost = item.postId
        ? (feedPosts.find(p => p.id === item.postId) ?? sharedPostMap[item.postId])
        : undefined;
      const cardTint = peer?.tint ?? colors.primary;
      return (
        <View style={isMe ? styles.outgoingWrap : styles.incomingRow}>
          {!isMe && sender && (
            <Pressable onPress={openPeerOptions} style={({ pressed }) => [styles.bubbleAvatarBtn, pressed && styles.headerPressed]} hitSlop={4}>
              <Avatar user={sender} size={BUBBLE_AVATAR_SIZE} />
            </Pressable>
          )}
          <View style={{ flex: 1, alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
            {sharedPost ? (
              <CircleSharedPostCard post={sharedPost} circleTint={cardTint} />
            ) : (
              <View style={[styles.incomingBubble, { backgroundColor: inputBg, paddingHorizontal: 14, paddingVertical: 10 }]}>
                <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Shared a post</Text>
              </View>
            )}
            <Text style={[styles.bubbleTime, { color: colors.textTertiary, alignSelf: isMe ? 'flex-start' : 'flex-end' }]}>{item.time}</Text>
          </View>
        </View>
      );
    }

    if (isMe) {
      return (
        <View style={styles.outgoingWrap}>
          <View style={styles.outgoingCluster}>
            <View style={styles.bubbleMeta}>
              <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{item.time}</Text>
              <Icon name="check" size={10} color={colors.primary} />
            </View>
            <View
              style={[
                styles.outgoingBubble,
                { backgroundColor: outgoingBg, maxWidth: bubbleMaxWidth },
                shadows.sm,
              ]}
            >
              <Text style={[styles.bubbleText, { color: colors.text }]}>{item.text}</Text>
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
              <Text style={[styles.bubbleText, { color: colors.text }]}>{item.text}</Text>
            </View>
            <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{item.time}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]} edges={['top']}>
      <View style={styles.header}>
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
                  {headerDisplay.sublineLead}
                </Text>
                {headerDisplay.sublineAccent ? (
                  <View style={styles.headerSubAccentRow}>
                    <Text style={[styles.headerSub, { color: colors.textTertiary }]}> · </Text>
                    {adoptionDetailAccent ? (
                      <Pressable
                        onPress={handleOpenAdoptionDetail}
                        hitSlop={6}
                        accessibilityRole="link"
                        accessibilityLabel={`View ${record?.petName ?? 'pet'} adoption details`}
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
                          {headerDisplay.sublineAccent}
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
                        {headerDisplay.sublineAccent}
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

      <KeyboardAvoidingView
        style={[styles.body, { backgroundColor: chatBg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ChatAdoptionPanel
          thread={thread}
          records={records}
          listings={listings}
          requests={requests}
          posterHasMessaged={posterHasReplied}
          onMarkAdopted={handleMarkAdopted}
          onPostUpdate={() => setUpdateSheetOpen(true)}
          onRelist={handleRelist}
          backgroundColor={chatBg}
        />

        <FlatList
          ref={listRef}
          data={chatMessages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
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
              {isPoster && isAdoptionThread
                ? 'Send the first message to start the conversation'
                : isAdoptionThread
                  ? 'Waiting for the foster to message you'
                  : 'Say hello — start the conversation'}
            </Text>
          }
        />

        {peerBlocked ? (
          <View style={[styles.composer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.blockedNotice, { color: colors.textTertiary }]}>
              You've blocked this user — messaging is disabled.
            </Text>
          </View>
        ) : (
          <View style={[styles.composer, { backgroundColor: colors.surface }]}>
            <View style={styles.composerRow}>
              <View style={styles.attachGroup}>
                <Pressable
                  style={({ pressed }) => [styles.attachBtn, pressed && styles.attachBtnPressed]}
                  hitSlop={6}
                >
                  <Icon name="image" size={18} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.attachBtn, pressed && styles.attachBtnPressed]}
                  hitSlop={6}
                >
                  <Icon name="camera" size={18} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.attachBtn, pressed && styles.attachBtnPressed]}
                  hitSlop={6}
                >
                  <Icon name="plus" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
              <View style={[styles.inputWrap, { backgroundColor: inputBg }]}>
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { color: colors.text }]}
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
                style={[
                  styles.sendBtn,
                  { backgroundColor: draft.trim() ? colors.primary : colors.border },
                ]}
                onPress={handleSend}
                disabled={!draft.trim()}
              >
                <Icon
                  name="send"
                  size={15}
                  color={draft.trim() ? colors.onPrimary : colors.textTertiary}
                />
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

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

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 6,
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
  headerSubAccentRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  body: { flex: 1, overflow: 'hidden' },
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
    paddingBottom: 3,
    flexShrink: 0,
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
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadows.sm,
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
    gap: 8,
  },
  attachGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    flexShrink: 0,
  },
  attachBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBtnPressed: { opacity: 0.5 },
  inputWrap: {
    flex: 1,
    minHeight: 30,
    maxHeight: 72,
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: Platform.OS === 'ios' ? 5 : 4,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
    lineHeight: 17,
    padding: 0,
    margin: 0,
    maxHeight: 60,
    ...Platform.select({
      web: { outlineStyle: 'none', minHeight: 17 } as object,
      default: { minHeight: 17 },
    }),
  },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
