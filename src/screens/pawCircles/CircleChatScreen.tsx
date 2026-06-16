import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { Avatar } from '../../components/ui/Avatar';
import { AppSubHeader } from '../../components/ui/AppSubHeader';
import { Icon } from '../../components/icons/Icon';
import { HubToggleBar } from '../../components/ui/HubToggleBar';
import { Toast, ToastData } from '../../components/ui/Toast';
import { usePawCircles } from '../../context/PawCircleContext';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useCircleMembers, circleMemberToAvatarUser } from '../../hooks/useCircleMembers';
import { useCircleMessages, DbCircleMessage } from '../../hooks/useCircleMessages';
import { markCircleRead } from '../../hooks/useCirclePreviews';
import { useAuth } from '../../context/AuthContext';
import { CircleSharedPostCard } from './CircleSharedPostCard';
import { useFeedPosts } from '../../context/FeedPostContext';
import { useHomeHub } from '../../context/HomeHubContext';
import { openFeedSharedPost } from '../../navigation/feedPostRouting';
import { selectFeedRows, rowToPost } from '../../hooks/useFeedQuery';
import { supabase } from '../../lib/supabase';
import type { Post } from '../../data/mockData';

type Route = RouteProp<CirclesStackParamList, 'CircleChat'>;
type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<CirclesStackParamList, 'CircleChat'>,
  BottomTabNavigationProp<{ Feed: undefined; Circles: undefined }>
>;

type ChatTab = 'chats' | 'members';

function isRecentlyActive(time: string): boolean {
  const lower = time.toLowerCase();
  return (
    lower.includes('now')
    || lower.includes('m ago')
    || lower.includes('h ago')
    || lower.includes('am')
    || lower.includes('pm')
    || lower.includes('today')
    || lower.includes('yesterday')
  );
}

function DatePill({ label, tint, text }: { label: string; tint: string; text: string }) {
  return (
    <View style={styles.dateWrap}>
      <View style={[styles.datePill, { backgroundColor: tint }]}>
        <Text style={[styles.dateText, { color: text }]}>{label}</Text>
      </View>
    </View>
  );
}

