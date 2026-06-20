import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import type { AuthorProfile } from '../../data/communityPosts';
import { AdoptionUserFlag } from './AdoptionUserFlag';

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
  const displayName = authorProfile?.name ?? authorProfile?.handle ?? userId;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0, flexShrink: 1 }}>
      <Text style={{ fontSize, lineHeight: fontSize + 6 }} numberOfLines={1}>
        <Text
          style={{ fontWeight: '700', color: colors.text }}
          onPress={() => onAuthorPress?.(userId)}
          suppressHighlighting
        >
          {displayName}
        </Text>
      </Text>
      <AdoptionUserFlag userId={userId} size={12} />
    </View>
  );
}
