import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Empty } from '../../components/ui/Empty';
import { Toast, ToastData } from '../../components/ui/Toast';
import { FlipAdoptionCard } from '../../components/adoption/FlipAdoptionCard';
import { AdoptionOwnerCard } from '../../components/adoption/AdoptionOwnerCard';
import { AdoptionPosterInbox } from '../../components/adoption/AdoptionPosterInbox';
import { AdoptionChatsList, type ChatSegment } from '../../components/adoption/AdoptionChatsList';
import {
  AdoptionHubBar,
  type AdoptionBrowseFilter,
  type AdoptionHubTab,
} from '../../components/adoption/AdoptionChrome';
import { isActiveAdoptionRequest, useAdoptionFeed } from '../../context/AdoptionFeedContext';
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
  const navigation = useNavigation<Nav>();
  const {
    listings,
    requests,
    submitRequest,
    rejectRequest,
    relistListing,
    clearRequestOnRelist,
    getRequestsForListing,
    getRequestForListing,
    getMyOutgoingRequests,
    attachThreadToRequest,
    cancelRequest,
  } = useAdoptionFeed();
  const {
    threads,
    records,
    ensureAdoptionRequestThread,
    relistAdoptionPlacement,
    dismissAdoptionThread,
  } = useAdoption();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();

  const grouped = useMemo(() => groupThreads(threads, records), [threads, records]);
  const adoptionThreads = useMemo(
    () => [...grouped.action, ...grouped.adoption],
    [grouped],
  );

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
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [inboxListing, setInboxListing] = useState<AdoptionListing | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 480);
    return () => clearTimeout(t);
  }, []);

  const listingsShown = useMemo(() => {
    const base = filterAdoptionListings(listings, {
      filters: { ...filters, species },
    });
    if (tab === 'listings') return base.filter(l => l.userId === 'you');
    if (browseFilter === 'requested') {
      const requestedIds = new Set(
        getMyOutgoingRequests()
          .filter(isActiveAdoptionRequest)
          .map(r => r.listingId),
      );
      return base.filter(l => requestedIds.has(l.id));
    }
    return base;
  }, [listings, filters, species, browseFilter, tab, getMyOutgoingRequests]);

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

  const handleSubmitRequest = (listing: AdoptionListing) => {
    if (listing.userId === 'you') return;
    const requestNote = `I'd like to adopt ${listing.name}.`;
    submitRequest({
      listingId: listing.id,
      listingName: listing.name,
      posterId: listing.userId,
      message: requestNote,
    });
    setToast({ msg: `Request sent for ${listing.name}`, icon: 'adoption', tone: 'success' });
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
        />
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
        {!hubBarPinned ? listHeader : scrollHeader}
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} />
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
              { paddingBottom: tabBarPad },
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

    const myRequest = getRequestForListing(item.id);
    return (
      <FlipAdoptionCard
        listing={item}
        myRequest={myRequest}
        onViewDetails={() => navigation.navigate('Detail', { listingId: item.id })}
        onEditPost={
          item.userId === 'you'
            ? () => navigation.navigate('EditPost', { listingId: item.id })
            : undefined
        }
        onRequest={() => handleSubmitRequest(item)}
        onCancelRequest={() => {
          if (!myRequest) return;
          cancelRequest(myRequest.id);
          setToast({ msg: `Request for ${item.name} cancelled`, icon: 'close', tone: 'success' });
        }}
        onShare={() => setToast({ msg: `${item.name} shared`, icon: 'forward', tone: 'success' })}
        onOpenThread={() => {
          if (!myRequest) return;
          const thread = ensureAdoptionRequestThread({
            listingId: item.id,
            peerId: item.userId,
            threadId: myRequest.threadId,
          });
          if (!myRequest.threadId) {
            attachThreadToRequest(myRequest.id, thread.id);
          }
          setActiveThread(thread);
        }}
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
          styles.listContent,
          styles.hubListPad,
          { paddingBottom: tabBarPad },
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
                ? 'List a pet from the Feed composer when you\'re ready to help them find a home.'
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  list: { flex: 1 },
  listContent: {},
  hubListPad: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listEmpty: { flexGrow: 1, justifyContent: 'center', minHeight: 200 },
});
