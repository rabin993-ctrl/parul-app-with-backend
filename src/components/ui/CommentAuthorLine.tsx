import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { users } from '../../data/mockData';
import { getUserDefaultCompanion } from '../../utils/postAuthor';

export function CommentAuthorLine({
  userId,
  fontSize = 14,
  onAuthorPress,
  onCompanionPress,
}: {
  userId: string;
  fontSize?: number;
  onAuthorPress?: (userId: string) => void;
  onCompanionPress?: (companionId: string) => void;
}) {
  const { colors } = useTheme();
  const user = users[userId];
  const companion = user ? getUserDefaultCompanion(userId) : undefined;

  if (!user) {
    return (
      <Text style={{ fontSize, fontWeight: '700', color: colors.text }} numberOfLines={1}>
        Member
      </Text>
    );
  }

  return (
    <Text style={{ fontSize, lineHeight: fontSize + 6 }} numberOfLines={1}>
      <Text
        style={{ fontWeight: '700', color: colors.text }}
        onPress={() => onAuthorPress?.(userId)}
        suppressHighlighting
      >
        {user.name}
      </Text>
      {companion ? (
        <>
          <Text style={{ color: colors.textTertiary, fontWeight: '400' }}> with </Text>
          <Text
            style={{ fontWeight: '600', color: colors.text }}
            onPress={() => onCompanionPress?.(companion.id)}
            suppressHighlighting
          >
            {companion.name}
          </Text>
        </>
      ) : null}
    </Text>
  );
}
