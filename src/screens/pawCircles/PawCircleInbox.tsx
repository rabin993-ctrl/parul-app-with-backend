import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, TextInput,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { radius, spacing, typography } from '../../theme/tokens';
import { Icon } from '../../components/icons/Icon';
import { InboxFilterBar } from '../../components/inbox/InboxFilterBar';
import { NeedsYouSection } from '../../components/inbox/NeedsYouSection';
import {
  UnifiedAdoptionRow,
  UnifiedCircleRow,
  UnifiedDmRow,
} from '../../components/inbox/UnifiedInboxRow';
import { useAdoption, type ChatThread } from '../../context/AdoptionContext';
import type { AdoptionListing } from '../../data/adoptionData';
import type { AdoptionRequest } from '../../context/AdoptionFeedContext';
import { useAuth } from '../../context/AuthContext';
import { groupThreads } from '../../utils/chatThreadMeta';
import {
  buildUnifiedInboxItems,
  collectNeedsYouAdoptionItems,
} from '../../utils/unifiedInbox';
import { PawCircle } from '../../data/pawCircles';
import { useCirclePreviews } from '../../hooks/useCirclePreviews';
import { usePawCircles } from '../../context/PawCircleContext';
import { PawCircleSectionLabel } from './PawCircleChrome';
import type { PawCircleInboxFilter } from '../../navigation/pawCircleInboxRouting';

export type { PawCircleInboxFilter };

type PawCircleInboxProps = {
  circles: PawCircle[];
  createdIds: Set<string>;
  listings: AdoptionListing[];
  requests: AdoptionRequest[];
  initialFilter?: PawCircleInboxFilter;
  onFilterChange?: (filter: PawCircleInboxFilter) => void;
  onExplore?: () => void;
  onOpenCircleChat: (circleId: string) => void;
  onOpenThread: (thread: ChatThread) => void;
};

