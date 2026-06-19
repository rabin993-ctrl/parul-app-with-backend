import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform,
  useWindowDimensions,
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
import { CircleAttachSheet, type CircleAttachAction } from '../../components/pawCircles/CircleAttachSheet';
import { CircleMediaBubble } from '../../components/pawCircles/CircleMediaBubble';
import { useMediaPicker } from '../../hooks/useMediaPicker';
import { useFilePicker } from '../../hooks/useFilePicker';

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
}: {
  draft: string;
  onChangeDraft: (t: string) => void;
  onSend: () => void;
  onAttach: () => void;
  bottomInset: number;
  busy?: boolean;
}) {
  const { colors } = useTheme();
  const canSend = draft.trim().length > 0;

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
  const { getCircle, getDbId, createdCircles } = usePawCircles();
  const circle = getCircle(circleId);
  const circleDbId = getDbId(circleId);
  const { members } = useCircleMembers(circleDbId);
  const isCreator = createdCircles.some(c => c.id === circleId);
  const { requests } = useCircleJoinRequests(isCreator ? circleDbId : null);
  const { messages, send, sendPhoto, sendFile, sending } =
    useCircleMessages(circleDbId, user?.id);
  const { pickImage, takePhoto } = useMediaPicker();
  const { pickFile } = useFilePicker();
  const [draft, setDraft] = useState('');
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

  useEffect(() => {
    scrollToLatest(false);
  }, [messages.length, scrollToLatest]);

  useEffect(() => {
    if (circleDbId && user?.id) {
      markCircleRead(circleDbId, user.id);
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

  const handleAttachAction = useCallback(async (action: CircleAttachAction) => {
    if (sending) return;
    switch (action) {
      case 'photo_library': {
        const asset = await pickImage();
        if (!asset) return;
        const ok = await sendPhoto(asset);
        if (ok) scrollToLatest(true);
        else setToast({ msg: 'Could not send photo', icon: 'close', tone: 'neutral' });
        break;
      }
      case 'camera': {
        const asset = await takePhoto();
        if (!asset) return;
        const ok = await sendPhoto(asset);
        if (ok) scrollToLatest(true);
        else setToast({ msg: 'Could not send photo', icon: 'close', tone: 'neutral' });
        break;
      }
      case 'file': {
        const file = await pickFile();
        if (!file) return;
        const ok = await sendFile(file);
        if (ok) scrollToLatest(true);
        else setToast({ msg: 'Could not attach file', icon: 'close', tone: 'neutral' });
        break;
      }
    }
  }, [pickFile, pickImage, scrollToLatest, sendFile, sendPhoto, sending, takePhoto]);

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

  const sendMessage = () => {
    if (!draft.trim()) return;
    send(draft.trim());
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
                      isMe ? styles.outgoingCol : styles.incomingCol,
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
                      caption={item.caption}
                      bubbleBg={bubbleBg}
                      maxWidth={bubbleMaxWidth}
                    />
                    <View style={isMe ? styles.outgoingMeta : undefined}>
                      <Text
                        style={[
                          styles.bubbleTime,
                          { color: colors.textTertiary, alignSelf: isMe ? 'flex-start' : 'flex-end' },
                        ]}
                      >
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

        <ChatComposer
          draft={draft}
          onChangeDraft={setDraft}
          onSend={sendMessage}
          onAttach={() => setAttachOpen(true)}
          bottomInset={bottomInset}
          busy={sending}
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
});
