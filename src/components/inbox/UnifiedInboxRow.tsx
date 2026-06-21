import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography, spacing } from '../../theme/tokens';
import { Avatar, CompanionAvatar } from '../ui/Avatar';
import { CircleAvatar } from '../ui/CircleAvatar';
import { CirclePrivacyLockIcon } from '../../screens/pawCircles/PawCircleChrome';
import { Icon } from '../icons/Icon';
import { getPetAvatarFrameSize } from '../ui/PawPadShape';
import type { ChatThread } from '../../context/AdoptionContext';
import type { AdoptionRecord } from '../../data/adoptionRecords';
import type { AdoptionListing } from '../../data/adoptionData';
import type { AdoptionRequest } from '../../context/AdoptionFeedContext';
import type { PawCircle } from '../../data/pawCircles';
import type { CirclePreviewData } from '../../hooks/useCirclePreviews';
import {
  chatSublineAccentColor,
  getThreadChatDisplay,
  getThreadDisplayPreview,
  type AdoptionChatGroup,
  type ChatSublineTone,
} from '../../utils/chatThreadMeta';
import { getRescueHelpContext, isRescueIntroPreview } from '../../utils/rescueHelpChat';
import { chatThreadParticipantUser } from '../../utils/chatParticipant';
import { unreadListRowStyle } from '../../utils/unreadRowStyle';
import { useAuth } from '../../context/AuthContext';

const AVATAR = 48;
const PET_FRAME = getPetAvatarFrameSize(AVATAR);
const CIRCLE_BADGE_ICON = 18;
const CIRCLE_BADGE_SIZE = 22;
const CIRCLE_BADGE_STROKE = 1.9;
const RESCUE_INDICATOR_SIZE = 22;
const RESCUE_INDICATOR_ICON = 13;
const RESCUE_INDICATOR_STROKE = 1.9;
/** Matches `pawCircleStyles.pageScroll` horizontal padding — unread rows bleed to screen edges. */
const LIST_BLEED = spacing.lg;
const ROW_INSET = spacing.lg;

function unreadRowStyle(
  isUnread: boolean,
  colors: { infoBg: string; primary: string },
  groupedBg: string,
  isDark: boolean,
) {
  return unreadListRowStyle({
    isUnread,
    listBleed: LIST_BLEED,
    rowInset: ROW_INSET,
    isDark,
    groupedBg,
    colors,
  });
}

