import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';
import { CompanionAvatar } from '../ui/Avatar';
import { getPetAvatarFrameSize } from '../ui/PawPadShape';
import type { ChatThread } from '../../context/AdoptionContext';
import type { AdoptionRecord } from '../../data/adoptionRecords';
import type { AdoptionListing } from '../../data/adoptionData';
import type { AdoptionRequest } from '../../context/AdoptionFeedContext';
import {
  categorizeAdoptionChatSections,
  chatSublineAccentColor,
  getThreadChatDisplay,
  type AdoptionChatGroup,
  type AdoptionChatSectionItem,
  type ChatSublineTone,
} from '../../utils/chatThreadMeta';

const PET_HEADER_AVATAR = 32;
const PET_HEADER_FRAME = getPetAvatarFrameSize(PET_HEADER_AVATAR);

export type ChatSegment = 'listed' | 'adopting';

const SEGMENT_LABELS: Record<ChatSegment, string> = {
  listed: 'Rehoming',
  adopting: 'Adopting',
};

const INDICATOR_H = 3;
const INDICATOR_INSET = 10;

function statusTagColors(
  tone: ChatSublineTone,
  colors: ReturnType<typeof useTheme>['colors'],
) {
  const text = chatSublineAccentColor(tone, colors);
  switch (tone) {
    case 'warning': return { bg: colors.warningBg, text };
    case 'success': return { bg: colors.successBg, text };
    case 'primary': return { bg: colors.infoBg, text };
    default: return { bg: colors.surface2, text };
  }
}

