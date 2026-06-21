import React, {
  forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState,
} from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform, InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { commentTextInputProps } from '../ui/BlankInputAccessory';
import { useMobileWeb } from '../../hooks/useMobileWeb';
import { webFieldInputStyle } from '../../theme/webInput';
import {
  ChatPendingAttachmentPreview,
  type ChatAttachmentDraft,
} from './ChatComposerAttachment';

export type ChatThreadComposerHandle = {
  clear: () => void;
  focus: () => void;
};

type Props = {
  threadId: string;
  disabled?: boolean;
  threadConnecting?: boolean;
  placeholder?: string;
  bottomPad: number;
  backgroundColor: string;
  sendingMedia?: boolean;
  pendingAttachment?: ChatAttachmentDraft | null;
  onClearAttachment?: () => void;
  onAttach: () => void;
  onSend: (text: string) => void | Promise<void>;
};

/** Isolated composer — draft state stays here so typing does not re-render the full chat screen (web focus bug). */
export const ChatThreadComposer = memo(forwardRef<ChatThreadComposerHandle, Props>(
  function ChatThreadComposer({
    threadId,
    disabled = false,
    threadConnecting = false,
    placeholder = 'Type a message…',
    bottomPad,
    backgroundColor,
    sendingMedia = false,
    pendingAttachment = null,
    onClearAttachment,
    onAttach,
    onSend,
  }, ref) {
    const { colors, mode } = useTheme();
    const mobileWeb = useMobileWeb();
    const [draft, setDraft] = useState('');
    const [focused, setFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);
    const canType = !disabled && !threadConnecting && !sendingMedia;
    const showTapToTypeHint = mobileWeb && canType && !focused && !threadConnecting;

    useEffect(() => {
      setDraft('');
      setFocused(false);
    }, [threadId]);

    const focusInput = useCallback(() => {
      inputRef.current?.focus();
    }, []);

    useImperativeHandle(ref, () => ({
      clear: () => setDraft(''),
      focus: focusInput,
    }), [focusInput]);

    const didAutoFocusRef = useRef(false);

    useFocusEffect(
      useCallback(() => {
        didAutoFocusRef.current = false;
        if (!canType || mobileWeb || Platform.OS === 'web') {
          return () => { didAutoFocusRef.current = false; };
        }
        let cancelled = false;
        const task = InteractionManager.runAfterInteractions(() => {
          if (cancelled || didAutoFocusRef.current) return;
          didAutoFocusRef.current = true;
          focusInput();
        });
        return () => {
          cancelled = true;
          task.cancel();
          didAutoFocusRef.current = false;
        };
      }, [canType, mobileWeb, focusInput, threadId]),
    );

    const handleSendPress = useCallback(() => {
      const text = draft.trim();
      if (!text && !pendingAttachment) return;
      if (threadConnecting || sendingMedia || disabled) return;
      void Promise.resolve(onSend(text)).then(() => {
        if (!pendingAttachment) setDraft('');
      });
    }, [draft, pendingAttachment, threadConnecting, sendingMedia, disabled, onSend]);

    return (
      <View style={[styles.composer, { backgroundColor, paddingBottom: bottomPad }]}>
        {showTapToTypeHint ? (
          <Pressable onPress={focusInput} accessibilityRole="button">
            <Text style={[styles.tapToTypeHint, { color: colors.textTertiary }]}>
              Tap below to type a message
            </Text>
          </Pressable>
        ) : null}
        {pendingAttachment && onClearAttachment ? (
          <ChatPendingAttachmentPreview
            draft={pendingAttachment}
            onClear={onClearAttachment}
          />
        ) : null}
        <View style={[styles.composerRow, { backgroundColor: colors.primary + '0A' }]}>
          <Pressable
            onPress={onAttach}
            disabled={!canType}
            accessibilityRole="button"
            accessibilityLabel="Add attachment"
            style={({ pressed }) => [
              styles.composerBtn,
              { backgroundColor: colors.primary + '14', opacity: canType ? 1 : 0.5 },
              pressed && styles.composerBtnPressed,
            ]}
            hitSlop={6}
          >
            <Icon name="plus" size={18} color={colors.primary} sw={2} />
          </Pressable>
          <Pressable
            onPress={mobileWeb ? focusInput : undefined}
            style={styles.composerInputWrap}
            accessibilityRole={mobileWeb ? 'none' : undefined}
          >
            <TextInput
              ref={inputRef}
              style={[
                styles.composerInput,
                { color: colors.text },
                Platform.OS === 'web' ? webFieldInputStyle : null,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
              ]}
              placeholder={threadConnecting ? 'Connecting…' : placeholder}
              placeholderTextColor={colors.textTertiary}
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={2000}
              textAlignVertical="center"
              editable={canType}
              onSubmitEditing={handleSendPress}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              showSoftInputOnFocus={Platform.OS === 'web' || Platform.OS === 'android'}
              inputMode="text"
              enterKeyHint="send"
              {...commentTextInputProps(mode === 'dark')}
            />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.composerBtn,
              {
                backgroundColor: (draft.trim() || pendingAttachment) ? colors.primary : colors.primary + '14',
                opacity: !(draft.trim() || pendingAttachment) || !canType ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleSendPress}
            disabled={!(draft.trim() || pendingAttachment) || !canType}
          >
            <Icon
              name="send"
              size={16}
              color={(draft.trim() || pendingAttachment) ? colors.onPrimary : colors.textTertiary}
            />
          </Pressable>
        </View>
      </View>
    );
  },
));

const styles = StyleSheet.create({
  composer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  tapToTypeHint: {
    textAlign: 'center',
    fontSize: 12.5,
    lineHeight: 17,
    paddingBottom: 6,
    paddingHorizontal: 16,
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
  composerBtnPressed: { opacity: 0.72 },
  composerInputWrap: {
    flex: 1,
    minHeight: 40,
    maxHeight: 96,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    ...Platform.select({
      web: { touchAction: 'manipulation', cursor: 'text' } as object,
      default: {},
    }),
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