function ChatComposer({
  draft,
  onChangeDraft,
  onSend,
  onAttach,
  tabBarPad,
}: {
  draft: string;
  onChangeDraft: (t: string) => void;
  onSend: () => void;
  onAttach: () => void;
  tabBarPad: number;
}) {
  const { colors } = useTheme();
  const canSend = draft.trim().length > 0;

  return (
    <View
      style={[
        styles.composer,
        {
          backgroundColor: colors.bg,
          paddingBottom: Math.max(tabBarPad, spacing.md),
        },
      ]}
    >
      <View style={[styles.composerRow, { backgroundColor: colors.primary + '0A' }]}>
        <Pressable
          onPress={onAttach}
          accessibilityRole="button"
          accessibilityLabel="Share a post"
          style={({ pressed }) => [
            styles.composerBtn,
            { backgroundColor: colors.primary + '14' },
            pressed && styles.composerPressed,
          ]}
        >
          <Icon name="plus" size={18} color={colors.primary} sw={2} />
        </Pressable>

        <View style={styles.composerInputWrap}>
          <TextInput
            style={[styles.composerInput, { color: colors.text }]}
            placeholder="Message your circle…"
            placeholderTextColor={colors.textTertiary}
            value={draft}
            onChangeText={onChangeDraft}
            multiline
            maxLength={2000}
            textAlignVertical="center"
          />
        </View>

        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={({ pressed }) => [
            styles.composerBtn,
            {
              backgroundColor: canSend ? colors.primary : colors.primary + '14',
              opacity: !canSend ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Icon
            name="send"
            size={16}
            color={canSend ? colors.onPrimary : colors.textTertiary}
          />
        </Pressable>
      </View>
    </View>
  );
}

export function CircleChatScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { circleId, returnTo } = route.params;
  const { user } = useAuth();
  const { getCircle, getDbId } = usePawCircles();
  const circle = getCircle(circleId);
  const circleDbId = getDbId(circleId);
  const { members } = useCircleMembers(circleDbId);
  const { messages, send } = useCircleMessages(circleDbId, user?.id);
  const { posts: feedPosts, requestFeedPostFocus } = useFeedPosts();
  const { resetToFeed, selectSection } = useHomeHub();
  const [sharedPostMap, setSharedPostMap] = useState<Record<string, Post>>({});
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [tab, setTab] = useState<ChatTab>('chats');
  const listRef = useRef<FlatList<DbCircleMessage>>(null);
  const tabBarPad = useTabBarScrollPadding();

  const scrollToLatest = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    if (tab === 'chats') scrollToLatest(false);
  }, [tab, messages.length, scrollToLatest]);

  // Mark circle as read whenever the user is viewing the chat tab and new messages arrive
  useEffect(() => {
    if (tab === 'chats' && circleDbId && user?.id) {
      markCircleRead(circleDbId, user.id);
    }
  }, [tab, messages.length, circleDbId, user?.id]);

  // Load post data for shared_post messages not already in the feed
  useEffect(() => {
    const sharedIds = messages
      .filter((m): m is Extract<DbCircleMessage, { type: 'shared_post' }> => m.type === 'shared_post')
      .map(m => m.postId)
      .filter(id => id && !feedPosts.find(p => p.id === id) && !sharedPostMap[id]);

    if (sharedIds.length === 0) return;
    selectFeedRows(select =>
      supabase.from('posts').select(select).in('id', sharedIds),
    ).then(({ data }) => {
        if (!data) return;
        const loaded: Record<string, Post> = {};
        for (const row of data as any[]) {
          const post = rowToPost(row, user?.id ?? '');
          loaded[post.id] = post;
        }
        setSharedPostMap(prev => ({ ...prev, ...loaded }));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, user?.id]);

  const chatBg = colors.bg;
  const incomingBubbleBg = colors.primary + '0C';
  const outgoingBubbleBg = colors.primary + '18';

  const activeUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of messages) {
      if (m.type === 'text' || m.type === 'shared_post') {
        if (isRecentlyActive(m.time)) ids.add(m.userId);
      }
    }
    if (user?.id) ids.add(user.id);
    return ids;
  }, [messages]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aActive = activeUserIds.has(a.userId) ? 0 : 1;
      const bActive = activeUserIds.has(b.userId) ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return a.name.localeCompare(b.name);
    });
  }, [members, activeUserIds]);

  const memberAvatarById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof circleMemberToAvatarUser>>();
    for (const member of members) {
      map.set(member.userId, circleMemberToAvatarUser(member));
    }
    return map;
  }, [members]);

  const activeCount = sortedMembers.filter(m => activeUserIds.has(m.userId)).length;

  if (!circle) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <Text style={{ padding: 20, color: colors.text }}>Circle not found</Text>
      </SafeAreaView>
    );
  }

  const memberCount = members.length;

  const handleBack = () => {
    if (returnTo === 'Feed') {
      navigation.getParent()?.navigate('Feed');
    } else {
      navigation.goBack();
    }
  };

  const handleTabChange = (id: string) => {
    setTab(id as ChatTab);
  };

  const sendMessage = () => {
    if (!draft.trim()) return;
    send(draft.trim());
    setDraft('');
    scrollToLatest(true);
  };

  const handleViewSharedPost = useCallback((post: Post) => {
    openFeedSharedPost({
      post,
      requestFeedPostFocus,
      resetToFeed,
      selectSection,
      navigateToFeed: () => navigation.navigate('Feed'),
    });
  }, [navigation, requestFeedPostFocus, resetToFeed, selectSection]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <AppSubHeader
        title={circle.name}
        onBack={handleBack}
        rightIcon="settings"
        onRightPress={() => navigation.navigate('CircleSettings', { circleId })}
      />

      <HubToggleBar
        items={[
          { id: 'chats', label: 'Chats' },
          { id: 'members', label: 'Members' },
        ]}
        value={tab}
        onChange={handleTabChange}
        bordered={false}
        style={styles.tabHub}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: chatBg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {tab === 'members' ? (
          <ScrollView
            style={{ backgroundColor: chatBg }}
            contentContainerStyle={[styles.membersScroll, { paddingBottom: tabBarPad + 16 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.membersLead, { color: colors.textSecondary }]}>
              {activeCount} of {memberCount} members active in this circle
            </Text>
            <View style={styles.membersList}>
              {sortedMembers.map((member, index) => {
                const isActive = activeUserIds.has(member.userId);
                return (
                  <View key={member.userId}>
                    <Pressable
                      onPress={() => navigation.navigate('UserProfile', { userId: member.userId })}
                      style={({ pressed }) => [styles.memberRow, pressed && { opacity: 0.6 }]}
                    >
                      <View style={styles.memberAvatarWrap}>
                        <Avatar user={circleMemberToAvatarUser(member)} size={40} />
                        {isActive && (
                          <View style={[styles.activeDot, { backgroundColor: colors.success, borderColor: colors.bg }]} />
                        )}
                      </View>
                      <View style={styles.memberMeta}>
                        <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                          {member.name}
                        </Text>
                        <Text style={[styles.memberHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                          @{member.handle}
                        </Text>
                      </View>
                      <Text style={[styles.memberStatus, { color: isActive ? colors.success : colors.textTertiary }]}>
                        {isActive ? 'Active' : 'Away'}
                      </Text>
                      <Icon name="chevronRight" size={14} color={colors.textTertiary} />
                    </Pressable>
                    {index < sortedMembers.length - 1 && (
                      <View style={[styles.memberDivider, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                );
              })}
            </View>
            <Pressable
              onPress={() => navigation.navigate('CircleMembers', { circleId })}
              style={({ pressed }) => [styles.viewAllBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>View all members</Text>
              <Icon name="chevronRight" size={14} color={colors.primary} />
            </Pressable>
          </ScrollView>
        ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          style={[styles.messageListView, { backgroundColor: chatBg }]}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToLatest(false)}
          onLayout={() => scrollToLatest(false)}
          ListHeaderComponent={
            <DatePill label="Today" tint={colors.primary + '10'} text={colors.textSecondary} />
          }
          renderItem={({ item }) => {
            if (item.type === 'system') {
              return (
                <View style={styles.systemWrap}>
                  <Text style={[styles.systemText, { color: colors.textTertiary }]}>
                    {item.text}
                  </Text>
                </View>
              );
            }

            if (item.type === 'shared_post') {
              const sharedPost = feedPosts.find(p => p.id === item.postId) ?? sharedPostMap[item.postId];
              const memberProfile = memberAvatarById.get(item.userId);
              const sharer = memberProfile ?? { id: item.userId, name: item.userId.slice(0, 8), tint: '#888888' };
              const isMe = !!(user?.id && item.userId === user.id);
              if (!sharedPost) {
                // Post still loading — show a placeholder bubble
                return (
                  <View style={isMe ? styles.outgoingWrap : styles.incomingRow}>
                    {!isMe && <Avatar user={sharer} size={36} />}
                    <View style={[styles.incomingBubble, { backgroundColor: incomingBubbleBg, paddingHorizontal: 14, paddingVertical: 10 }]}>
                      <Text style={{ color: colors.textTertiary, fontSize: 13 }}>Shared a post</Text>
                    </View>
                  </View>
                );
              }
              return (
                <View style={isMe ? styles.outgoingWrap : styles.incomingRow}>
                  {!isMe && <Avatar user={sharer} size={36} />}
                  <View style={isMe ? styles.outgoingCol : styles.incomingCol}>
                    <CircleSharedPostCard
                      post={sharedPost}
                      circleTint={circle?.tint ?? colors.primary}
                      onPress={() => handleViewSharedPost(sharedPost)}
                    />
                    <Text style={[styles.bubbleTime, { color: colors.textTertiary, alignSelf: isMe ? 'flex-start' : 'flex-end' }]}>
                      {item.time}
                    </Text>
                  </View>
                </View>
              );
            }

            const author = memberAvatarById.get(item.userId)
              ?? { id: item.userId, name: item.userId.slice(0, 8), tint: '#888888' };
            const isMe = !!(user?.id && item.userId === user.id);

            if (isMe) {
              return (
                <View style={styles.outgoingWrap}>
                  <View style={[styles.outgoingBubble, { backgroundColor: outgoingBubbleBg }]}>
                    <Text style={[styles.bubbleText, { color: colors.text }]}>{item.text}</Text>
                  </View>
                  <View style={styles.outgoingMeta}>
                    <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{item.time}</Text>
                    <Icon name="check" size={12} color={colors.primary} />
                  </View>
                </View>
              );
            }

            return (
              <View style={styles.incomingRow}>
                <Avatar user={author} size={36} />
                <View style={styles.incomingCol}>
                  <View style={[styles.incomingBubble, { backgroundColor: incomingBubbleBg }]}>
                    <Text style={[styles.bubbleText, { color: colors.text }]}>{item.text}</Text>
                  </View>
                  <Text style={[styles.bubbleTime, { color: colors.textTertiary, alignSelf: 'flex-end' }]}>
                    {item.time}
                  </Text>
                </View>
              </View>
            );
          }}
        />
        )}

        {tab === 'chats' && (
          <ChatComposer
            draft={draft}
            onChangeDraft={setDraft}
            onSend={sendMessage}
            onAttach={() => setToast({ msg: 'Share a post from your feed', icon: 'paw', tone: 'neutral' })}
            tabBarPad={tabBarPad}
          />
        )}
      </KeyboardAvoidingView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  tabHub: {
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
  },
  messageListView: { flex: 1 },
  messageList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  dateWrap: { alignItems: 'center', marginBottom: spacing.xs },
  datePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  dateText: { ...typography.caption, fontWeight: '600' },
  systemWrap: { alignItems: 'center', marginVertical: 2 },
  systemText: { ...typography.meta, fontStyle: 'italic' },
  incomingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  incomingCol: { flex: 1, gap: 2, minWidth: 0 },
  incomingBubble: {
    borderRadius: radius.xl,
    borderBottomLeftRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    maxWidth: '92%',
    alignSelf: 'flex-start',
  },
  outgoingWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  outgoingCol: { flex: 1, gap: 2, minWidth: 0, alignItems: 'flex-end' },
  outgoingBubble: {
    borderRadius: radius.xl,
    borderBottomRightRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    maxWidth: '82%',
  },
  bubbleText: { ...typography.bodySm, lineHeight: 21 },
  bubbleTime: { ...typography.meta },
  outgoingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    paddingRight: 2,
  },
  composer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
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
  composerPressed: { opacity: 0.72 },
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
  membersScroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  membersLead: { ...typography.small, marginLeft: 2 },
  membersList: {
    gap: 0,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  memberAvatarWrap: { position: 'relative' },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  memberMeta: { flex: 1, gap: 2, minWidth: 0 },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberHandle: { fontSize: 13 },
  memberStatus: { fontSize: 12, fontWeight: '600' },
  memberDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  viewAllText: { fontSize: 14, fontWeight: '600' },
});
