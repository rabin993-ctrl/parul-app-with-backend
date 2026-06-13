import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { AuthorProfile } from '../../data/communityPosts';

export function CommentAuthorLine({
  userId,
  authorProfile,
  fontSize = 14,
  onAuthorPress,
}: {
  userId: string;
  authorProfile?: AuthorProfile;
  fontSize?: number;
  onAuthorPress?: (userId: string) => void;
  onCompanionPress?: (companionId: string) => void;
}) {
  const { colors } = useTheme();
  // Use the authorProfile name if provided; otherwise treat userId as the display name
  // (for feed threads, thread.user is already the author's handle from the DB join).
  const displayName = authorProfile?.name ?? authorProfile?.handle ?? userId;

  return (
    <Text style={{ fontSize, lineHeight: fontSize + 6 }} numberOfLines={1}>
      <Text
        style={{ fontWeight: '700', color: colors.text }}
        onPress={() => onAuthorPress?.(userId)}
        suppressHighlighting
      >
        {displayName}
      </Text>
    </Text>
  );
}
