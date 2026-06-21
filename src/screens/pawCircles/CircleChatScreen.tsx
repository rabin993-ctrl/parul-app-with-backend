import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { Avatar } from '../../components/ui/Avatar';
import { AppCenteredHeader, AppHeaderIconButton, HUB_USERNAME_TITLE_STYLE } from '../../components/ui/AppSubHeader';
import { Icon } from '../../components/icons/Icon';
import { Toast, ToastData } from '../../components/ui/Toast';
import { MentionText } from '../../components/ui/MentionText';
import { usePawCircles } from '../../context/PawCircleContext';
import type { CirclesStackParamList } from '../../navigation/CirclesNavigator';
import { useCircleMembers, circleMemberToAvatarUser, type CircleMemberProfile } from '../../hooks/useCircleMembers';
import { useCircleMessages, DbCircleMessage } from '../../hooks/useCircleMessages';
import { markCircleRead } from '../../hooks/useCirclePreviews';
import { setActiveCircleChatDbId } from '../../lib/circlePreviewSync';
import { useAuth } from '../../context/AuthContext';
import { CircleAttachSheet, type CircleAttachAction } from '../../components/pawCircles/CircleAttachSheet';
import { CircleMediaBubble } from '../../components/pawCircles/CircleMediaBubble';
import { CircleSharedPostCard } from './CircleSharedPostCard';
import { useMediaPicker } from '../../hooks/useMediaPicker';
import { useFilePicker } from '../../hooks/useFilePicker';
import {
  ChatPendingAttachmentPreview,
  type ChatAttachmentDraft,
} from '../../components/chat/ChatComposerAttachment';
import { useFeedPosts } from '../../context/FeedPostContext';
import { openFeedSharedPost } from '../../navigation/feedPostRouting';
import { selectFeedRows, postsFromDbRows, type DbPostRow } from '../../hooks/useFeedQuery';
import { supabase } from '../../lib/supabase';
import type { Post } from '../../data/mockData';
import {
  buildCircleChatListItems,
  isAlertSharedPost,
  resolveSharedPostTint,
  type CircleChatListItem,
} from '../../utils/chatMessageListItems';
import { sharedPostLoadingLabel } from '../../utils/chatPreviewText';
import { RescueCaseShareCard } from '../../components/rescue/RescueCaseShareCard';
import { useRescueFeedOptional } from '../../context/RescueFeedContext';
import { getRescueCaseById } from '../../data/rescueData';
import { fetchRescueCaseById } from '../../utils/rescueCases';
import { getRootNavigation } from '../../navigation/notificationRouting';
import { openRescueCaseDetail } from '../../navigation/rescueCaseRouting';
import {
  isRescueCaseShareText,
  parseRescueCaseShareText,
} from '../../utils/shareRescueCase';
import type { RescueCase } from '../../data/profileData';
import { CircleChatMemberSheet } from '../../components/pawCircles/CircleChatMemberSheet';
import { startDirectMessage } from '../../utils/startDirectMessage';
import { useAdoption, type ChatThread } from '../../context/AdoptionContext';
import { navigateToChatThread } from '../../navigation/chatThreadRouting';
import type { User } from '../../data/mockData';

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
        <ChatPendingAttachmentPreview
          draft={pendingAttachment}
          onClear={onClearAttachment}
        />
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
  const { registerDmThread, reloadThreads } = useAdoption();
  const { getCircle, resolveCircleDbId, createdCircles, pendingCountByCircle } = usePawCircles();
  const circle = getCircle(circleId);
  const circleDbId = resolveCircleDbId(circleId);
  const isAdmin = createdCircles.some(c => c.id === circleId);
  const pendingMemberRequests = circleDbId && isAdmin
    ? (pendingCountByCircle[circleDbId] ?? 0)
    : 0;
  const { members } = useCircleMembers(circleDbId);
  const { messages, send, sendPhoto, sendFile, sending } =
    useCircleMessages(circleDbId, user?.id);
  const { pickImage, takePhoto } = useMediaPicker();
  const { pickFile } = useFilePicker();
  const { posts: feedPosts, ensureFeedPost } = useFeedPosts();
  const [draft, setDraft] = useState('');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachmentDraft | null>(null);
  const [sharedPostMap, setSharedPostMap] = useState<Record<string, Post>>({});
  const [rescueCaseMap, setRescueCaseMap] = useState<Record<string, RescueCase>>({});
  const [selectedMember, setSelectedMember] = useState<CircleMemberProfile | null>(null);
  const [dmLoading, setDmLoading] = useState(false);
  const rescueFeed = useRescueFeedOptional();
  const listRef = useRef<FlatList<CircleChatListItem>>(null);
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  const scrollToLatest = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    scrollToLatest(false);
  }, [messages.length, scrollToLatest]);

  useFocusEffect(useCallback(() => {
    if (!circleDbId) return;
    setActiveCircleChatDbId(circleDbId);
    void markCircleRead(circleDbId, user?.id);
    return () => setActiveCircleChatDbId(null);
  }, [circleDbId, user?.id]));

  useEffect(() => {
    if (circleDbId && user?.id && messages.length > 0) {
      void markCircleRead(circleDbId, user.id);
    }
  }, [messages.length, circleDbId, user?.id]);

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

  const memberById = useMemo(() => {
    const map = new Map<string, CircleMemberProfile>();
    for (const member of members) map.set(member.userId, member);
    return map;
  }, [members]);

  const openMemberSheet = useCallback((userId: string) => {
    if (!user?.id || userId === user.id) return;
    const member = memberById.get(userId);
    if (member) setSelectedMember(member);
  }, [memberById, user?.id]);

  const buildDmThread = useCallback((member: CircleMemberProfile, threadId: string): ChatThread => ({
    id: threadId,
    participantId: member.userId,
    participantName: member.name,
    participantHandle: member.handle,
    participantTint: member.tint,
    participantAvatarUrl: member.avatarUrl,
    participantAvatarFallbackUrl: member.avatarFallbackUrl,
    preview: '',
    time: '',
    unread: 0,
  }), []);

  const handleSendPersonalMessage = useCallback(() => {
    if (!selectedMember || dmLoading) return;
    const member = selectedMember;
    setSelectedMember(null);
    setDmLoading(true);
    void (async () => {
      const result = await startDirectMessage(member.userId);
      setDmLoading(false);
      if ('error' in result) {
        setToast({ msg: result.error, icon: 'close', tone: 'danger' });
        return;
      }
      const resolved = buildDmThread(member, result.threadId);
      registerDmThread(resolved);
      await reloadThreads();
      navigateToChatThread(navigation, resolved);
    })();
  }, [buildDmThread, dmLoading, navigation, registerDmThread, reloadThreads, selectedMember]);

  const handleViewMemberProfile = useCallback(() => {
    if (!selectedMember) return;
    const userId = selectedMember.userId;
    setSelectedMember(null);
    navigation.navigate('UserProfile', { userId, returnTo: 'Hub' });
  }, [navigation, selectedMember]);

  const renderPeerAvatar = useCallback((
    userId: string,
    author: Pick<User, 'id' | 'name' | 'tint' | 'avatarUrl' | 'avatarFallbackUrl' | 'avatarOriginalUrl'>,
  ) => (
    <Pressable
      onPress={() => openMemberSheet(userId)}
      style={({ pressed }) => [styles.bubbleAvatarBtn, pressed && styles.avatarPressed]}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={`${author.name} options`}
    >
      <Avatar user={author} size={36} />
    </Pressable>
  ), [openMemberSheet]);

  const chatListItems = useMemo(
    () => buildCircleChatListItems(messages),
    [messages],
  );

  useEffect(() => {
    const sharedIds = messages
      .filter((m): m is Extract<DbCircleMessage, { type: 'shared_post' }> =>
        m.type === 'shared_post' && !!m.postId)
      .map(m => m.postId)
      .filter(id => !feedPosts.find(p => p.id === id) && !sharedPostMap[id]);
    if (sharedIds.length === 0) return;
    selectFeedRows(select =>
      supabase.from('posts').select(select).in('id', sharedIds),
    ).then(async ({ data }) => {
      if (!data) return;
      const rows = data as unknown as DbPostRow[];
      const posts = await postsFromDbRows(rows, user?.id ?? '');
      const loaded: Record<string, Post> = {};
      for (const post of posts) {
        loaded[post.id] = post;
      }
      setSharedPostMap(prev => ({ ...prev, ...loaded }));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, user?.id]);

  useEffect(() => {
    const caseIds = messages
      .filter(m => m.type === 'text' && isRescueCaseShareText(m.text))
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
  }, [messages.length]);

  const resolveRescueCase = useCallback((caseId: string): RescueCase | null => {
    return rescueCaseMap[caseId]
      ?? rescueFeed?.cases.find(c => c.id === caseId)
      ?? getRescueCaseById(caseId);
  }, [rescueCaseMap, rescueFeed?.cases]);

  const handleViewRescueCase = useCallback((caseId: string) => {
    openRescueCaseDetail(getRootNavigation(navigation), caseId);
  }, [navigation]);

  const handleViewSharedPost = useCallback((post: Post) => {
    openFeedSharedPost({
      post,
      ensureFeedPost,
      circlesNavigation: navigation,
    });
  }, [ensureFeedPost, navigation]);

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

  if (!circle) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <Text style={{ padding: 20, color: colors.text }}>Circle not found</Text>
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

  const sendMessage = async () => {
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

  const renderSharedPostCluster = (
    item: Extract<DbCircleMessage, { type: 'shared_post' }>,
  ) => {
    const isMe = !!(user?.id && item.userId === user.id);
    const author = memberAvatarById.get(item.userId)
      ?? { id: item.userId, name: item.userId.slice(0, 8), tint: '#888888' };
    const sharedPost = feedPosts.find(p => p.id === item.postId) ?? sharedPostMap[item.postId];
    const isAlertCard = isAlertSharedPost(sharedPost);
    const cardTint = resolveSharedPostTint(sharedPost, isMe, author.tint, colors);
    const time = item.time;

    return (
      <View style={isMe ? styles.outgoingWrap : styles.incomingRow}>
        {!isMe && renderPeerAvatar(item.userId, author)}
        <View
          style={[
            isMe ? styles.outgoingCol : styles.incomingCol,
            styles.messageCluster,
            { maxWidth: bubbleMaxWidth },
          ]}
        >
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
            <View style={[styles.incomingBubble, { backgroundColor: incomingBubbleBg, paddingHorizontal: 14, paddingVertical: 10 }]}>
              <Text style={{ color: colors.textTertiary, fontSize: 13 }}>
                {user?.id
                  ? sharedPostLoadingLabel(user.id, item.userId, author.name)
                  : 'Shared a post'}
              </Text>
            </View>
          )}
          <View style={isMe ? styles.outgoingMeta : styles.incomingMeta}>
            <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{time}</Text>
            {isMe ? <Icon name="check" size={12} color={colors.primary} /> : null}
          </View>
        </View>
      </View>
    );
  };

  const renderRescueCaseShareCluster = (
    item: Extract<DbCircleMessage, { type: 'text' }>,
  ) => {
    const parsed = parseRescueCaseShareText(item.text);
    if (!parsed) return null;

    const isMe = !!(user?.id && item.userId === user.id);
    const author = memberAvatarById.get(item.userId)
      ?? { id: item.userId, name: item.userId.slice(0, 8), tint: '#888888' };
    const rescueCase = resolveRescueCase(parsed.caseId);
    const cardTint = rescueCase?.tint ?? author.tint ?? colors.primary;
    const time = item.time;

    return (
      <View style={isMe ? styles.outgoingWrap : styles.incomingRow}>
        {!isMe && renderPeerAvatar(item.userId, author)}
        <View
          style={[
            isMe ? styles.outgoingCol : styles.incomingCol,
            styles.messageCluster,
            { width: bubbleMaxWidth, maxWidth: bubbleMaxWidth },
          ]}
        >
          <RescueCaseShareCard
            caseId={parsed.caseId}
            item={rescueCase}
            preview={parsed.preview}
            tint={cardTint}
            onPress={() => handleViewRescueCase(parsed.caseId)}
            maxWidth={bubbleMaxWidth}
          />
          <View style={isMe ? styles.outgoingMeta : styles.incomingMeta}>
            <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{time}</Text>
            {isMe ? <Icon name="check" size={12} color={colors.primary} /> : null}
          </View>
        </View>
      </View>
    );
  };

  const renderListItem = ({ item }: { item: CircleChatListItem }) => {
    const message = item.message;

    if (message.type === 'system') {
      return (
        <View style={styles.systemWrap}>
          <Text style={[styles.systemText, { color: colors.textTertiary }]}>
            {message.text}
          </Text>
        </View>
      );
    }

    if (message.type === 'shared_post') {
      return renderSharedPostCluster(message);
    }

    if (message.type === 'media') {
      const author = memberAvatarById.get(message.userId)
        ?? { id: message.userId, name: message.userId.slice(0, 8), tint: '#888888' };
      const isMe = !!(user?.id && message.userId === user.id);
      const bubbleBg = isMe ? outgoingBubbleBg : incomingBubbleBg;

      return (
        <View style={isMe ? styles.outgoingWrap : styles.incomingRow}>
          {!isMe && renderPeerAvatar(item.userId, author)}
          <View
            style={[
              isMe ? styles.outgoingCol : styles.incomingCol,
              { maxWidth: bubbleMaxWidth },
            ]}
          >
            <CircleMediaBubble
              mediaKind={message.mediaKind}
              name={message.name}
              size={message.size}
              mediaUrl={message.mediaUrl}
              thumbUrl={message.thumbUrl}
              mime={message.mime}
              caption={message.caption}
              bubbleBg={bubbleBg}
              maxWidth={bubbleMaxWidth}
            />
            <View style={isMe ? styles.outgoingMeta : styles.incomingMeta}>
              <Text
                style={[
                  styles.bubbleTime,
                  { color: colors.textTertiary, alignSelf: isMe ? 'flex-start' : 'flex-end' },
                ]}
              >
                {message.time}
              </Text>
              {isMe ? <Icon name="check" size={12} color={colors.primary} /> : null}
            </View>
          </View>
        </View>
      );
    }

    if (message.type !== 'text') return null;

    if (isRescueCaseShareText(message.text)) {
      return renderRescueCaseShareCluster(message);
    }

    const author = memberAvatarById.get(message.userId)
      ?? { id: message.userId, name: message.userId.slice(0, 8), tint: '#888888' };
    const isMe = !!(user?.id && message.userId === user.id);

    if (isMe) {
      return (
        <View style={styles.outgoingWrap}>
          <View style={[styles.outgoingBubble, { backgroundColor: outgoingBubbleBg }]}>
            <MentionText style={[styles.bubbleText, { color: colors.text }]} returnTo="Hub">
              {message.text}
            </MentionText>
          </View>
          <View style={styles.outgoingMeta}>
            <Text style={[styles.bubbleTime, { color: colors.textTertiary }]}>{message.time}</Text>
            <Icon name="check" size={12} color={colors.primary} />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.incomingRow}>
        {renderPeerAvatar(message.userId, author)}
        <View style={styles.incomingCol}>
          <View style={[styles.incomingBubble, { backgroundColor: incomingBubbleBg }]}>
            <MentionText style={[styles.bubbleText, { color: colors.text }]} returnTo="Hub">
              {message.text}
            </MentionText>
          </View>
          <Text style={[styles.bubbleTime, { color: colors.textTertiary, alignSelf: 'flex-end' }]}>
            {message.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <AppCenteredHeader
        title={`@${circle.id}`}
        onBack={handleBack}
        titleStyle={HUB_USERNAME_TITLE_STYLE}
        compact
        trailing={(
          <View style={styles.headerActions}>
            <AppHeaderIconButton
              name="users"
              size={40}
              color={colors.primary}
              count={pendingMemberRequests > 0 ? pendingMemberRequests : undefined}
              onPress={() => navigation.navigate('CircleMembers', { circleId })}
              accessibilityLabel="Members"
            />
            <AppHeaderIconButton
              name="settings"
              size={40}
              iconSize={20}
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
          data={chatListItems}
          keyExtractor={m => m.id}
          style={[styles.messageListView, { backgroundColor: chatBg }]}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToLatest(false)}
          onLayout={() => scrollToLatest(false)}
          ListHeaderComponent={
            <DatePill label="Today" tint={colors.primary + '10'} text={colors.textSecondary} />
          }
          renderItem={renderListItem}
        />

        <ChatComposer
          draft={draft}
          onChangeDraft={setDraft}
          onSend={() => { void sendMessage(); }}
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

      <CircleChatMemberSheet
        visible={!!selectedMember}
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
        onSendMessage={handleSendPersonalMessage}
        onViewProfile={handleViewMemberProfile}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
  bubbleAvatarBtn: {
    flexShrink: 0,
  },
  avatarPressed: { opacity: 0.72 },
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
  messageCluster: { gap: 4, minWidth: 0 },
  incomingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingRight: 2,
  },
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
});
