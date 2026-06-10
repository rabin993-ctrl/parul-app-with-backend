import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Avatar } from '../../components/ui/Avatar';
import { IconButton } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { SlidingSegmentControl } from '../../components/ui/SlidingSegmentControl';
import { Toast, ToastData } from '../../components/ui/Toast';
import { usePawCircles } from '../../context/PawCircleContext';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { CircleMessage, getCircleMembers, getCircleMessages, resolvePost } from '../../data/pawCircleChat';
import { users } from '../../data/mockData';
import { CircleSharedPostCard } from './CircleSharedPostCard';

type Route = RouteProp<CirclesStackParamList, 'CircleChat'>;
type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<CirclesStackParamList, 'CircleChat'>,
  BottomTabNavigationProp<{ Feed: undefined; Circles: undefined }>
>;

const CHAT_BG_LIGHT = '#EFF1F5';
const CHAT_BG_DARK = '#161222';
const OUTGOING_BUBBLE_LIGHT = '#D6E4FF';
const OUTGOING_BUBBLE_DARK = '#1E2A42';

const NAME_COLORS: Record<string, string> = {
  omar: '#7A5AE0',
  lena: '#14A697',
  dev: '#F2972E',
  sam: '#D9489A',
  priya: '#7C5CBF',
  you: '#7C5CBF',
};

const REACTION_SEEDS: Record<string, { icon: string; count: number; color: string }> = {
  m2: { icon: 'paw', count: 6, color: '#7C5CBF' },
  m4: { icon: 'heart', count: 4, color: '#E07A6F' },
  m5: { icon: 'paw', count: 3, color: '#7C5CBF' },
};

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

function DatePill({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <View style={styles.dateWrap}>
      <View style={[styles.datePill, { backgroundColor: bg }]}>
        <Text style={[styles.dateText, { color: text }]}>{label}</Text>
      </View>
    </View>
  );
}

