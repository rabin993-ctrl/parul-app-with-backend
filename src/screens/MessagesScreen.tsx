import React, { useMemo, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/tokens';
import { AppSubHeader } from '../components/ui/AppSubHeader';
import { Avatar } from '../components/ui/Avatar';
import { Icon } from '../components/icons/Icon';
import { useAdoption, type ChatThread } from '../context/AdoptionContext';
import { useTabBarScrollPadding } from '../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../context/TabBarScrollContext';
import { groupThreads } from '../utils/chatThreadMeta';
import { useAuth } from '../context/AuthContext';
import { chatThreadParticipantUser } from '../utils/chatParticipant';
import { refreshUserPrivacyFlags } from '../lib/userPrivacyFlagCache';
import type { CirclesStackParamList } from '../navigation/CirclesNavigator';
import { navigateToChatThread } from '../navigation/chatThreadRouting';

type Nav = NativeStackNavigationProp<CirclesStackParamList, 'Hub'>;

const ROW_AVATAR_SIZE = 48;

export function MessagesScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { threads, records } = useAdoption();
  const { user } = useAuth();

  const visibleThreads = useMemo(() => {
    const grouped = groupThreads(threads, records, user?.id ?? '');
    return grouped.general;
  }, [threads, records, user?.id]);

  const peerIds = useMemo(
    () => visibleThreads.map(t => t.participantId).filter(Boolean),
    [visibleThreads],
  );

  useFocusEffect(
    useCallback(() => {
      if (peerIds.length === 0) return;
      void refreshUserPrivacyFlags(peerIds);
    }, [peerIds.join(',')]),
  );

  const openThread = useCallback((thread: ChatThread) => {
    navigateToChatThread(navigation, thread);
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <AppSubHeader
        showBack={false}
        title="Messages"
        rightIcon="edit"
        rightAccessibilityLabel="New message"
      />

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
              onPress={() => openThread(thread)}
            />
          ))
        )}
      </ScrollView>
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
        <Avatar user={peerUser} size={ROW_AVATAR_SIZE} showOnlineIndicator />
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