function StatusChip({ label, tone }: { label: string; tone: ChatSublineTone }) {
  const { colors } = useTheme();
  const text = chatSublineAccentColor(tone, colors);
  let bg = colors.surface2;
  if (tone === 'warning') bg = colors.warningBg;
  else if (tone === 'success') bg = colors.successBg;
  else if (tone === 'primary') bg = colors.infoBg;

  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function RescueIndicator() {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel="Rescue conversation"
      style={[
        styles.rescueIndicator,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      <Icon
        name="shield"
        size={RESCUE_INDICATOR_ICON}
        color={colors.primary}
        sw={RESCUE_INDICATOR_STROKE}
      />
    </View>
  );
}

export function UnifiedAdoptionRow({
  thread,
  group,
  records,
  listings,
  requests,
  onPress,
}: {
  thread: ChatThread;
  group: AdoptionChatGroup;
  records: AdoptionRecord[];
  listings: AdoptionListing[];
  requests: AdoptionRequest[];
  onPress: () => void;
}) {
  const { colors, isDark, groupedBg } = useTheme();
  const { user } = useAuth();
  const display = getThreadChatDisplay(
    thread, records, listings, requests, group, user?.id ?? '',
  );
  if (!display) return null;

  const peerUser = chatThreadParticipantUser(thread);
  const preview = getThreadDisplayPreview(thread, records, thread.preview);
  const isUnread = display.isUnread;
  const hasRescueHelp = !!(thread.rescueContext ?? getRescueHelpContext(thread.id));
  const showChipRow = !!(display.sublineAccent || hasRescueHelp);
  const rescueA11y = hasRescueHelp ? ', with rescue conversation' : '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        unreadRowStyle(isUnread, colors, groupedBg, isDark),
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open adoption chat, ${display.title}${rescueA11y}`}
    >
      <View style={[styles.avatarSlot, { width: PET_FRAME.width, minHeight: PET_FRAME.height }]}>
        {display.usePetAvatar && group.petVisual ? (
          <CompanionAvatar
            pet={{
              icon: group.petVisual.icon,
              tint: group.petVisual.tint,
              name: group.petVisual.petName,
            }}
            size={AVATAR}
          />
        ) : (
          <Avatar user={peerUser} size={AVATAR} showOnlineIndicator />
        )}
      </View>

      <View style={styles.meta}>
        <View style={styles.topRow}>
          <View style={styles.titleWrap}>
            <Text
              style={[styles.title, { color: colors.text, fontWeight: isUnread ? '800' : '700' }]}
              numberOfLines={1}
            >
              {display.title}
            </Text>
            {display.titleSuffix ? (
              <View
                style={[
                  styles.titleSuffixPill,
                  { borderColor: colors.border, backgroundColor: colors.surface2 },
                ]}
              >
                <Text
                  style={[styles.titleSuffixText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {display.titleSuffix}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.trailing}>
            <Text style={[styles.time, { color: colors.textTertiary }]}>{thread.time}</Text>
          </View>
        </View>

        {showChipRow ? (
          <View style={styles.chipRow}>
            {display.sublineAccent ? (
              <StatusChip label={display.sublineAccent} tone={display.sublineTone} />
            ) : null}
            {hasRescueHelp ? <RescueIndicator /> : null}
          </View>
        ) : null}

        <View style={styles.bottomRow}>
          {preview ? (
            <Text
              style={[
                styles.preview,
                {
                  color: isUnread ? colors.text : colors.textTertiary,
                  fontWeight: isUnread ? '500' : '400',
                },
              ]}
              numberOfLines={1}
            >
              {preview}
            </Text>
          ) : null}
          {!showChipRow && isUnread ? (
            <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function UnifiedCircleRow({
  circle,
  preview,
  isCreated,
  onPress,
}: {
  circle: PawCircle;
  preview: CirclePreviewData;
  isCreated: boolean;
  onPress: () => void;
}) {
  const { colors, isDark, groupedBg } = useTheme();
  const isUnread = preview.unread > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        unreadRowStyle(isUnread, colors, groupedBg, isDark),
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.avatarSlot, { width: AVATAR, minHeight: AVATAR }]}>
        <CircleAvatar circle={circle} size={AVATAR} iconSize={22} label={circle.name} />
        <View style={[styles.circleBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Icon name="circles" size={CIRCLE_BADGE_ICON} color={colors.primary} sw={CIRCLE_BADGE_STROKE} />
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.topRow}>
          <View style={styles.titleWrap}>
            <Text
              style={[styles.title, { color: colors.text, fontWeight: isUnread ? '800' : '700' }]}
              numberOfLines={1}
            >
              {circle.name}
            </Text>
            {!isCreated ? <CirclePrivacyLockIcon privacy={circle.privacy} size={13} /> : null}
            {isCreated ? (
              <View style={[styles.rolePill, { backgroundColor: colors.primary + '14' }]}>
                <Text style={[styles.rolePillText, { color: colors.primary }]}>Yours</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.trailing}>
            {preview.lastMessageTime ? (
              <Text style={[styles.time, { color: colors.textTertiary }]}>
                {preview.lastMessageTime}
              </Text>
            ) : null}
            {isUnread ? (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadCount}>
                  {preview.unread > 99 ? '99+' : preview.unread}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

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
          {preview.lastMessage}
        </Text>
      </View>
    </Pressable>
  );
}

export function UnifiedDmRow({
  thread,
  onPress,
}: {
  thread: ChatThread;
  onPress: () => void;
}) {
  const { colors, isDark, groupedBg } = useTheme();
  const peerUser = chatThreadParticipantUser(thread);
  const isUnread = thread.unread > 0;
  const rescueCaseName = thread.rescueContext?.caseName ?? getRescueHelpContext(thread.id)?.caseName;
  const isRescue = !!rescueCaseName;
  const preview = (() => {
    const text = thread.preview ?? '';
    if (isRescue && isRescueIntroPreview(text)) return '';
    return text;
  })();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        unreadRowStyle(isUnread, colors, groupedBg, isDark),
        pressed && styles.rowPressed,
      ]}
    >
      <View style={[styles.avatarSlot, { width: AVATAR, minHeight: AVATAR }]}>
        <Avatar user={peerUser} size={AVATAR} showOnlineIndicator />
      </View>

      <View style={styles.meta}>
        <View style={styles.topRow}>
          <Text
            style={[styles.title, { color: colors.text, fontWeight: isUnread ? '800' : '700' }]}
            numberOfLines={1}
          >
            {peerUser.name}
          </Text>
          <View style={styles.trailing}>
            {thread.muted ? (
              <Icon name="bell-slash" size={13} color={colors.textTertiary} />
            ) : null}
            <Text style={[styles.time, { color: colors.textTertiary }]}>{thread.time}</Text>
            {isUnread ? (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadCount}>{thread.unread > 99 ? '99+' : thread.unread}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {isRescue ? (
          <View style={styles.chipRow}>
            <RescueIndicator />
          </View>
        ) : null}

        {preview ? (
          <Text
            style={[
              styles.preview,
              {
                color: isUnread ? colors.text : colors.textSecondary,
                fontWeight: isUnread ? '500' : '400',
              },
            ]}
            numberOfLines={1}
          >
            {preview}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: ROW_INSET,
    paddingVertical: 13,
  },
  rowPressed: { opacity: 0.72 },
  avatarSlot: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
    flexShrink: 0,
    position: 'relative',
  },
  circleBadge: {
    position: 'absolute',
    right: -2,
    bottom: -1,
    width: CIRCLE_BADGE_SIZE,
    height: CIRCLE_BADGE_SIZE,
    borderRadius: CIRCLE_BADGE_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleAvatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, gap: 2, minWidth: 0 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  title: { fontSize: 16, letterSpacing: -0.2, flexShrink: 1 },
  titleSuffixPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  titleSuffixText: {
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: -0.05,
  },
  subline: { ...typography.caption, fontSize: 12.5 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 1,
  },
  preview: { ...typography.small, fontSize: 14, lineHeight: 19, flex: 1 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  time: { ...typography.meta, fontSize: 12 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  rescueIndicator: {
    width: RESCUE_INDICATOR_SIZE,
    height: RESCUE_INDICATOR_SIZE,
    borderRadius: RESCUE_INDICATOR_SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    flexShrink: 0,
    maxWidth: 120,
  },
  chipText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: { color: '#fff', fontSize: 11, fontWeight: '700', lineHeight: 13 },
  rolePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    flexShrink: 0,
  },
  rolePillText: { fontSize: 10.5, fontWeight: '700' },
});
