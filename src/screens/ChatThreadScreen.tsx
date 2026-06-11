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
import { users } from '../data/mockData';
import type { CirclesStackParamList } from '../navigation/CirclesNavigator';
import { useAdoption, type ChatMessage, type ChatThread } from '../context/AdoptionContext';
import { getActivePrompt } from '../utils/adoptionUpdateSchedule';
import {
  getThreadAdoptionMeta,
  getThreadPetVisual,
  type ThreadStatusTone,
} from '../utils/chatThreadMeta';

type TabParamList = {
  Feed: undefined;
  Messages: undefined;
  Circles: { screen?: keyof CirclesStackParamList; params?: CirclesStackParamList[keyof CirclesStackParamList] };
  Vet: undefined;
  Profile: undefined;
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

function statusColor(
  tone: ThreadStatusTone,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (tone) {
    case 'warning': return colors.warning;
    case 'success': return colors.success;
    case 'primary': return colors.primary;
    case 'info': return colors.info;
    default: return colors.textSecondary;
  }
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
    confirmAdoption,
    getRecordByThread,
    submitAdopterUpdate,
    records,
  } = useAdoption();
  const [draft, setDraft] = useState('');
  const [updateSheetOpen, setUpdateSheetOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToLatest = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const allMessages = getThreadMessages(thread.id);
  const chatMessages = useMemo(
    () => allMessages.filter(m => m.kind === 'text' || m.kind === 'system'),
    [allMessages],
  );
  const record = getRecordByThread(thread.id) ?? records.find(r => r.chatThreadId === thread.id);
  const peer = users[thread.participantId as keyof typeof users];
  const isPoster = record ? record.posterId === 'you' : thread.adoptionPostId === 'p-you-adopt';
  const isAdopter = record?.adopterId === 'you';
  const activePrompt = useMemo(
    () => (record && isAdopter ? getActivePrompt(record) : null),
    [record, isAdopter],
  );
  const threadMeta = useMemo(
    () => getThreadAdoptionMeta(thread, records),
    [thread, records],
  );
  const petVisual = useMemo(
    () => getThreadPetVisual(thread, records),
    [thread, records],
  );
  const isAdoptionThread = !!(thread.adoptionPostId || record);

  const chatBg = colors.bg;
  const inputBg = mode === 'dark' ? INPUT_BG_DARK : INPUT_BG_LIGHT;
  const outgoingBg = mode === 'dark' ? OUTGOING_BUBBLE_DARK : OUTGOING_BUBBLE_LIGHT;

  const headerTitle = threadMeta?.petName ?? peer?.name ?? 'Chat';
  const showAdoptionMeta = !!threadMeta;

  useEffect(() => {
    scrollToLatest(false);
  }, [chatMessages.length, scrollToLatest]);

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage(thread.id, draft.trim(), 'you');
    setDraft('');
    scrollToLatest(true);
  };

  const handleMarkAdopted = () => {
    if (!thread.adoptionPostId) return;
    proposeAdoption({
      threadId: thread.id,
      adoptionPostId: thread.adoptionPostId,
      posterId: 'you',
      adopterId: thread.participantId,
      petName: 'Misty',
      species: 'cat',
      icon: 'cat',
      tint: '#D9489A',
    });
  };

  const handleConfirm = () => {
    if (record) confirmAdoption(record.id);
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
      params: { userId: peer.id, returnTo: 'Messages' },
    });
  };

  const handleBlockPeer = () => {
    if (!peer) return;
    setToast({ msg: `${peer.name} blocked`, icon: 'block', tone: 'neutral' });
  };

  const handleReportPeer = () => {
    setToast({ msg: 'Report submitted — we\'ll review this', icon: 'flag', tone: 'neutral' });
  };

  const handleMuteChange = (next: boolean) => {
    setMuted(next);
    setToast({
      msg: next ? 'Conversation muted' : 'Conversation unmuted',
      icon: 'bell',
      tone: 'neutral',
    });
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

    const isMe = item.senderId === 'you';
    const sender = isMe ? users.you : peer;

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
        <Pressable
          style={({ pressed }) => [styles.headerCenter, pressed && styles.headerPressed]}
          onPress={openPeerOptions}
          disabled={!peer}
        >
          <View
            style={[
              styles.avatarWrap,
              {
                width: petVisual ? PET_AVATAR_FRAME.width : HEADER_AVATAR_SIZE,
                minHeight: petVisual ? PET_AVATAR_FRAME.height : HEADER_AVATAR_SIZE,
              },
            ]}
          >
            {petVisual ? (
              <CompanionAvatar
                pet={{ icon: petVisual.icon, tint: petVisual.tint, name: petVisual.petName }}
                size={HEADER_AVATAR_SIZE}
              />
            ) : peer ? (
              <Avatar user={peer} size={HEADER_AVATAR_SIZE} />
            ) : null}
          </View>
          <View style={styles.headerMeta}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {headerTitle}
            </Text>
            {showAdoptionMeta && peer ? (
              <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
                {peer.name}
                <Text style={{ color: colors.textTertiary }}> · </Text>
                <Text style={{ color: colors.primary }}>@{peer.handle}</Text>
                <Text style={{ color: colors.textTertiary }}> · {threadMeta.roleLabel}</Text>
              </Text>
            ) : peer ? (
              <Text style={[styles.headerSub, { color: colors.primary }]} numberOfLines={1}>
                @{peer.handle}
              </Text>
            ) : null}
            {showAdoptionMeta && threadMeta && (
              <Text
                style={[styles.headerStatus, { color: statusColor(threadMeta.statusTone, colors) }]}
                numberOfLines={1}
              >
                {threadMeta.statusLabel}
              </Text>
            )}
          </View>
        </Pressable>
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
          record={record}
          isAdopter={!!isAdopter}
          isPoster={isPoster}
          onConfirm={handleConfirm}
          onMarkAdopted={handleMarkAdopted}
          onPostUpdate={() => setUpdateSheetOpen(true)}
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
              {isAdoptionThread
                ? 'Say hello — your adoption thread starts here'
                : 'Say hello — start the conversation'}
            </Text>
          }
        />

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
                style={[styles.input, { color: colors.text }]}
                placeholder="Type a message…"
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
  headerTitle: { fontSize: 16.5, fontWeight: '800', letterSpacing: -0.2, lineHeight: 21 },
  headerSub: { ...typography.caption, fontSize: 12.5, lineHeight: 16 },
  headerStatus: { ...typography.caption, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.1 },
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
