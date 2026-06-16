import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, shadows } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { CircleSharedPostCard } from '../../screens/pawCircles/CircleSharedPostCard';
import { commentTextInputProps } from '../ui/BlankInputAccessory';
import { useSheetOverlay } from '../../context/SheetOverlayContext';
import { ModalPresent } from '../ui/ModalScrim';
import type { Post } from '../../data/mockData';
import type { ChatThread } from '../../context/AdoptionContext';
import { useAdoption } from '../../context/AdoptionContext';
import { useAuth } from '../../context/AuthContext';
import { getPostPoster } from '../../utils/postAuthor';
import { startDirectMessage } from '../../utils/startDirectMessage';

const POPUP_MAX_WIDTH = 420;

function alertPlaceholder(post: Post): string {
  if (post.label === 'found') {
    return 'I think I know this pet…';
  }
  return 'I have info about this pet…';
}

function buildChatThread(post: Post, threadId: string): ChatThread {
  const poster = getPostPoster(post);
  const peer = poster.type === 'companion' ? poster.owner : poster.user;
  return {
    id: threadId,
    participantId: post.userId,
    participantName: post.authorName ?? peer.name,
    participantHandle: post.author,
    participantTint: post.authorTint ?? peer.tint,
    participantAvatarUrl: post.authorAvatarUrl ?? peer.avatarUrl,
    participantAvatarFallbackUrl: post.authorAvatarFallbackUrl ?? peer.avatarFallbackUrl,
    preview: '',
    time: 'Now',
    unread: 0,
  };
}

export function AlertMessageSheet({
  post,
  onClose,
  onSent,
  onError,
}: {
  post: Post | null;
  onClose: () => void;
  onSent: (thread: ChatThread) => void;
  onError: (message: string) => void;
}) {
  const { colors, mode } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { registerOpen, registerClose } = useSheetOverlay();
  const { user } = useAuth();
  const { sendAlertMessage, registerDmThread } = useAdoption();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const visible = !!post;
  const popupWidth = Math.min(windowWidth - 32, POPUP_MAX_WIDTH);
  const popupMaxHeight = Math.min(windowHeight * 0.82, 560);

  useEffect(() => {
    if (post) setDraft('');
  }, [post?.id]);

  useEffect(() => {
    if (!visible) return;
    registerOpen();
    return registerClose;
  }, [visible, registerOpen, registerClose]);

  const accent = post?.label === 'found' ? colors.success : colors.danger;

  const submit = useCallback(async () => {
    if (!post || !user || sending) return;

    setSending(true);
    const dm = await startDirectMessage(post.userId);
    if ('error' in dm) {
      setSending(false);
      onError(dm.error);
      return;
    }

    const messageText = draft.trim() || alertPlaceholder(post);
    const ok = await sendAlertMessage(dm.threadId, post.id, messageText);
    setSending(false);

    if (!ok) {
      onError('Could not send your message');
      return;
    }

    const thread = buildChatThread(post, dm.threadId);
    registerDmThread(thread);
    onSent(thread);
    onClose();
  }, [post, user, sending, draft, sendAlertMessage, registerDmThread, onSent, onClose, onError]);

  const canSend = !!post && !sending;

  if (!post) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <ModalPresent onDismiss={onClose} style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.overlayInner}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
        <Pressable onPress={() => {}} style={styles.popupPressGuard}>
        <View
          style={[
            styles.popup,
            {
              width: popupWidth,
              maxHeight: popupMaxHeight,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            shadows.lg,
          ]}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <CircleSharedPostCard post={post} circleTint={accent} fullWidth variant="compact" hideCaption />
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={[
              styles.inputWrap,
              { backgroundColor: colors.surface2, borderColor: colors.border },
              !draft.includes('\n') && styles.inputWrapSingleLine,
            ]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={alertPlaceholder(post)}
                placeholderTextColor={colors.textTertiary}
                value={draft}
                onChangeText={setDraft}
                multiline={draft.includes('\n')}
                numberOfLines={1}
                maxLength={500}
                editable={!sending}
                autoComplete="off"
                {...commentTextInputProps(mode === 'dark')}
              />
            </View>
            <Button
              icon="send"
              disabled={!canSend}
              onPress={submit}
              style={styles.sendBtn}
            >
              {sending ? 'Sending…' : 'Send'}
            </Button>
          </View>
        </View>
        </Pressable>
        </KeyboardAvoidingView>
        </ModalPresent>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  overlayInner: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupPressGuard: {
    zIndex: 1,
    maxWidth: '100%',
  },
  popup: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    zIndex: 1,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 38,
    maxHeight: 120,
    justifyContent: 'center',
  },
  inputWrapSingleLine: {
    height: 38,
    paddingVertical: 0,
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 96,
    paddingVertical: 0,
  },
  sendBtn: {
    minWidth: 96,
  },
});
