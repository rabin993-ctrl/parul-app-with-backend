import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { Avatar, CompanionAvatar } from '../ui/Avatar';
import { getPetAvatarFrameSize } from '../ui/PawPadShape';
import type { ChatThread } from '../../context/AdoptionContext';
import type { AdoptionRecord } from '../../data/adoptionRecords';
import {
  getThreadAdoptionMeta,
  getThreadDisplayPreview,
  getThreadPetVisual,
  type ThreadStatusTone,
} from '../../utils/chatThreadMeta';
import { useAuth } from '../../context/AuthContext';
import { chatThreadParticipantUser } from '../../utils/chatParticipant';

const ROW_AVATAR_SIZE = 48;
const PET_AVATAR_FRAME = getPetAvatarFrameSize(ROW_AVATAR_SIZE);

function statusColor(
  tone: ThreadStatusTone,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (tone) {
    case 'warning': return colors.warning;
    case 'success': return colors.success;
    case 'primary': return colors.primary;
    case 'info': return colors.info;
    default: return colors.textSecondary;
  }
}

export function AdoptionThreadRow({
  thread,
  records,
  onPress,
}: {
  thread: ChatThread;
  records: AdoptionRecord[];
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';
  const participantUser = chatThreadParticipantUser(thread);
  const participantName = participantUser.name;
  const participantHandle = thread.participantHandle ?? thread.participantId.slice(0, 8);
  const meta = getThreadAdoptionMeta(thread, records, currentUserId);
  const petVisual = getThreadPetVisual(thread, records, currentUserId);
  const previewText = getThreadDisplayPreview(thread, records, thread.preview);

  const isUnread = thread.unread > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: isUnread ? colors.primary + '06' : 'transparent' },
        pressed && styles.rowPressed,
      ]}
    >
      <View
        style={[
          styles.avatarWrap,
          {
            width: petVisual ? PET_AVATAR_FRAME.width : ROW_AVATAR_SIZE,
            minHeight: PET_AVATAR_FRAME.height,
          },
        ]}
      >
        {petVisual ? (
          <CompanionAvatar
            pet={{ icon: petVisual.icon, tint: petVisual.tint, name: petVisual.petName }}
            size={ROW_AVATAR_SIZE}
          />
        ) : (
          <Avatar user={participantUser} size={ROW_AVATAR_SIZE} />
        )}
      </View>

      <View style={styles.meta}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.titleLine,
              { color: colors.text, fontWeight: isUnread ? '800' : '700' },
            ]}
            numberOfLines={1}
          >
            {meta?.petName ?? 'Adoption'}
          </Text>
          <View style={styles.trailing}>
            <Text style={[styles.time, { color: colors.textTertiary }]}>{thread.time}</Text>
            {isUnread && (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            )}
          </View>
        </View>

        <Text style={[styles.subline, { color: colors.textSecondary }]} numberOfLines={1}>
          {participantName}
          <Text style={{ color: colors.textTertiary }}> · </Text>
          <Text style={{ color: colors.primary }}>@{participantHandle}</Text>
          {meta ? (
            <Text style={{ color: colors.textTertiary }}> · {meta.roleLabel}</Text>
          ) : null}
        </Text>

        {meta && (
          <Text
            style={[styles.statusLine, { color: statusColor(meta.statusTone, colors) }]}
            numberOfLines={1}
          >
            {meta.statusLabel}
          </Text>
        )}

        <Text
          style={[
            styles.preview,
            {
              color: isUnread ? colors.text : colors.textSecondary,
              fontWeight: isUnread ? '500' : '400',
            },
          ]}
          numberOfLines={2}
        >
          {previewText}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: { opacity: 0.7 },
  avatarWrap: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  meta: { flex: 1, gap: 3, minWidth: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titleLine: { fontSize: 16.5, letterSpacing: -0.2, flex: 1 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  time: { ...typography.meta, fontSize: 12 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  subline: { ...typography.caption, fontSize: 12.5 },
  statusLine: { ...typography.caption, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.1 },
  preview: { ...typography.small, fontSize: 14, lineHeight: 19, marginTop: 1 },
});
