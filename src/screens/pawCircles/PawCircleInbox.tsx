import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Platform, TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  buildRescueInboxItems,
  buildUnifiedInboxItems,
  collectAdoptionInboxActionSections,
  filterDmThreadsOverlappingAdoption,
} from '../../utils/unifiedInbox';
import { sortCirclesByRecency, sortThreadsByRecency } from '../../utils/inboxRecency';
import { PawCircle } from '../../data/pawCircles';
import { useCirclePreviewMap } from '../../context/CirclePreviewContext';
import { usePawCircles } from '../../context/PawCircleContext';
import { PawCircleSectionLabel } from './PawCircleChrome';
import type { PawCircleInboxFilter } from '../../navigation/pawCircleInboxRouting';
import { getRescueContextForInbox, getRescueHelpContext, isRescueHelpThread } from '../../utils/rescueHelpChat';
import { refreshUserPrivacyFlags } from '../../lib/userPrivacyFlagCache';

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
  onReviewListingRequests?: (listing: AdoptionListing) => void;
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
  onReviewListingRequests,
}: PawCircleInboxProps) {
  const { colors } = useTheme();
  const { threads, records, messages } = useAdoption();
  const { user } = useAuth();
  const { getDbId } = usePawCircles();
  const [filter, setFilter] = useState<PawCircleInboxFilter>(initialFilter);
  const [query, setQuery] = useState('');
  const [requestsExpanded, setRequestsExpanded] = useState(true);
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

  const previews = useCirclePreviewMap();

  const grouped = useMemo(
    () => groupThreads(threads, records, currentUserId),
    [threads, records, currentUserId],
  );
  const dmThreads = grouped.general;
  const peerIds = useMemo(
    () => [...new Set(dmThreads.map(t => t.participantId).filter(Boolean))],
    [dmThreads],
  );

  useFocusEffect(
    useCallback(() => {
      if (peerIds.length === 0) return;
      void refreshUserPrivacyFlags(peerIds);
    }, [peerIds.join(',')]),
  );

  const rescueDmThreads = useMemo(
    () => dmThreads.map(t => {
      const ctx = getRescueContextForInbox(t, messages[t.id]);
      return ctx ? { ...t, rescueContext: ctx } : t;
    }),
    [dmThreads, messages],
  );
  const adoptionThreads = useMemo(
    () => [...grouped.action, ...grouped.adoption],
    [grouped],
  );

  const rescueContextByPeer = useMemo(() => {
    const map = new Map<string, NonNullable<ChatThread['rescueContext']>>();
    for (const t of [...rescueDmThreads, ...adoptionThreads]) {
      const ctx = t.rescueContext
        ?? getRescueContextForInbox(t, messages[t.id])
        ?? getRescueHelpContext(t.id);
      if (ctx && !map.has(t.participantId)) {
        map.set(t.participantId, ctx);
      }
    }
    return map;
  }, [rescueDmThreads, adoptionThreads, messages]);

  const enrichThreadRescueContext = (thread: ChatThread): ChatThread => {
    const ctx = thread.rescueContext
      ?? rescueContextByPeer.get(thread.participantId);
    return ctx ? { ...thread, rescueContext: ctx } : thread;
  };

  const { pendingRequests, actionItems } = useMemo(
    () => collectAdoptionInboxActionSections({
      adoptionThreads,
      records,
      listings,
      requests,
      currentUserId,
    }),
    [adoptionThreads, records, listings, requests, currentUserId],
  );

  const needsYouThreadIds = useMemo(
    () => new Set(
      actionItems
        .filter((item): item is Extract<typeof actionItems[number], { kind: 'thread' }> => item.kind === 'thread')
        .map(i => i.thread.id),
    ),
    [actionItems],
  );

  const q = query.trim().toLowerCase();
  const showPendingRequests = pendingRequests.length > 0;
  const showNeedsYou = actionItems.length > 0;
  const showActionSections = showPendingRequests || showNeedsYou;
  const adoptionActionCount = pendingRequests.length + actionItems.length;
  const useUnifiedList = filter === 'all' || filter === 'unread' || filter === 'adoption';

  const unifiedItems = useMemo(() => {
    if (!useUnifiedList) return [];
    const adoptionOnly = filter === 'adoption';
    return buildUnifiedInboxItems({
      adoptionThreads,
      dmThreads: adoptionOnly ? [] : rescueDmThreads,
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
    rescueDmThreads,
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

  const rescuePeerIds = useMemo(
    () => new Set(rescueContextByPeer.keys()),
    [rescueContextByPeer],
  );

  const rescueInboxParams = useMemo(() => ({
    adoptionThreads,
    dmThreads: rescueDmThreads,
    records,
    listings,
    requests,
    currentUserId,
    rescuePeerIds,
    isRescueDmThread: (t: ChatThread) => isRescueHelpThread(t, messages[t.id]),
  }), [
    adoptionThreads,
    rescueDmThreads,
    records,
    listings,
    requests,
    currentUserId,
    rescuePeerIds,
    messages,
  ]);

  const rescueUnreadCount = useMemo(
    () => buildRescueInboxItems(rescueInboxParams).filter(item => item.thread.unread > 0).length,
    [rescueInboxParams],
  );

  const filterOptions = useMemo(() => [
    { id: 'all' as const, label: 'All' },
    { id: 'circles' as const, label: 'Circles' },
    { id: 'unread' as const, label: 'Unread' },
    {
      id: 'rescue' as const,
      label: 'Rescue',
      dot: rescueUnreadCount > 0,
    },
    {
      id: 'adoption' as const,
      label: 'Adoption',
      dot: adoptionActionCount > 0,
    },
    { id: 'direct' as const, label: 'People' },
  ], [adoptionActionCount, rescueUnreadCount]);

  const filteredCircles = useMemo(() => {
    if (filter !== 'circles') return [];
    let list = uniqueCircles;
    if (q) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(q)
        || (c.location ?? '').toLowerCase().includes(q)
        || (previews[c.id]?.lastMessage ?? '').toLowerCase().includes(q),
      );
    }
    return sortCirclesByRecency(list, previews);
  }, [uniqueCircles, filter, q, previews]);

  const filteredDms = useMemo(() => {
    if (filter !== 'direct') return [];
    let list = filterDmThreadsOverlappingAdoption(
      rescueDmThreads.filter(t => !isRescueHelpThread(t, messages[t.id])),
      adoptionThreads,
    );
    if (q) {
      list = list.filter(t => {
        const name = (t.participantName ?? t.participantId).toLowerCase();
        const handle = (t.participantHandle ?? '').toLowerCase();
        return name.includes(q) || handle.includes(q) || (t.preview ?? '').toLowerCase().includes(q);
      });
    }
    return sortThreadsByRecency(list);
  }, [rescueDmThreads, adoptionThreads, filter, q, messages]);

  const filteredRescueItems = useMemo(() => {
    if (filter !== 'rescue') return [];
    return buildRescueInboxItems({ ...rescueInboxParams, query: q });
  }, [filter, rescueInboxParams, q]);

  const yoursCircles = useMemo(
    () => sortCirclesByRecency(filteredCircles.filter(c => createdIds.has(c.id)), previews),
    [filteredCircles, createdIds, previews],
  );
  const joinedCircles = useMemo(
    () => sortCirclesByRecency(filteredCircles.filter(c => !createdIds.has(c.id)), previews),
    [filteredCircles, createdIds, previews],
  );
  const showCircleSections = yoursCircles.length > 0 && joinedCircles.length > 0;

  const hasListContent = useUnifiedList
    ? unifiedItems.length > 0
    : filter === 'circles'
      ? filteredCircles.length > 0
      : filter === 'rescue'
        ? filteredRescueItems.length > 0
        : filteredDms.length > 0;

  const showEmpty = !showActionSections && !hasListContent;

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
      case 'rescue':
        return { title: 'No rescue chats', body: 'Help offers you accept and coordinate here.' };
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

      {showPendingRequests ? (
        <NeedsYouSection
          title="Requests to review"
          items={pendingRequests}
          expanded={requestsExpanded}
          onExpandedChange={setRequestsExpanded}
          onOpenThread={onOpenThread}
          onReviewListingRequests={onReviewListingRequests}
        />
      ) : null}

      {showNeedsYou ? (
        <NeedsYouSection
          title="Needs you"
          items={actionItems}
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
                  thread={enrichThreadRescueContext(item.thread)}
                  group={item.group}
                  records={records}
                  listings={listings}
                  requests={requests}
                  onPress={() => onOpenThread(enrichThreadRescueContext(item.thread))}
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

          {filter === 'rescue' ? filteredRescueItems.map(item => {
            if (item.kind === 'adoption') {
              const thread = enrichThreadRescueContext(item.thread);
              return (
                <UnifiedAdoptionRow
                  key={item.key}
                  thread={thread}
                  group={item.group}
                  records={records}
                  listings={listings}
                  requests={requests}
                  onPress={() => onOpenThread(thread)}
                />
              );
            }
            const thread = enrichThreadRescueContext(item.thread);
            return (
              <UnifiedDmRow
                key={item.key}
                thread={thread}
                onPress={() => onOpenThread(thread)}
              />
            );
          }) : null}
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