function StatusTag({ label, tone }: { label: string; tone: ChatSublineTone }) {
  const { colors } = useTheme();
  const tag = statusTagColors(tone, colors);
  return (
    <View style={[styles.statusTag, { backgroundColor: tag.bg }]}>
      <Text style={[styles.statusTagText, { color: tag.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function CompactChatRow({
  thread,
  group,
  records,
  listings,
  requests,
  mode,
  nested,
  currentUserId,
  onPress,
}: {
  thread: ChatThread;
  group: AdoptionChatGroup;
  records: AdoptionRecord[];
  listings: AdoptionListing[];
  requests: AdoptionRequest[];
  mode: ChatSegment;
  nested?: boolean;
  currentUserId: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const display = getThreadChatDisplay(thread, records, listings, requests, group, currentUserId);
  if (!display) return null;

  const peerName = thread.participantName ?? display.title;
  const peerHandle = thread.participantHandle;

  let title: string;
  let subline: string | null = null;

  if (mode === 'listed') {
    if (nested) {
      title = peerName;
    } else {
      title = group.petName;
      subline = peerName ? `with ${peerName.split(' ')[0]}` : null;
    }
  } else if (nested) {
    title = peerName;
  } else {
    title = display.title;
    subline = peerHandle ? `from @${peerHandle}` : null;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chatRow,
        nested && styles.chatRowNested,
        { borderBottomColor: colors.border, opacity: pressed ? 0.72 : 1 },
        Platform.OS === 'web' && styles.chatRowWeb,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        mode === 'listed' && nested
          ? `Open chat with ${title}`
          : `Open chat about ${title}`
      }
    >
      <View style={styles.chatMeta}>
        <View style={styles.titleRow}>
          <Text style={[styles.chatTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          {display.sublineAccent ? (
            <StatusTag label={display.sublineAccent} tone={display.sublineTone} />
          ) : null}
        </View>
        {subline ? (
          <Text style={[styles.chatSubline, { color: colors.textTertiary }]} numberOfLines={1}>
            {subline}
          </Text>
        ) : null}
      </View>
      {display.isUnread ? (
        <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
      ) : null}
    </Pressable>
  );
}

function PetChatGroup({
  group,
  threads,
  records,
  listings,
  requests,
  mode,
  currentUserId,
  onOpenThread,
}: {
  group: AdoptionChatGroup;
  threads: ChatThread[];
  records: AdoptionRecord[];
  listings: AdoptionListing[];
  requests: AdoptionRequest[];
  mode: ChatSegment;
  currentUserId: string;
  onOpenThread: (thread: ChatThread) => void;
}) {
  const { colors } = useTheme();
  const showPetHeader = threads.length > 1;

  return (
    <View style={styles.petGroup}>
      {showPetHeader ? (
        <View style={styles.petHead}>
          {group.petVisual ? (
            <View style={[styles.petHeadAvatar, { width: PET_HEADER_FRAME.width }]}>
              <CompanionAvatar
                pet={{
                  icon: group.petVisual.icon,
                  tint: group.petVisual.tint,
                  name: group.petVisual.petName,
                }}
                size={PET_HEADER_AVATAR}
              />
            </View>
          ) : null}
          <Text style={[styles.petHeadName, { color: colors.text }]} numberOfLines={1}>
            {group.petName}
          </Text>
        </View>
      ) : null}

      {threads.map(thread => (
        <CompactChatRow
          key={thread.id}
          thread={thread}
          group={group}
          records={records}
          listings={listings}
          requests={requests}
          mode={mode}
          nested={showPetHeader}
          currentUserId={currentUserId}
          onPress={() => onOpenThread(thread)}
        />
      ))}
    </View>
  );
}

function ChatSectionItems({
  items,
  records,
  listings,
  requests,
  onOpenThread,
  mode,
  currentUserId,
}: {
  items: AdoptionChatSectionItem[];
  records: AdoptionRecord[];
  listings: AdoptionListing[];
  requests: AdoptionRequest[];
  onOpenThread: (thread: ChatThread) => void;
  mode: ChatSegment;
  currentUserId: string;
}) {
  return (
    <>
      {items.map((item, itemIndex) => {
        if (item.kind === 'pet-group') {
          return (
            <PetChatGroup
              key={`${item.group.key}-${itemIndex}`}
              group={item.group}
              threads={item.threads}
              records={records}
              listings={listings}
              requests={requests}
              mode={mode}
              currentUserId={currentUserId}
              onOpenThread={onOpenThread}
            />
          );
        }

        return (
          <CompactChatRow
            key={item.thread.id}
            thread={item.thread}
            group={item.group}
            records={records}
            listings={listings}
            requests={requests}
            mode={mode}
            currentUserId={currentUserId}
            onPress={() => onOpenThread(item.thread)}
          />
        );
      })}
    </>
  );
}

export function getAdoptionChatSegmentMeta(
  threads: ChatThread[],
  records: AdoptionRecord[],
  listings: AdoptionListing[],
  requests: AdoptionRequest[],
  currentUserId: string,
) {
  const sections = categorizeAdoptionChatSections(threads, records, listings, requests, currentUserId);
  const listedItems = sections.find(s => s.id === 'my-listings')?.items ?? [];
  const actionItems = sections.find(s => s.id === 'action')?.items ?? [];
  const adoptingItems = sections.find(s => s.id === 'adopting')?.items ?? [];
  const hasListed = listedItems.length > 0;
  const hasAdopting = actionItems.length > 0 || adoptingItems.length > 0;

  return {
    sections,
    listedItems,
    actionItems,
    adoptingItems,
    showSegmentBar: hasListed || hasAdopting,
    adoptingUrgent: actionItems.length > 0,
    fallbackSegment: (hasAdopting ? 'adopting' : 'listed') as ChatSegment,
  };
}

export function ChatSegmentBar({
  value,
  onChange,
  adoptingUrgent,
  pinned = false,
}: {
  value: ChatSegment;
  onChange: (segment: ChatSegment) => void;
  adoptingUrgent: boolean;
  /** Hub chrome — no bottom margin. */
  pinned?: boolean;
}) {
  const { colors } = useTheme();
  const [rowWidth, setRowWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const segments: ChatSegment[] = ['adopting', 'listed'];

  const activeIndex = Math.max(0, segments.indexOf(value));
  const segmentW = rowWidth > 0 ? rowWidth / segments.length : 0;
  const indicatorW = Math.max(0, segmentW - INDICATOR_INSET * 2);
  const targetX = segmentW * activeIndex + INDICATOR_INSET;

  useEffect(() => {
    if (rowWidth <= 0) return;
    Animated.timing(translateX, {
      toValue: targetX,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [targetX, rowWidth, translateX]);

  return (
    <View
      style={[styles.segmentBar, pinned && styles.segmentBarPinned]}
      onLayout={e => setRowWidth(e.nativeEvent.layout.width)}
    >
      {rowWidth > 0 && indicatorW > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segmentIndicator,
            {
              width: indicatorW,
              backgroundColor: colors.primary,
              transform: [{ translateX }],
            },
          ]}
        />
      )}
      {segments.map(segment => {
        const active = value === segment;
        const showDot = segment === 'adopting' && adoptingUrgent;
        return (
          <Pressable
            key={segment}
            onPress={() => onChange(segment)}
            style={[styles.segmentBtn, Platform.OS === 'web' && styles.segmentBtnWeb]}
            accessibilityRole="tab"
            accessibilityState={active ? { selected: true } : {}}
          >
            <Text
              style={[
                styles.segmentLabel,
                { color: active ? colors.text : colors.textTertiary },
              ]}
            >
              {SEGMENT_LABELS[segment]}
            </Text>
            {showDot ? (
              <View style={[styles.segmentDot, { backgroundColor: colors.warning }]} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function AdoptionChatsList({
  threads,
  records,
  listings,
  requests,
  onOpenThread,
  segment: segmentProp,
  onSegmentChange,
  segmentBarPinned = false,
}: {
  threads: ChatThread[];
  records: AdoptionRecord[];
  listings: AdoptionListing[];
  requests: AdoptionRequest[];
  onOpenThread: (thread: ChatThread) => void;
  segment?: ChatSegment;
  onSegmentChange?: (segment: ChatSegment) => void;
  /** Segment tabs live in pinned hub chrome — hide the in-list bar. */
  segmentBarPinned?: boolean;
}) {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';
  const {
    sections,
    listedItems,
    actionItems,
    adoptingItems,
    showSegmentBar,
    fallbackSegment,
  } = useMemo(
    () => getAdoptionChatSegmentMeta(threads, records, listings, requests, currentUserId),
    [threads, records, listings, requests, currentUserId],
  );

  const [segmentInternal, setSegmentInternal] = useState<ChatSegment>('adopting');
  const segment = segmentProp ?? segmentInternal;
  const setSegment = onSegmentChange ?? setSegmentInternal;

  if (sections.length === 0) return null;

  const activeSegment = showSegmentBar ? segment : fallbackSegment;

  return (
    <View>
      {showSegmentBar && !segmentBarPinned ? (
        <ChatSegmentBar
          value={segment}
          onChange={setSegment}
          adoptingUrgent={actionItems.length > 0}
        />
      ) : null}

      {activeSegment === 'listed' ? (
        <ChatSectionItems
          items={listedItems}
          records={records}
          listings={listings}
          requests={requests}
          onOpenThread={onOpenThread}
          mode="listed"
          currentUserId={currentUserId}
        />
      ) : (
        <View>
          {actionItems.length > 0 ? (
            <>
              <ChatSectionItems
                items={actionItems}
                records={records}
                listings={listings}
                requests={requests}
                onOpenThread={onOpenThread}
                mode="adopting"
                currentUserId={currentUserId}
              />
              {adoptingItems.length > 0 ? (
                <View style={styles.sectionSplit} />
              ) : null}
            </>
          ) : null}
          <ChatSectionItems
            items={adoptingItems}
            records={records}
            listings={listings}
            requests={requests}
            onOpenThread={onOpenThread}
            mode="adopting"
            currentUserId={currentUserId}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  segmentBar: {
    flexDirection: 'row',
    marginBottom: 14,
    position: 'relative',
  },
  segmentBarPinned: {
    marginBottom: 0,
  },
  segmentIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: INDICATOR_H,
    borderRadius: INDICATOR_H / 2,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 8,
  },
  segmentBtnWeb: { cursor: 'pointer' as const },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  segmentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  petGroup: {
    marginBottom: 4,
  },
  petHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 6,
  },
  petHeadAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  petHeadName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chatRowNested: {
    paddingLeft: 16,
  },
  chatRowWeb: { cursor: 'pointer' as const },
  chatMeta: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  chatTitle: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  chatSubline: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  statusTag: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
    maxWidth: 140,
  },
  statusTagText: {
    ...typography.caption,
    fontSize: 11.5,
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  sectionSplit: {
    height: 8,
  },
});