export function PawCircleInbox({
  circles,
  createdIds,
  listings,
  requests,
  initialFilter = 'all',
  onFilterChange,
  onExplore,
  onOpenCircleChat,
  onOpenThread,
}: PawCircleInboxProps) {
  const { colors } = useTheme();
  const { threads, records } = useAdoption();
  const { user } = useAuth();
  const { getDbId } = usePawCircles();
  const [filter, setFilter] = useState<PawCircleInboxFilter>(initialFilter);
  const [query, setQuery] = useState('');
  const [needsYouExpanded, setNeedsYouExpanded] = useState(true);
  const currentUserId = user?.id ?? '';

  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const setFilterAndNotify = (next: PawCircleInboxFilter) => {
    setFilter(next);
    onFilterChange?.(next);
  };

  const uniqueCircles = useMemo(() => {
    const seenIds = new Set<string>();
    const seenDbIds = new Set<string>();
    const out: PawCircle[] = [];
    for (const c of circles) {
      if (seenIds.has(c.id)) continue;
      const dbId = getDbId(c.id);
      if (dbId && seenDbIds.has(dbId)) continue;
      seenIds.add(c.id);
      if (dbId) seenDbIds.add(dbId);
      out.push(c);
    }
    return out;
  }, [circles, getDbId]);

  const circleEntries = useMemo(
    () => uniqueCircles.map(c => ({ id: c.id, dbId: getDbId(c.id) ?? '' })),
    [uniqueCircles, getDbId],
  );
  const previews = useCirclePreviews(circleEntries);

  const grouped = useMemo(
    () => groupThreads(threads, records, currentUserId),
    [threads, records, currentUserId],
  );
  const dmThreads = grouped.general;
  const adoptionThreads = useMemo(
    () => [...grouped.action, ...grouped.adoption],
    [grouped],
  );

  const needsYouItems = useMemo(
    () => collectNeedsYouAdoptionItems({
      adoptionThreads,
      records,
      listings,
      requests,
      currentUserId,
    }),
    [adoptionThreads, records, listings, requests, currentUserId],
  );

  const needsYouThreadIds = useMemo(
    () => new Set(needsYouItems.map(i => i.thread.id)),
    [needsYouItems],
  );

  const q = query.trim().toLowerCase();
  const showNeedsYou = needsYouItems.length > 0;
  const useUnifiedList = filter === 'all' || filter === 'unread' || filter === 'adoption';

  const unifiedItems = useMemo(() => {
    if (!useUnifiedList) return [];
    const adoptionOnly = filter === 'adoption';
    return buildUnifiedInboxItems({
      adoptionThreads,
      dmThreads: adoptionOnly ? [] : dmThreads,
      circles: adoptionOnly ? [] : uniqueCircles,
      previews,
      createdIds,
      records,
      listings,
      requests,
      currentUserId,
      excludeThreadIds: showNeedsYou ? needsYouThreadIds : undefined,
      query: q,
      unreadOnly: filter === 'unread',
    });
  }, [
    useUnifiedList,
    filter,
    adoptionThreads,
    dmThreads,
    uniqueCircles,
    previews,
    createdIds,
    records,
    listings,
    requests,
    currentUserId,
    showNeedsYou,
    needsYouThreadIds,
    q,
  ]);

  const filterOptions = useMemo(() => [
    { id: 'all' as const, label: 'All' },
    { id: 'circles' as const, label: 'Circles' },
    { id: 'direct' as const, label: 'People' },
    {
      id: 'adoption' as const,
      label: 'Adoption',
      dot: needsYouItems.length > 0,
    },
    { id: 'unread' as const, label: 'Unread' },
  ], [needsYouItems.length]);

  const filteredCircles = useMemo(() => {
    if (filter !== 'circles') return [];
    let list = uniqueCircles;
    if (q) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(q)
        || c.location.toLowerCase().includes(q)
        || (previews[c.id]?.lastMessage ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [uniqueCircles, filter, q, previews]);

  const filteredDms = useMemo(() => {
    if (filter !== 'direct') return [];
    let list = dmThreads;
    if (q) {
      list = list.filter(t => {
        const name = (t.participantName ?? t.participantId).toLowerCase();
        const handle = (t.participantHandle ?? '').toLowerCase();
        return name.includes(q) || handle.includes(q) || t.preview.toLowerCase().includes(q);
      });
    }
    return list;
  }, [dmThreads, filter, q]);

  const yoursCircles = filteredCircles.filter(c => createdIds.has(c.id));
  const joinedCircles = filteredCircles.filter(c => !createdIds.has(c.id));
  const showCircleSections = yoursCircles.length > 0 && joinedCircles.length > 0;

  const hasListContent = useUnifiedList
    ? unifiedItems.length > 0
    : filter === 'circles'
      ? filteredCircles.length > 0
      : filteredDms.length > 0;

  const showEmpty = !showNeedsYou && !hasListContent;

  const emptyCopy = (() => {
    switch (filter) {
      case 'unread':
        return { title: 'All caught up', body: 'No unread conversations.' };
      case 'adoption':
        return { title: 'No adoption chats', body: 'Browse or list a pet — chats live here.' };
      case 'circles':
        return { title: 'No circles yet', body: 'Create one or explore nearby groups.' };
      case 'direct':
        return { title: 'No messages yet', body: 'Message someone from their profile.' };
      default:
        return { title: 'No conversations', body: 'Adoption chats, circles, and DMs appear here.' };
    }
  })();

  return (
    <View style={styles.wrap}>
      <View style={[styles.searchBar, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
        <Icon name="search" size={17} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search"
          placeholderTextColor={colors.textTertiary}
          style={[styles.searchInput, { color: colors.text }]}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Icon name="close" size={16} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      <InboxFilterBar
        value={filter}
        onChange={setFilterAndNotify}
        options={filterOptions}
      />

      {showNeedsYou ? (
        <NeedsYouSection
          items={needsYouItems}
          expanded={needsYouExpanded}
          onExpandedChange={setNeedsYouExpanded}
          onOpenThread={onOpenThread}
        />
      ) : null}

      {filter === 'circles' && onExplore ? (
        <Pressable
          onPress={onExplore}
          accessibilityRole="button"
          accessibilityLabel="Explore circles"
          style={({ pressed }) => [
            styles.exploreRow,
            pressed && styles.exploreRowPressed,
            Platform.OS === 'web' && styles.exploreRowWeb,
          ]}
        >
          <Icon name="mapPin" size={17} color={colors.primary} />
          <Text style={[styles.exploreText, { color: colors.primary }]}>Explore circles</Text>
          <Icon name="chevronRight" size={16} color={colors.textTertiary} />
        </Pressable>
      ) : null}

      {showEmpty ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface2 }]}>
            <Icon name="send" size={26} color={colors.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{emptyCopy.title}</Text>
          <Text style={[styles.emptyBody, { color: colors.textTertiary }]}>{emptyCopy.body}</Text>
        </View>
      ) : hasListContent ? (
        <View style={styles.list}>
          {useUnifiedList ? unifiedItems.map(item => {
            if (item.kind === 'adoption') {
              return (
                <UnifiedAdoptionRow
                  key={item.key}
                  thread={item.thread}
                  group={item.group}
                  records={records}
                  listings={listings}
                  requests={requests}
                  onPress={() => onOpenThread(item.thread)}
                />
              );
            }
            if (item.kind === 'circle') {
              return (
                <UnifiedCircleRow
                  key={item.key}
                  circle={item.circle}
                  preview={item.preview}
                  isCreated={item.isCreated}
                  onPress={() => onOpenCircleChat(item.circle.id)}
                />
              );
            }
            return (
              <UnifiedDmRow
                key={item.key}
                thread={item.thread}
                onPress={() => onOpenThread(item.thread)}
              />
            );
          }) : null}

          {filter === 'circles' ? (
            showCircleSections ? (
              <>
                <View style={styles.section}>
                  <PawCircleSectionLabel>Yours</PawCircleSectionLabel>
                  {yoursCircles.map(c => (
                    <UnifiedCircleRow
                      key={c.id}
                      circle={c}
                      preview={previews[c.id] ?? { lastMessage: '', lastMessageTime: '', unread: 0 }}
                      isCreated
                      onPress={() => onOpenCircleChat(c.id)}
                    />
                  ))}
                </View>
                <View style={styles.section}>
                  <PawCircleSectionLabel>Joined</PawCircleSectionLabel>
                  {joinedCircles.map(c => (
                    <UnifiedCircleRow
                      key={c.id}
                      circle={c}
                      preview={previews[c.id] ?? { lastMessage: '', lastMessageTime: '', unread: 0 }}
                      isCreated={false}
                      onPress={() => onOpenCircleChat(c.id)}
                    />
                  ))}
                </View>
              </>
            ) : (
              filteredCircles.map(c => (
                <UnifiedCircleRow
                  key={c.id}
                  circle={c}
                  preview={previews[c.id] ?? { lastMessage: '', lastMessageTime: '', unread: 0 }}
                  isCreated={createdIds.has(c.id)}
                  onPress={() => onOpenCircleChat(c.id)}
                />
              ))
            )
          ) : null}

          {filter === 'direct' ? filteredDms.map(thread => (
            <UnifiedDmRow
              key={thread.id}
              thread={thread}
              onPress={() => onOpenThread(thread)}
            />
          )) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === 'web' ? 8 : 6,
  },
  list: { marginTop: -4 },
  exploreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 40,
  },
  exploreRowWeb: { cursor: 'pointer' as const },
  exploreRowPressed: { opacity: 0.72 },
  exploreText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  section: { gap: 2, marginBottom: spacing.sm },
  emptyState: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl2,
    paddingVertical: spacing.xl3,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  emptyBody: { ...typography.small, textAlign: 'center' },
});
