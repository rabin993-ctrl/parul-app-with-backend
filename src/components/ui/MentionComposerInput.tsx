import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Platform, type TextInputProps, type TextStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { segmentComposerMentionText } from '../../utils/mentionText';

type MentionComposerInputProps = TextInputProps & {
  inputStyle?: TextStyle;
  /** Exact @tokens chosen from the mention picker (e.g. "@Badda Paw Circle", "@handle"). */
  confirmedMentions?: string[];
};

function useMobileWebComposer(): boolean {
  const [mobileWeb, setMobileWeb] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const check = () => {
      const width = window.visualViewport?.width ?? window.innerWidth;
      const narrow = width < 768;
      const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      setMobileWeb(narrow || coarse);
    };

    check();
    window.visualViewport?.addEventListener('resize', check);
    window.addEventListener('resize', check);
    const coarseQuery = window.matchMedia?.('(pointer: coarse)');
    coarseQuery?.addEventListener?.('change', check);

    return () => {
      window.visualViewport?.removeEventListener('resize', check);
      window.removeEventListener('resize', check);
      coarseQuery?.removeEventListener?.('change', check);
    };
  }, []);

  return mobileWeb;
}

export const MentionComposerInput = forwardRef<TextInput, MentionComposerInputProps>(
  function MentionComposerInput({
    value = '',
    onChangeText,
    style,
    inputStyle,
    confirmedMentions = [],
    placeholder,
    placeholderTextColor,
    ...rest
  }, ref) {
    const { colors } = useTheme();
    const mobileWeb = useMobileWebComposer();
    const text = String(value);
    const showPlaceholder = text.length === 0 && Boolean(placeholder);
    const resolvedPlaceholderColor = placeholderTextColor ?? colors.textTertiary;

    const segments = useMemo(
      () => (text.includes('@') ? segmentComposerMentionText(text, confirmedMentions) : null),
      [text, confirmedMentions],
    );

    const typography = useMemo(
      () => StyleSheet.flatten([styles.base, inputStyle, style]),
      [inputStyle, style],
    );

    const mentionStyle = useMemo<TextStyle>(() => ({
      color: colors.primary,
    }), [colors.primary]);

    const plainInputStyle = useMemo(() => [
      typography,
      styles.input,
      { color: colors.text },
      Platform.select({
        web: { outlineStyle: 'none' } as object,
        default: {},
      }),
    ], [typography, colors.text]);

    const transparentInputStyle = useMemo(() => [
      typography,
      styles.input,
      Platform.select({
        web: {
          caretColor: colors.text,
          color: 'rgba(0,0,0,0)',
          WebkitTextFillColor: 'transparent',
        } as object,
        default: {
          color: 'transparent',
          caretColor: colors.text,
        },
      }),
    ], [typography, colors.text]);

    if (mobileWeb) {
      return (
        <TextInput
          ref={ref}
          value={text}
          onChangeText={onChangeText}
          style={plainInputStyle}
          selectionColor={colors.primary + '55'}
          placeholder={placeholder}
          placeholderTextColor={resolvedPlaceholderColor}
          {...rest}
        />
      );
    }

    return (
      <View style={styles.wrap}>
        {showPlaceholder ? (
          <Text
            pointerEvents="none"
            style={[
              typography,
              styles.overlay,
              styles.placeholder,
              { color: resolvedPlaceholderColor },
            ]}
            numberOfLines={1}
          >
            {placeholder}
          </Text>
        ) : null}
        {text.length > 0 ? (
          <Text
            pointerEvents="none"
            style={[typography, styles.overlay, { color: colors.text }]}
          >
            {segments
              ? segments.map((seg, idx) => {
                if (seg.kind === 'text') return seg.value;
                return (
                  <Text key={`${idx}-${seg.raw}`} style={mentionStyle}>
                    {seg.raw}
                  </Text>
                );
              })
              : text}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          value={text}
          onChangeText={onChangeText}
          style={transparentInputStyle}
          selectionColor={colors.primary + '55'}
          placeholder=""
          {...rest}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    justifyContent: 'center',
  },
  base: {},
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  placeholder: {
    opacity: 1,
  },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { outlineStyle: 'none' } as object,
      default: {},
    }),
  },
});
