import React, { useMemo, useState } from 'react';
import {
  View, Text, Pressable, FlatList, TextInput, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { radius, typography } from '../theme/tokens';
import { Avatar } from '../components/ui/Avatar';
import { IconButton } from '../components/ui/Button';
import { PostHomeUpdateSheet } from '../components/adoption/AdoptionUpdateUI';
import { ChatAdoptionPanel } from '../components/adoption/ChatAdoptionPanel';
import { users } from '../data/mockData';
import { useAdoption, type ChatMessage, type ChatThread } from '../context/AdoptionContext';
import { getActivePrompt } from '../utils/adoptionUpdateSchedule';
import { getThreadAdoptionMeta } from '../utils/chatThreadMeta';

type Props = {
  thread: ChatThread;
  onClose: () => void;
};

export function ChatThreadScreen({ thread, onClose }: Props) {
  const { colors } = useTheme();
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
  const allMessages = getThreadMessages(thread.id);
  const chatMessages = useMemo(
    () => allMessages.filter(m => m.kind === 'text'),
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
  const isAdoptionThread = !!(thread.adoptionPostId || record);

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage(thread.id, draft.trim(), 'you');
    setDraft('');
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

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === 'you';
    const sender = isMe ? users.you : peer;
    return (
      <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
        {!isMe && sender && <Avatar user={sender} size={28} showBadge={false} />}
        <View style={[
          styles.bubble,
          { backgroundColor: isMe ? colors.primary : colors.surface2 },
        ]}>
          <Text style={{ color: isMe ? colors.onPrimary : colors.text }}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <IconButton name="chevronLeft" size={40} tone="soft" color={colors.textSecondary} onPress={onClose} />
        {peer && <Avatar user={peer} size={40} showBadge={false} />}
        <View style={styles.headerMeta}>
          <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
            {threadMeta?.petName ?? peer?.name}
          </Text>
          {threadMeta ? (
            <>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
                with {peer?.name} · @{peer?.handle}
              </Text>
              <Text style={[styles.headerContext, { color: colors.primary }]} numberOfLines={1}>
                {threadMeta.roleLabel} · {threadMeta.statusLabel}
              </Text>
            </>
          ) : (
            <Text style={[styles.headerSub, { color: colors.primary }]} numberOfLines={1}>
              @{peer?.handle}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ChatAdoptionPanel
        thread={thread}
        record={record}
        isAdopter={!!isAdopter}
        isPoster={isPoster}
        onConfirm={handleConfirm}
        onMarkAdopted={handleMarkAdopted}
        onPostUpdate={() => setUpdateSheetOpen(true)}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        {isAdoptionThread && chatMessages.length > 0 && (
          <View style={[styles.chatDivider, { borderBottomColor: colors.border }]}>
            <Text style={[styles.chatDividerText, { color: colors.textTertiary }]}>CONVERSATION</Text>
          </View>
        )}

        <FlatList
          data={chatMessages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            isAdoptionThread ? (
              <Text style={[styles.emptyChat, { color: colors.textTertiary }]}>
                No messages yet — use the panel above for adoption steps
              </Text>
            ) : null
          }
        />

        <View style={[styles.composer, { borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.surface2 }]}
            placeholder="Message..."
            placeholderTextColor={colors.textTertiary}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            style={[styles.sendBtn, { backgroundColor: draft.trim() ? colors.primary : colors.border }]}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>↑</Text>
          </Pressable>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerMeta: { flex: 1, minWidth: 0, gap: 1 },
  headerName: { ...typography.navTitle, fontSize: 16 },
  headerSub: { ...typography.caption, fontSize: 12 },
  headerContext: { ...typography.caption, fontSize: 11, fontWeight: '600' },
  chatDivider: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chatDividerText: { ...typography.sectionLabel, fontSize: 10, letterSpacing: 0.6 },
  messageList: { padding: 16, gap: 10, flexGrow: 1 },
  emptyChat: { ...typography.small, textAlign: 'center', paddingVertical: 24, fontStyle: 'italic' },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '85%' },
  bubbleRowMe: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, maxWidth: '100%' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...typography.body,
    fontSize: 15,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
