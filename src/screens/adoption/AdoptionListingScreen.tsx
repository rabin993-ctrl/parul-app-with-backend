import React, { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Empty } from '../../components/ui/Empty';
import { Toast, ToastData } from '../../components/ui/Toast';
import { AdoptionListingRow } from '../../components/adoption/AdoptionListingRow';
import { AdoptionOwnerCard } from '../../components/adoption/AdoptionOwnerCard';
import { AdoptionPosterInbox } from '../../components/adoption/AdoptionPosterInbox';
import { AdoptionChatsList, getAdoptionChatSegmentMeta, type ChatSegment } from '../../components/adoption/AdoptionChatsList';
import {
  AdoptionHubBar,
  type AdoptionBrowseFilter,
  type AdoptionHubTab,
} from '../../components/adoption/AdoptionChrome';
import { AdoptionListFab } from '../../components/adoption/AdoptionCreateActions';
import { isActiveAdoptionRequest, useAdoptionFeed } from '../../context/AdoptionFeedContext';
import { useFeedPosts } from '../../context/FeedPostContext';
import { useAuth } from '../../context/AuthContext';
import type { AdoptionListing } from '../../data/adoptionData';
import { useAdoption, type ChatThread } from '../../context/AdoptionContext';
import { canPosterRelistAdoption, getAdoptionRecordForListing } from '../../data/adoptionRecords';
import { performPosterRelist } from '../../utils/adoptionRelist';
import {
  DEFAULT_ADOPTION_FILTERS,
  AdoptionFilters,
  filterAdoptionListings,
} from '../../data/adoptionData';
import { groupThreads } from '../../utils/chatThreadMeta';
import { ChatThreadScreen } from '../ChatThreadScreen';
import type { AdoptionStackParamList } from '../../navigation/AdoptionNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';
type Nav = NativeStackNavigationProp<AdoptionStackParamList, 'Listing'>;

