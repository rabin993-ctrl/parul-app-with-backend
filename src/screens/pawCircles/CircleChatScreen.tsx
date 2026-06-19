import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform,
  useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { Avatar } from '../../components/ui/Avatar';
import { AppCenteredHeader, HUB_USERNAME_TITLE_STYLE } from '../../components/ui/AppSubHeader';
import { IconButton } from '../../components/ui/Button';
import { Icon } from '../../components/icons/Icon';
import { Toast, ToastData } from '../../components/ui/Toast';
import { usePawCircles } from '../../context/PawCircleContext';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';
import { useCircleMembers, circleMemberToAvatarUser } from '../../hooks/useCircleMembers';
import { useCircleJoinRequests } from '../../hooks/useCircleJoinRequests';
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
import { sharedPostChatCardProps } from '../../utils/chatMessageListItems';
import { sharedPostLoadingLabel } from '../../utils/chatPreviewText';
import { CircleAttachSheet, type CircleAttachAction } from '../../components/pawCircles/CircleAttachSheet';
import { CircleMediaBubble } from '../../components/pawCircles/CircleMediaBubble';
import { useMediaPicker } from '../../hooks/useMediaPicker';
import { useFilePicker } from '../../hooks/useFilePicker';
import {
  ChatPendingAttachmentPreview,
  type ChatAttachmentDraft,
} from '../../components/chat/ChatComposerAttachment';

const BUBBLE_MAX_WIDTH_RATIO = 0.68;
const BUBBLE_MAX_WIDTH_CAP = 280;

type Route = RouteProp<CirclesStackParamList, 'CircleChat'>;
type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<CirclesStackParamList, 'CircleChat'>,
  BottomTabNavigationProp<{ Feed: undefined; Circles: undefined }>
