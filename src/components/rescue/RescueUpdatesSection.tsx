import React, { useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, typography } from '../../theme/tokens';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import { PhotoViewerModal } from '../ui/PhotoViewerModal';
import { RescueUpdateMedia } from './RescueUpdateMedia';
import type { RescueUpdate } from '../../data/profileData';
import {
  groupRescueUpdatesByDay,
  rescueUpdateClock,
} from '../../utils/rescueUpdateGroups';

const LONG_TEXT_LINES = 4;

function UpdateEntry({
  update,
  tint,
  isLastInGroup,
  isLastOverall,
  onImagePress,
}: {
  update: RescueUpdate;
  tint: string;
  isLastInGroup: boolean;
  isLastOverall: boolean;
  onImagePress: (urls: string[], index: number, caption: string) => void;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const mediaUrls = update.mediaUrls ?? [];
  const caption = update.text?.trim();
  const showExpand = truncated && !expanded;

  return (
    <View style={styles.entryRow}>
      <View style={styles.railCol}>
        <View style={[styles.railDot, { backgroundColor: tint + '18', borderColor: tint + '55' }]}>
          <Icon name="shield" size={10} color={tint} sw={2.2} />
        </View>
        {!isLastOverall ? (
          <View
            style={[
              styles.railStem,
              { backgroundColor: isLastInGroup ? 'transparent' : colors.border },
            ]}
          />
        ) : null}
      </View>

      <View style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.entryTime, { color: colors.textTertiary }]}>
          {rescueUpdateClock(update.time)}
        </Text>

        {caption ? (
          <>
            <Text
              style={[styles.entryText, { color: colors.text }]}
              numberOfLines={expanded ? undefined : LONG_TEXT_LINES}
              onTextLayout={e => {
                if (!expanded && !truncated && e.nativeEvent.lines.length >= LONG_TEXT_LINES) {
                  setTruncated(true);
                }
              }}
            >
              {caption}
            </Text>
            {showExpand ? (
              <Pressable onPress={() => setExpanded(true)} hitSlop={4}>
                <Text style={[styles.readMore, { color: colors.primary }]}>Read more</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        {mediaUrls.length > 0 ? (
          <RescueUpdateMedia
            urls={mediaUrls}
            onPressImage={index => onImagePress(mediaUrls, index, caption ?? '')}
          />
        ) : update.photoCount && update.photoCount > 0 ? (
          <View style={[styles.mediaPending, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
            <Text style={[styles.mediaPendingText, { color: colors.textTertiary }]}>
              Photo processing…
            </Text>
          </View>
        ) : null}

        {!caption && mediaUrls.length === 0 && !(update.photoCount && update.photoCount > 0) ? (
          <Text style={[styles.entryText, { color: colors.textTertiary, fontStyle: 'italic' }]}>
            Update posted
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function RescueUpdatesSection({
  updates,
  caseName,
  tint,
  isOwner,
  onPostUpdate,
}: {
  updates: RescueUpdate[];
  caseName: string;
  tint: string;
  isOwner?: boolean;
  onPostUpdate?: () => void;
}) {
  const { colors } = useTheme();
  const [viewer, setViewer] = useState<{
    images: string[];
    initialIndex: number;
    caption: string;
  } | null>(null);

  const grouped = useMemo(() => groupRescueUpdatesByDay(updates), [updates]);
  const flatEntries = useMemo(
    () => grouped.flatMap(g => g.updates.map((update, i) => ({
      update,
      group: g.group,
      isFirstInGroup: i === 0,
      isLastInGroup: i === g.updates.length - 1,
    }))),
    [grouped],
  );

  const openViewer = (urls: string[], index: number, caption: string) => {
    setViewer({ images: urls, initialIndex: index, caption });
  };

  return (
    <View style={[styles.section, { borderTopColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>Case updates</Text>
            <View style={[styles.countPill, { backgroundColor: colors.surface2 }]}>
              <Text style={[styles.countText, { color: colors.textSecondary }]}>{updates.length}</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            {`Latest from ${caseName}'s rescue team`}
          </Text>
        </View>
        {isOwner && onPostUpdate ? (
          <Button variant="outline" size="sm" icon="plus" onPress={onPostUpdate}>
            Post update
          </Button>
        ) : null}
      </View>

      {updates.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.successBg }]}>
            <Icon name="shield" size={22} color={colors.success} sw={2.2} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No updates yet</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            {isOwner
              ? `Share photos and notes so followers can track ${caseName}'s progress.`
              : 'Follow this case to hear when new updates are posted.'}
          </Text>
          {isOwner && onPostUpdate ? (
            <Button variant="primary" size="sm" icon="plus" onPress={onPostUpdate}>
              Share first update
            </Button>
          ) : null}
        </View>
      ) : (
        <View style={styles.feed}>
          {grouped.map((group, groupIndex) => (
            <View key={group.group} style={styles.groupBlock}>
              <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{group.group}</Text>
              {group.updates.map((update, entryIndex) => {
                const globalIndex = flatEntries.findIndex(e => e.update.id === update.id);
                const isLastOverall = globalIndex === flatEntries.length - 1;
                return (
                  <UpdateEntry
                    key={update.id}
                    update={update}
                    tint={tint}
                    isLastInGroup={entryIndex === group.updates.length - 1}
                    isLastOverall={isLastOverall}
                    onImagePress={openViewer}
                  />
                );
              })}
              {groupIndex < grouped.length - 1 ? (
                <View style={[styles.groupSpacer, { backgroundColor: colors.border }]} />
              ) : null}
            </View>
          ))}

          <View style={styles.endMarker}>
            <Icon name="paw" size={12} color={colors.textTertiary} sw={2} />
            <Text style={[styles.endMarkerText, { color: colors.textTertiary }]}>
              {`You're caught up on ${caseName}'s case`}
            </Text>
          </View>
        </View>
      )}

      <PhotoViewerModal
        visible={viewer != null}
        images={viewer?.images ?? []}
        initialIndex={viewer?.initialIndex ?? 0}
        caption={viewer?.caption}
        onClose={() => setViewer(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 16,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...typography.title,
    fontSize: 16,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  feed: {
    gap: 8,
  },
  groupBlock: {
    gap: 10,
  },
  groupSpacer: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 6,
    opacity: 0.6,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  entryRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  railCol: {
    width: 24,
    alignItems: 'center',
  },
  railDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  railStem: {
    width: 2,
    flex: 1,
    minHeight: 12,
    marginTop: 4,
    borderRadius: 1,
  },
  entryCard: {
    flex: 1,
    minWidth: 0,
    gap: 10,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  entryTime: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  entryText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  readMore: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: -4,
  },
  mediaPending: {
    height: 120,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPendingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
  },
  endMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 16,
    paddingBottom: 4,
  },
  endMarkerText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