export function CircleChatScreen() {
  const { colors, mode } = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { circleId, returnTo } = route.params;
  const { getCircle } = usePawCircles();
  const circle = getCircle(circleId);
  const [messages, setMessages] = useState(() => getCircleMessages(circleId));
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [tab, setTab] = useState<ChatTab>('chats');
  const listRef = useRef<FlatList>(null);
  const tabBarPad = useTabBarScrollPadding();

  const chatBg = mode === 'dark' ? CHAT_BG_DARK : CHAT_BG_LIGHT;
  const outgoingBg = mode === 'dark' ? OUTGOING_BUBBLE_DARK : OUTGOING_BUBBLE_LIGHT;

  const members = useMemo(
    () => (circle ? getCircleMembers(circleId, circle) : []),
    [circleId, circle],
  );

  const activeUserIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of messages) {
      if (m.type === 'text' || m.type === 'shared_post') {
        if (isRecentlyActive(m.time)) ids.add(m.userId);
      }
    }
    ids.add('you');
    return ids;
  }, [messages]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aActive = activeUserIds.has(a.userId) ? 0 : 1;
      const bActive = activeUserIds.has(b.userId) ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return (users[a.userId]?.name ?? '').localeCompare(users[b.userId]?.name ?? '');
    });
  }, [members, activeUserIds]);

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
    const msg: CircleMessage = {
      id: `local-${Date.now()}`,
      type: 'text',
      userId: 'you',
      text: draft.trim(),
      time: 'Now',
    };
    setMessages(prev => [...prev, msg]);
    setDraft('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const locationShort = circle.location.split(',')[0];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]} edges={['top']}>
      <View style={styles.header}>
        <IconButton name="chevronLeft" size={40} tone="ghost" color={colors.text} onPress={handleBack} />
        <Pressable
          style={styles.headerCenter}
          onPress={() => navigation.navigate('CircleSettings', { circleId })}
        >
          <View style={[styles.headerIcon, { backgroundColor: circle.iconBg }]}>
            <Icon
              name={circle.icon}
              size={20}
              color={circle.tint}
              fill={circle.icon === 'paw' || circle.icon === 'cat' ? circle.tint : 'none'}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {circle.name}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
              {locationShort} · {memberCount} members
            </Text>
          </View>
        </Pressable>
        <IconButton
          name="more"
          size={36}
          tone="ghost"
          color={colors.textSecondary}
          onPress={() => navigation.navigate('CircleSettings', { circleId })}
        />
      </View>

      <View style={[styles.tabWrap, { backgroundColor: chatBg }]}>
        <View style={[styles.tabCard, { backgroundColor: mode === 'dark' ? colors.surface2 : '#E4E6EC' }]}>
          <SlidingSegmentControl
            items={[
              { id: 'chats', label: 'Chats' },
              { id: 'members', label: 'Active members' },
            ]}
            value={tab}
            onChange={handleTabChange}
          />
        </View>
      </View>

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
            <View style={[styles.membersCard, { backgroundColor: colors.surface }]}>
              {sortedMembers.map((member, index) => {
                const u = users[member.userId];
                if (!u) return null;
                const isActive = activeUserIds.has(member.userId);
                return (
                  <View key={member.userId}>
                    <Pressable
                      onPress={() => navigation.navigate('UserProfile', { userId: member.userId })}
                      style={({ pressed }) => [styles.memberRow, pressed && { opacity: 0.6 }]}
                    >
                      <View style={styles.memberAvatarWrap}>
                        <Avatar user={u} size={40} showBadge={false} />
                        {isActive && (
                          <View style={[styles.activeDot, { backgroundColor: colors.success, borderColor: colors.surface }]} />
                        )}
                      </View>
                      <View style={styles.memberMeta}>
                        <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                          {u.name}
                        </Text>
                        <Text style={[styles.memberHandle, { color: colors.textSecondary }]} numberOfLines={1}>
                          @{u.handle}
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
          style={{ backgroundColor: chatBg }}
          contentContainerStyle={[styles.messageList, { paddingBottom: tabBarPad + 72 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={<DatePill label="Today" bg={colors.border} text={colors.textSecondary} />}
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
              const post = resolvePost(item.postId);
              const sharer = users[item.userId];
              if (!post) return null;
              const nameColor = NAME_COLORS[item.userId] ?? colors.primary;
              return (
                <View style={styles.incomingRow}>
                  <Avatar user={sharer} size={36} showBadge={false} />
                  <View style={styles.incomingCol}>
                    <View style={[styles.incomingBubble, { backgroundColor: colors.surface }, shadows.sm]}>
                      <Text style={[styles.bubbleName, { color: nameColor }]}>{sharer?.name}</Text>
                      <CircleSharedPostCard
                        post={post}
                        circleTint={circle.tint}
                        onPress={() => setToast({ msg: 'Opening full post…', icon: 'paw', tone: 'primary' })}
                      />
                      <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{item.time}</Text>
                    </View>
                  </View>
                </View>
              );
            }

            const author = users[item.userId];
            const isMe = item.userId === 'you';
            const nameColor = NAME_COLORS[item.userId] ?? colors.primary;
            const reaction = REACTION_SEEDS[item.id];

            if (isMe) {
              return (
                <View style={styles.outgoingWrap}>
                  <View style={[styles.outgoingBubble, { backgroundColor: outgoingBg }, shadows.sm]}>
                    <Text style={[styles.bubbleText, { color: colors.text }]}>{item.text}</Text>
                    <View style={styles.outgoingMeta}>
                      <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{item.time}</Text>
                      <Icon name="check" size={12} color={colors.primary} />
                    </View>
                  </View>
                  {reaction && (
                    <View style={[styles.reactionPill, { backgroundColor: colors.surface }]}>
                      <Icon name={reaction.icon} size={12} color={reaction.color} fill={reaction.icon === 'paw' ? reaction.color : 'none'} />
                      <Text style={[styles.reactionCount, { color: colors.textSecondary }]}>{reaction.count}</Text>
                    </View>
                  )}
                </View>
              );
            }

            return (
              <View style={styles.incomingRow}>
                <Avatar user={author} size={36} showBadge={false} />
                <View style={styles.incomingCol}>
                  <View style={[styles.incomingBubble, { backgroundColor: colors.surface }, shadows.sm]}>
                    <Text style={[styles.bubbleName, { color: nameColor }]}>{author?.name}</Text>
                    <Text style={[styles.bubbleText, { color: colors.text }]}>{item.text}</Text>
                    <Text style={[styles.bubbleTime, { color: colors.textTertiary, alignSelf: 'flex-end' }]}>
                      {item.time}
                    </Text>
                  </View>
                  {reaction && (
                    <View style={[styles.reactionPill, { backgroundColor: colors.surface }]}>
                      <Icon name={reaction.icon} size={12} color={reaction.color} fill={reaction.icon === 'paw' ? reaction.color : 'none'} />
                      <Text style={[styles.reactionCount, { color: colors.textSecondary }]}>{reaction.count}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
        )}

        {tab === 'chats' && (
          <View style={[
            styles.composer,
            { backgroundColor: colors.surface, paddingBottom: Math.max(tabBarPad, 12) },
          ]}>
            <View style={styles.composerRow}>
              <Pressable
                style={[styles.composerBtn, { backgroundColor: colors.primary }]}
                onPress={() => setToast({ msg: 'Share a post from your feed', icon: 'paw', tone: 'neutral' })}
              >
                <Icon name="plus" size={16} color={colors.onPrimary} />
              </Pressable>
              <View style={[styles.inputWrap, { backgroundColor: chatBg }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Type a message…"
                  placeholderTextColor={colors.textTertiary}
                  value={draft}
                  onChangeText={setDraft}
                  multiline
                  maxLength={2000}
                />
              </View>
              <Pressable
                style={[
                  styles.composerBtn,
                  { backgroundColor: draft.trim() ? colors.primary : colors.border },
                ]}
                onPress={sendMessage}
                disabled={!draft.trim()}
              >
                <Icon
                  name="send"
                  size={16}
                  color={draft.trim() ? colors.onPrimary : colors.textTertiary}
                />
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

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
    paddingTop: 10,
    paddingBottom: 12,
    gap: 4,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, lineHeight: 22 },
  headerSub: { fontSize: 13, marginTop: 4, lineHeight: 17 },
  tabWrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tabCard: {
    borderRadius: radius.xl,
    padding: 4,
    overflow: 'hidden',
  },
  messageList: { paddingHorizontal: 16, paddingTop: 8, gap: 16 },
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
  incomingCol: { flex: 1, gap: 4, minWidth: 0 },
  incomingBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    maxWidth: '92%',
    gap: 4,
  },
  outgoingWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  outgoingBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    maxWidth: '82%',
    gap: 4,
  },
  bubbleName: { fontSize: 13, fontWeight: '700' },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 11, marginTop: 2 },
  outgoingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginLeft: 4,
    ...shadows.sm,
  },
  reactionCount: { fontSize: 11, fontWeight: '600' },
  composer: {
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadows.sm,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 34,
  },
  composerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inputWrap: {
    flex: 1,
    minHeight: 34,
    maxHeight: 68,
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
    lineHeight: 18,
    padding: 0,
    margin: 0,
    maxHeight: 54,
    ...Platform.select({
      web: { outlineStyle: 'none' } as object,
      default: {},
    }),
  },
  membersScroll: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  membersLead: { fontSize: 13, marginLeft: 4 },
  membersCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
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
