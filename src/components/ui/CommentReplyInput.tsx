import React from 'react';
import { View, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { MOBILE_INPUT_FONT_SIZE, radius } from '../../theme/tokens';
import { Avatar } from './Avatar';
import { IconButton } from './Button';
import { commentTextInputProps } from './BlankInputAccessory';
import { Icon } from '../icons/Icon';
import { users } from '../../data/mockData';

export function CommentReplyInput({
  replyToName,
  value,
  onChangeText,
  onSubmit,
  onCancel,
  autoFocus = true,
}: {
  replyToName: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  autoFocus?: boolean;
}) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.row}>
      <Avatar user={users.you} size={28} />
      <View style={[styles.inputWrap, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={`Reply to ${replyToName}…`}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          autoFocus={autoFocus}
          autoComplete="off"
          multiline
          {...commentTextInputProps(isDark)}
        />
        {value.trim().length > 0 && (
          <IconButton name="send" size={30} tone="ghost" color={colors.primary} onPress={onSubmit} />
        )}
      </View>
      <Pressable onPress={onCancel} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
        <Icon name="close" size={16} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    minHeight: 38,
    ...Platform.select({
      web: { outlineStyle: 'none' } as object,
      default: {},
    }),
  },
  input: {
    flex: 1,
    fontSize: MOBILE_INPUT_FONT_SIZE,
    lineHeight: 20,
    maxHeight: 80,
    paddingVertical: 4,
    ...Platform.select({
      web: { outlineStyle: 'none' } as object,
      default: {},
    }),
  },
});
