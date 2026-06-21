import React, { useMemo } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useMentionRegistry } from '../../hooks/useMentionRegistry';
import { useMentionNavigation } from '../../hooks/useMentionNavigation';
import { segmentMentionText, type MentionTarget } from '../../utils/mentionText';
import type { PawCircle } from '../../data/pawCircles';

type MentionTextProps = TextProps & {
  children: string;
  mentionStyle?: TextStyle;
  onMentionPress?: (target: MentionTarget) => void;
  extraCircles?: PawCircle[];
  returnTo?: 'Feed' | 'Hub' | 'Messages' | 'Profile';
};

export function MentionText({
  children: text,
  style,
  mentionStyle,
  onMentionPress,
  extraCircles,
  returnTo,
  ...rest
}: MentionTextProps) {
  const { colors } = useTheme();
  const registry = useMentionRegistry(extraCircles);
  const defaultNavigate = useMentionNavigation({ returnTo });
  const handlePress = onMentionPress ?? defaultNavigate;

  const segments = useMemo(
    () => segmentMentionText(text, registry),
    [text, registry],
  );

  const mentionBaseStyle = useMemo<TextStyle>(() => ({
    color: colors.primary,
    fontWeight: '600',
    ...mentionStyle,
  }), [colors.primary, mentionStyle]);

  if (!text.includes('@')) {
    return (
      <Text style={style} {...rest}>
        {text}
      </Text>
    );
  }

  return (
    <Text style={style} {...rest}>
      {segments.map((seg, idx) => {
        if (seg.kind === 'text') {
          return seg.value;
        }
        return (
          <Text
            key={`${idx}-${seg.raw}`}
            style={mentionBaseStyle}
            onPress={() => handlePress(seg.target)}
            suppressHighlighting={false}
          >
            {seg.display}
          </Text>
        );
      })}
    </Text>
  );
}
