import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/tokens';
import { Avatar } from '../components/ui/Avatar';
import { Icon } from '../components/icons/Icon';
import { IconButton } from '../components/ui/Button';
import { useAdoption, type ChatThread } from '../context/AdoptionContext';
import { ChatThreadScreen } from './ChatThreadScreen';
import { useTabBarScrollPadding } from '../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../context/TabBarScrollContext';
import { groupThreads } from '../utils/chatThreadMeta';
import { useAuth } from '../context/AuthContext';
import { chatThreadParticipantUser } from '../utils/chatParticipant';

const ROW_AVATAR_SIZE = 48;

export function MessagesScreen() {
  const { colors } = useTheme();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { threads, records } = useAdoption();
  const { user } = useAuth();
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);

  const visibleThreads = useMemo(() => {
    const grouped = groupThreads(threads, records, user?.id ?? '');
    return grouped.general;
  }, [threads, records, user?.id]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Messages</Text>
        <IconButton name="edit" size={40} tone="soft" color={colors.textSecondary} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: tabBarPad },
          visibleThreads.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        {visibleThreads.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="send" size={36} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              Start a conversation from someone{"'"}s profile
            </Text>
          </View>
        ) : (
          visibleThreads.map(thread => (
            <GeneralThreadRow
              key={thread.id}
              thread={thread}
              onPress={() => setActiveThread(thread)}
            />
          ))
        )}
      </ScrollView>

      <Modal visible={!!activeThread} animationType="slide" onRequestClose={() => setActiveThread(null)}>
        {activeThread && (
          <ChatThreadScreen thread={activeThread} onClose={() => setActiveThread(null)} />
        )}
      </Modal>
    </SafeAreaView>
  );
}

export function GeneralThreadRow({
  thread,
  onPress,
}: {
  thread: ChatThread;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const peerUser = chatThreadParticipantUser(thread);
  const isUnread = thread.unread > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: isUnread ? colors.primary + '06' : 'transparent' },
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.avatarWrap, { width: ROW_AVATAR_SIZE, minHeight: ROW_AVATAR_SIZE }]}>
        <Avatar user={peerUser} size={ROW_AVATAR_SIZE} />
      </View>

      <View style={styles.meta}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.titleLine,
              { color: colors.text, fontWeight: isUnread ? '800' : '700' },
            ]}
            numberOfLines={1}
          >
            {peerUser.name}
          </Text>
          <View style={styles.trailing}>
            {thread.muted && (
              <Icon name="bell-slash" size={13} color={colors.textTertiary} />
            )}
            <Text style={[styles.time, { color: colors.textTertiary }]}>{thread.time}</Text>
            {isUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadCount}>{thread.unread > 99 ? '99+' : thread.unread}</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={[styles.subline, { color: colors.primary }]} numberOfLines={1}>
          @{thread.participantHandle ?? peerUser.name}
        </Text>

        <Text
          style={[
            styles.preview,
            {
              color: isUnread ? colors.text : colors.textSecondary,
              fontWeight: isUnread ? '500' : '400',
            },
          ]}
          numberOfLines={2}
        >
          {thread.preview}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  list: { paddingTop: 4 },
  listEmpty: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  emptyState: { alignItems: 'center', gap: 8, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, marginTop: 8 },
  emptyText: { ...typography.small, textAlign: 'center', paddingHorizontal: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: { opacity: 0.7 },
  avatarWrap: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  meta: { flex: 1, gap: 3, minWidth: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titleLine: { fontSize: 16.5, letterSpacing: -0.2, flex: 1 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  time: { ...typography.meta, fontSize: 12 },
  unreadBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center',
  },
  unreadCount: { color: '#fff', fontSize: 11, fontWeight: '700', lineHeight: 13 },
  subline: { ...typography.caption, fontSize: 12.5 },
  preview: { ...typography.small, fontSize: 14, lineHeight: 19, marginTop: 1 },
});