export function AdoptionListingScreen({
  embedded = false,
  scrollHeader,
  hubTab: hubTabProp,
  onHubTabChange,
  hubBarPinned = false,
  browseFilter: browseFilterProp,
  onBrowseFilterChange,
  chatSegment,
  onChatSegmentChange,
  chatSegmentBarPinned = false,
}: {
  embedded?: boolean;
  scrollHeader?: React.ReactNode;
  hubTab?: AdoptionHubTab;
  onHubTabChange?: (tab: AdoptionHubTab) => void;
  hubBarPinned?: boolean;
  browseFilter?: AdoptionBrowseFilter;
  onBrowseFilterChange?: (filter: AdoptionBrowseFilter) => void;
  chatSegment?: ChatSegment;
  onChatSegmentChange?: (segment: ChatSegment) => void;
  chatSegmentBarPinned?: boolean;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const {
    listings,
    listingsLoaded,
    requests,
    isSaved,
    toggleSaved,
    rejectRequest,
    relistListing,
    clearRequestOnRelist,
    getRequestsForListing,
    getMyOutgoingRequests,
    attachThreadToRequest,
  } = useAdoptionFeed();
  const {
    threads,
    records,
    ensureAdoptionRequestThread,
    relistAdoptionPlacement,
    dismissAdoptionThread,
  } = useAdoption();
  const { openAdoptionListing } = useFeedPosts();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const listScrollPad = tabBarPad + 48;

  const grouped = useMemo(() => groupThreads(threads, records, user?.id ?? ''), [threads, records, user?.id]);
  const adoptionThreads = useMemo(
    () => [...grouped.action, ...grouped.adoption],
    [grouped],
  );
  const chatSegmentMeta = useMemo(
    () => getAdoptionChatSegmentMeta(adoptionThreads, records, listings, requests, user?.id ?? ''),
    [adoptionThreads, records, listings, requests, user?.id],
  );
  const chatBadgeCount = adoptionThreads.reduce((sum, t) => sum + t.unread, 0) || undefined;

  const [tabInternal, setTabInternal] = useState<AdoptionHubTab>(
    adoptionThreads.length > 0 ? 'threads' : 'discover',
  );
  const tab = hubTabProp ?? tabInternal;
  const setTab = onHubTabChange ?? setTabInternal;
  const [browseFilterInternal, setBrowseFilterInternal] = useState<AdoptionBrowseFilter>('all');
  const browseFilter = browseFilterProp ?? browseFilterInternal;
  const setBrowseFilter = onBrowseFilterChange ?? setBrowseFilterInternal;
  const species: AdoptionFilters['species'] = browseFilter === 'requested' ? 'all' : browseFilter;
  const requestedCount = useMemo(
    () => getMyOutgoingRequests().filter(isActiveAdoptionRequest).length,
    [getMyOutgoingRequests],
  );
  const [filters] = useState<AdoptionFilters>(DEFAULT_ADOPTION_FILTERS);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [inboxListing, setInboxListing] = useState<AdoptionListing | null>(null);

  const listingsShown = useMemo(() => {
    const base = filterAdoptionListings(listings, {
      filters: { ...filters, species },
    });
    if (tab === 'listings') return base.filter(l => l.userId === user?.id);
    // Browse tab: never show the current user's own listings (they're in My Listings)
    const browseable = user?.id ? base.filter(l => l.userId !== user.id) : base;
    if (browseFilter === 'requested') {
      const requestedIds = new Set(
        getMyOutgoingRequests()
          .filter(isActiveAdoptionRequest)
          .map(r => r.listingId),
      );
      return browseable.filter(l => requestedIds.has(l.id));
    }
    return browseable;
  }, [listings, filters, species, browseFilter, tab, user?.id, getMyOutgoingRequests]);

  const inboxRequests = useMemo(
    () => (inboxListing ? getRequestsForListing(inboxListing.id) : []),
    [inboxListing, getRequestsForListing, listings],
  );

  const openChatForRequest = (req: {
    id: string;
    requesterId: string;
    requesterName: string;
    listingId: string;
    listingName: string;
    message: string;
    status: string;
    threadId?: string;
  }, listing?: AdoptionListing | null) => {
    const thread = ensureAdoptionRequestThread({
      listingId: req.listingId,
      peerId: req.requesterId,
      threadId: req.threadId,
    });
    if (!req.threadId) {
      attachThreadToRequest(req.id, thread.id);
    }

    setInboxListing(null);
    setActiveThread(thread);
  };

  const handleCreateListing = () => {
    if (embedded) {
      openAdoptionListing();
      return;
    }
    navigation.navigate('CreatePost');
  };

  const listHeader = (
    <View>
      {scrollHeader}
      {!hubBarPinned && (
        <AdoptionHubBar
          tab={tab}
          onTabChange={setTab}
          browseFilter={browseFilter}
          onBrowseFilterChange={setBrowseFilter}
          requestedCount={requestedCount}
          chatUrgent={chatSegmentMeta.adoptingUrgent}
          chatBadgeCount={chatBadgeCount}
        />
      )}
    </View>
  );

  if (!listingsLoaded) {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
        {!hubBarPinned ? listHeader : scrollHeader}
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
        <AdoptionListFab onPress={handleCreateListing} />
      </View>
    );
  }

  if (tab === 'threads') {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
        {listHeader}
        {adoptionThreads.length === 0 ? (
          <View style={[styles.listEmpty, { paddingBottom: tabBarPad }]}>
            <Empty
              icon="comment"
              title="No adoption chats yet"
              body="Browse pets to send a request, or list a pet to hear from adopters. Conversations will show up here."
            />
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={[{ id: 'chats' }]}
            keyExtractor={() => 'chats'}
            nestedScrollEnabled={embedded}
            contentContainerStyle={[
              styles.listContent,
              styles.hubListPad,
              { paddingBottom: listScrollPad },
            ]}
            showsVerticalScrollIndicator={false}
            {...tabBarScrollProps}
            renderItem={() => (
              <AdoptionChatsList
                key="adoption-chats"
                threads={adoptionThreads}
                records={records}
                listings={listings}
                requests={requests}
                onOpenThread={setActiveThread}
                segment={chatSegment}
                onSegmentChange={onChatSegmentChange}
                segmentBarPinned={chatSegmentBarPinned}
              />
            )}
          />
        )}

        <Modal visible={!!activeThread} animationType="slide" onRequestClose={() => setActiveThread(null)}>
          {activeThread && (
            <ChatThreadScreen
              thread={activeThread}
              onClose={() => {
                setActiveThread(null);
                setTab('threads');
              }}
            />
          )}
        </Modal>

        <AdoptionListFab onPress={handleCreateListing} />
      </View>
    );
  }

  const renderBrowseItem = ({ item }: { item: AdoptionListing }) => {
    if (tab === 'listings') {
      const reqs = getRequestsForListing(item.id);
      const adoptionRecord = getAdoptionRecordForListing(records, item.id);
      const canRelist = item.status === 'Adopted'
        && adoptionRecord
        && canPosterRelistAdoption(adoptionRecord);
      return (
        <AdoptionOwnerCard
          listing={item}
          requestCount={reqs.length}
          onManageRequests={() => setInboxListing(item)}
          onEdit={() => navigation.navigate('EditPost', { listingId: item.id })}
          onRelist={canRelist && adoptionRecord ? () => {
            const ok = performPosterRelist(
              adoptionRecord,
              relistAdoptionPlacement,
              relistListing,
              clearRequestOnRelist,
            );
            if (!ok) return;
            if (activeThread?.adoptionRecordId === adoptionRecord.id
              || activeThread?.id === adoptionRecord.chatThreadId) {
              setActiveThread(null);
            }
            setToast({
              msg: `${item.name} is live for adoption again`,
              icon: 'adoption',
              tone: 'success',
            });
          } : undefined}
        />
      );
    }

    return (
      <AdoptionListingRow
        listing={item}
        saved={isSaved(item.id)}
        onPress={() => navigation.navigate('Detail', { listingId: item.id })}
        onSave={() => toggleSaved(item.id)}
      />
    );
  };

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <FlatList
        style={styles.list}
        data={listingsShown}
        keyExtractor={l => l.id}
        nestedScrollEnabled={embedded}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.hubListPad,
          tab === 'discover' && styles.discoverList,
          { paddingBottom: listScrollPad },
          listingsShown.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
        renderItem={renderBrowseItem}
        ListEmptyComponent={
          <Empty
            icon="adoption"
            title={
              tab === 'listings' ? 'No listings yet'
                : browseFilter === 'requested' ? 'No requested pets'
                  : 'No pets match'
            }
            body={
              tab === 'listings'
                ? 'Tap List a pet below to create your first adoption listing.'
                : browseFilter === 'requested'
                  ? 'Request a pet from Browse and they\'ll show up here.'
                  : 'Try a different species filter.'
            }
          />
        }
      />

      <AdoptionPosterInbox
        visible={!!inboxListing}
        listing={inboxListing}
        requests={inboxRequests}
        onClose={() => setInboxListing(null)}
        onReject={(id) => {
          const req = inboxRequests.find(r => r.id === id);
          rejectRequest(id);
          if (req?.threadId) {
            dismissAdoptionThread(req.threadId);
            if (activeThread?.id === req.threadId) {
              setActiveThread(null);
            }
          }
          setToast({ msg: 'Applicant passed', icon: 'close', tone: 'primary' });
        }}
        onOpenChat={(req) => openChatForRequest(req, inboxListing)}
      />

      <Modal visible={!!activeThread} animationType="slide" onRequestClose={() => setActiveThread(null)}>
        {activeThread && (
          <ChatThreadScreen
            thread={activeThread}
            onClose={() => {
              setActiveThread(null);
              setTab('threads');
            }}
          />
        )}
      </Modal>

      <Toast data={toast} onHide={() => setToast(null)} />
      <AdoptionListFab onPress={handleCreateListing} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, position: 'relative' },
  list: { flex: 1 },
  listContent: {},
  discoverList: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  hubListPad: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listEmpty: { flexGrow: 1, justifyContent: 'center', minHeight: 200 },
});