>;

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
  bottomInset,
  busy,
  pendingAttachment,
  onClearAttachment,
}: {
  draft: string;
  onChangeDraft: (t: string) => void;
  onSend: () => void;
  onAttach: () => void;
  bottomInset: number;
  busy?: boolean;
  pendingAttachment?: ChatAttachmentDraft | null;
  onClearAttachment?: () => void;
}) {
  const { colors } = useTheme();
  const canSend = draft.trim().length > 0 || !!pendingAttachment;

  return (
    <View
      style={[
        styles.composer,
        {
          backgroundColor: colors.bg,
          paddingBottom: Math.max(bottomInset, spacing.md),
        },
      ]}
    >
      {pendingAttachment && onClearAttachment ? (
        <ChatPendingAttachmentPreview draft={pendingAttachment} onClear={onClearAttachment} />
      ) : null}
      <View style={[styles.composerRow, { backgroundColor: colors.primary + '0A' }]}>
        <Pressable
          onPress={onAttach}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Add attachment"
          style={({ pressed }) => [
            styles.composerBtn,
            { backgroundColor: colors.primary + '14', opacity: busy ? 0.5 : 1 },
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
            editable={!busy}
          />
        </View>

        <Pressable
          onPress={onSend}
          disabled={!canSend || busy}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={({ pressed }) => [
            styles.composerBtn,
            {
              backgroundColor: canSend ? colors.primary : colors.primary + '14',
              opacity: !canSend || busy ? 0.5 : pressed ? 0.85 : 1,
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
  const { width: screenWidth } = useWindowDimensions();
  const bubbleMaxWidth = Math.min(
    Math.round(screenWidth * BUBBLE_MAX_WIDTH_RATIO),
    BUBBLE_MAX_WIDTH_CAP,
  );
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { circleId, returnTo } = route.params;
  const { user } = useAuth();
  const { getCircle, getDbId, createdCircles, ready } = usePawCircles();
  const circle = getCircle(circleId);
  const circleDbId = getDbId(circleId);
  const { members } = useCircleMembers(circleDbId);
  const isCreator = createdCircles.some(c => c.id === circleId);
  const { requests } = useCircleJoinRequests(isCreator ? circleDbId : null);
  const {
    messages,
    loading: messagesLoading,
    sending,
    send,
    sendPhoto,
    sendFile,
  } = useCircleMessages(circleDbId, user?.id);
  const { pickImage, takePhoto } = useMediaPicker();
  const { pickFile } = useFilePicker();
  const { posts: feedPosts, ensureFeedPost } = useFeedPosts();
  const { selectSection } = useHomeHub();
  const [sharedPostMap, setSharedPostMap] = useState<Record<string, Post>>({});
  const [draft, setDraft] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachmentDraft | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const listRef = useRef<FlatList<DbCircleMessage>>(null);
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  const scrollToLatest = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const handleViewSharedPost = useCallback((post: Post) => {
    openFeedSharedPost({
      post,
      ensureFeedPost,
      circlesNavigation: navigation,
      selectSection,
    });
  }, [navigation, ensureFeedPost, selectSection]);

  useEffect(() => {
    scrollToLatest(false);
  }, [messages.length, scrollToLatest]);

  useEffect(() => {
    if (circleDbId && user?.id) {
      markCircleRead(circleDbId, user.id);
    }
  }, [messages.length, circleDbId, user?.id]);

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

  const memberAvatarById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof circleMemberToAvatarUser>>();
    for (const member of members) {
      map.set(member.userId, circleMemberToAvatarUser(member));
    }
    return map;
  }, [members]);

  const handleAttachAction = useCallback(async (action: CircleAttachAction) => {
    if (sending) return;
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
  }, [pickFile, pickImage, sending, takePhoto]);

  if (!ready || (messagesLoading && messages.length === 0)) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <AppCenteredHeader
          title={circle ? `@${circle.id}` : `@${circleId}`}
          onBack={() => navigation.goBack()}
          titleStyle={HUB_USERNAME_TITLE_STYLE}
        />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading messages…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!circle) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <AppCenteredHeader
          title="Circle chat"
          onBack={() => navigation.goBack()}
          titleStyle={HUB_USERNAME_TITLE_STYLE}
        />
        <View style={styles.loadingWrap}>
          <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
            Circle not found or you no longer have access.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleBack = () => {
    if (returnTo === 'Feed') {
      navigation.getParent()?.navigate('Feed', { screen: 'FeedHome' });
    } else {
      navigation.goBack();
    }
  };

  const handleSend = async () => {
    const caption = draft.trim() || undefined;
    if (pendingAttachment?.kind === 'photo') {
      const ok = await sendPhoto(pendingAttachment.asset, caption);
      if (ok) {
        setDraft('');
        setPendingAttachment(null);
        scrollToLatest(true);
      } else {
        setToast({ msg: 'Could not send photo', icon: 'close', tone: 'neutral' });
      }
      return;
    }
    if (pendingAttachment?.kind === 'file') {
      const ok = await sendFile(pendingAttachment.file, caption);
      if (ok) {
        setDraft('');
        setPendingAttachment(null);
        scrollToLatest(true);
      } else {
        setToast({ msg: 'Could not attach file', icon: 'close', tone: 'neutral' });
      }
      return;
    }
    if (!caption) return;
    send(caption);
    setDraft('');
    scrollToLatest(true);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <AppCenteredHeader
        title={`@${circle.id}`}
        onBack={handleBack}
        titleStyle={HUB_USERNAME_TITLE_STYLE}
        trailing={(
          <View style={styles.headerActions}>
            <IconButton
              name="users"
              size={40}
              iconSize={22}
              tone="ghost"
              color={colors.primary}
              count={isCreator && requests.length > 0 ? requests.length : undefined}
              onPress={() => navigation.navigate('CircleMembers', { circleId })}
              accessibilityLabel="Members"
            />
            <IconButton
              name="settings"
              size={40}
              iconSize={20}
              tone="ghost"
              color={colors.primary}
              onPress={() => navigation.navigate('CircleSettings', { circleId })}
              accessibilityLabel="Circle settings"
            />
          </View>
        )}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: chatBg }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
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
                      <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
                        {user?.id
                          ? sharedPostLoadingLabel(user.id, item.userId, sharer.name)
                          : 'Shared a post'}
                      </Text>
                    </View>
                  </View>
                );
              }
              const alertCardProps = sharedPostChatCardProps(
                sharedPost,
                isMe,
                sharer.tint,
                colors,
              );
              return (
                <View style={isMe ? styles.outgoingWrap : styles.incomingRow}>
                  {!isMe && <Avatar user={sharer} size={36} />}
                  <View
                    style={[
                      styles.messageCluster,
                      isMe && styles.messageClusterOutgoing,
                      { maxWidth: bubbleMaxWidth },
                    ]}
                  >
                    <CircleSharedPostCard
                      post={sharedPost}
                      circleTint={alertCardProps.circleTint}
                      onPress={() => handleViewSharedPost(sharedPost)}
                      hideCaption={alertCardProps.hideCaption}
                      variant={alertCardProps.variant}
                      fullWidth={alertCardProps.fullWidth}
                    />
                    <View style={styles.bubbleMeta}>
                      <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>
                        {item.time}
                      </Text>
                      {isMe ? <Icon name="check" size={12} color={colors.primary} /> : null}
                    </View>
                  </View>
                </View>
              );
            }

            if (item.type === 'media') {
              const author = memberAvatarById.get(item.userId)
                ?? { id: item.userId, name: item.userId.slice(0, 8), tint: '#888888' };
              const isMe = !!(user?.id && item.userId === user.id);
              const bubbleBg = isMe ? outgoingBubbleBg : incomingBubbleBg;

              return (
                <View style={isMe ? styles.outgoingWrap : styles.incomingRow}>
                  {!isMe && <Avatar user={author} size={36} />}
                  <View
                    style={[
                      styles.messageCluster,
                      isMe && styles.messageClusterOutgoing,
                      { maxWidth: bubbleMaxWidth },
                    ]}
                  >
                    <CircleMediaBubble
                      mediaKind={item.mediaKind}
                      name={item.name}
                      size={item.size}
                      mediaUrl={item.mediaUrl}
                      thumbUrl={item.thumbUrl}
                      mime={item.mime}
                      durationMs={item.durationMs}
                      caption={item.caption}
                      bubbleBg={bubbleBg}
                      maxWidth={bubbleMaxWidth}
                    />
                    <View style={styles.bubbleMeta}>
                      <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>
                        {item.time}
                      </Text>
                      {isMe ? <Icon name="check" size={12} color={colors.primary} /> : null}
                    </View>
                  </View>
                </View>
              );
            }

            if (item.type !== 'text') return null;

            const author = memberAvatarById.get(item.userId)
              ?? { id: item.userId, name: item.userId.slice(0, 8), tint: '#888888' };
            const isMe = !!(user?.id && item.userId === user.id);

            if (isMe) {
              return (
                <View style={styles.outgoingWrap}>
                  <View style={[styles.messageCluster, styles.messageClusterOutgoing, { maxWidth: bubbleMaxWidth }]}>
                    <View style={[styles.outgoingBubble, { backgroundColor: outgoingBubbleBg }]}>
                      <Text style={[styles.bubbleText, { color: colors.text }]}>{item.text}</Text>
                    </View>
                    <View style={styles.bubbleMeta}>
                      <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{item.time}</Text>
                      <Icon name="check" size={12} color={colors.primary} />
                    </View>
                  </View>
                </View>
              );
            }

            return (
              <View style={styles.incomingRow}>
                <Avatar user={author} size={36} />
                <View style={[styles.messageCluster, { maxWidth: bubbleMaxWidth }]}>
                  <View style={[styles.incomingBubble, { backgroundColor: incomingBubbleBg }]}>
                    <Text style={[styles.bubbleText, { color: colors.text }]}>{item.text}</Text>
                  </View>
                  <View style={styles.bubbleMeta}>
                    <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{item.time}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />

        <ChatComposer
          draft={draft}
          onChangeDraft={setDraft}
          onSend={() => { void handleSend(); }}
          onAttach={() => setAttachOpen(true)}
          bottomInset={bottomInset}
          busy={sending}
          pendingAttachment={pendingAttachment}
          onClearAttachment={() => setPendingAttachment(null)}
        />
      </KeyboardAvoidingView>

      <CircleAttachSheet
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        onSelect={action => { void handleAttachAction(action); }}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  loadingText: { fontSize: 14.5 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
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
  messageCluster: {
    gap: 2,
    minWidth: 0,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  messageClusterOutgoing: {
    alignSelf: 'flex-end',
  },
  incomingBubble: {
    borderRadius: radius.xl,
    borderBottomLeftRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    alignSelf: 'flex-start',
  },
  outgoingWrap: {
    alignItems: 'flex-end',
  },
  outgoingBubble: {
    borderRadius: radius.xl,
    borderBottomRightRadius: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    alignSelf: 'flex-end',
  },
  bubbleText: { ...typography.bodySm, lineHeight: 21 },
  bubbleTime: { ...typography.meta },
  bubbleMeta: {
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
});
