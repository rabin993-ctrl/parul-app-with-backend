import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { Avatar, CompanionAvatar } from '../ui/Avatar';
import { getPetAvatarFrameSize } from '../ui/PawPadShape';
import type { ChatThread } from '../../context/AdoptionContext';
import type { AdoptionRecord } from '../../data/adoptionRecords';
import type { AdoptionListing } from '../../data/adoptionData';
import type { AdoptionRequest } from '../../context/AdoptionFeedContext';
import {
  chatSublineAccentColor,
  getThreadChatDisplay,
  type AdoptionChatGroup,
} from '../../utils/chatThreadMeta';
import { useAuth } from '../../context/AuthContext';
import { chatThreadParticipantUser } from '../../utils/chatParticipant';

const AVATAR_SIZE = 48;
const PET_FRAME = getPetAvatarFrameSize(AVATAR_SIZE);

export function AdoptionChatRow({
  thread,
  records,
  listings,
  requests,
  group,
  nested,
  onPress,
}: {
  thread: ChatThread;
  records: AdoptionRecord[];
  listings: AdoptionListing[];
  requests: AdoptionRequest[];
  group: AdoptionChatGroup;
  nested?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const display = getThreadChatDisplay(thread, records, listings, requests, group, user?.id ?? '');
  if (!display) return null;

  const peerUser = chatThreadParticipantUser(thread);
  const accent = chatSublineAccentColor(display.sublineTone, colors);

  return (
    <View style={[
      styles.row,
      nested && styles.rowNested,
      { borderBottomColor: colors.border },
    ]}>
      <View style={[styles.avatarWrap, { width: PET_FRAME.width, minHeight: PET_FRAME.height }]}>
        {display.usePetAvatar && group.petVisual ? (
          <CompanionAvatar
            pet={{
              icon: group.petVisual.icon,
              tint: group.petVisual.tint,
              name: group.petVisual.petName,
            }}
            size={AVATAR_SIZE}
          />
        ) : (
          <Avatar user={peerUser} size={AVATAR_SIZE} showOnlineIndicator />
        )}
      </View>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.meta,
          Platform.OS === 'web' && styles.metaWeb,
          pressed && styles.metaPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open chat with ${display.title}`}
      >
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {display.title}
        </Text>

        <Text style={styles.subline} numberOfLines={1}>
          <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
            {display.sublineLead}
          </Text>
          {display.sublineAccent ? (
            <>
              <Text style={{ color: colors.textTertiary }}> · </Text>
              <Text style={{ color: accent, fontWeight: '700' }}>
                {display.sublineAccent}
              </Text>
            </>
          ) : null}
        </Text>
      </Pressable>

      {display.isUnread ? (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowNested: {
    paddingLeft: 12,
  },
  avatarWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  meta: {
    flex: 1,
    gap: 2,
    minWidth: 0,
    paddingVertical: 4,
  },
  metaWeb: { cursor: 'pointer' as const },
  metaPressed: { opacity: 0.72 },
  name: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  subline: { ...typography.caption, fontSize: 13, lineHeight: 18 },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    flexShrink: 0,
    marginRight: 4,
  },
});
