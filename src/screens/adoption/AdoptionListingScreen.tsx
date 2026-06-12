import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, ScrollView, StyleSheet, ActivityIndicator, Modal, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/tokens';
import { Empty } from '../../components/ui/Empty';
import { Toast, ToastData } from '../../components/ui/Toast';
import { AdoptionListingRow } from '../../components/adoption/AdoptionListingRow';
import { FlipAdoptionCard } from '../../components/adoption/FlipAdoptionCard';
import { AdoptionOwnerCard } from '../../components/adoption/AdoptionOwnerCard';
import { AdoptionRequestSheet } from '../../components/adoption/AdoptionRequestSheet';
import { AdoptionPosterInbox } from '../../components/adoption/AdoptionPosterInbox';
import { AdoptionThreadRow } from '../../components/adoption/AdoptionThreadRow';
import {
  AdoptionHubBar,
  AdoptionSpeciesRow,
  type AdoptionHubTab,
} from '../../components/adoption/AdoptionChrome';
import { useAdoptionFeed } from '../../context/AdoptionFeedContext';
import type { AdoptionListing } from '../../data/adoptionData';
import { useAdoption, type ChatThread } from '../../context/AdoptionContext';
import {
  DEFAULT_ADOPTION_FILTERS,
  AdoptionFilters,
  filterAdoptionListings,
} from '../../data/adoptionData';
import { groupThreads } from '../../utils/chatThreadMeta';
import { ChatThreadScreen } from '../ChatThreadScreen';
import { AdoptedRecordsPanel } from '../../components/adoption/AdoptedRecordsPanel';
import type { AdoptionStackParamList } from '../../navigation/AdoptionNavigator';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';
import { users } from '../../data/mockData';

type Nav = NativeStackNavigationProp<AdoptionStackParamList, 'Listing'>;

export function AdoptionListingScreen({
  embedded = false,
  scrollHeader,
  hubTab: hubTabProp,
  onHubTabChange,
  hubBarPinned = false,
  species: speciesProp,
  onSpeciesChange,
}: {
  embedded?: boolean;
  scrollHeader?: React.ReactNode;
  hubTab?: AdoptionHubTab;
  onHubTabChange?: (tab: AdoptionHubTab) => void;
  hubBarPinned?: boolean;
  species?: AdoptionFilters['species'];
  onSpeciesChange?: (species: AdoptionFilters['species']) => void;
}) {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const {
    listings,
    savedIds,
    toggleSaved,
    isSaved,
    submitRequest,
    queueRequest,
    approveRequest,
    rejectRequest,
    completeAdoption,
    markAdopted,
    getRequestsForListing,
    getRequestForListing,
    getMyNotifications,
    attachThreadToRequest,
  } = useAdoptionFeed();
  const {
    threads,
    records,
    createRequestThread,
    notifyRequestQueued,
    proposeAdoption,
    getRecordByThread,
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
  const [speciesInternal, setSpeciesInternal] = useState<AdoptionFilters['species']>('all');
  const species = speciesProp ?? speciesInternal;
  const setSpecies = onSpeciesChange ?? setSpeciesInternal;
  const filterPinned = hubBarPinned && speciesProp !== undefined;
  const [filters] = useState<AdoptionFilters>(DEFAULT_ADOPTION_FILTERS);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [requestListing, setRequestListing] = useState<AdoptionListing | null>(null);
  const [inboxListing, setInboxListing] = useState<AdoptionListing | null>(null);

  const myNotifications = getMyNotifications().filter(n => !n.read);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 480);
    return () => clearTimeout(t);
  }, []);

  const listingsShown = useMemo(() => {
    const base = filterAdoptionListings(listings, {
      filters: { ...filters, species },
    });
    if (tab === 'saved') return base.filter(l => savedIds.has(l.id));
    if (tab === 'listings') return base.filter(l => l.userId === 'you');
    return base;
  }, [listings, filters, species, tab, savedIds]);

  const inboxRequests = useMemo(
    () => (inboxListing ? getRequestsForListing(inboxListing.id) : []),
    [inboxListing, getRequestsForListing, listings],
  );

  const openThreadForRequest = (requesterId: string, listingId: string, threadId?: string) => {
    const thread = threadId
      ? threads.find(t => t.id === threadId)
      : threads.find(t => t.participantId === requesterId && t.adoptionPostId === listingId);
    if (thread) setActiveThread(thread);
    else setToast({ msg: 'Open Requests tab to start chatting', icon: 'comment', tone: 'primary' });
  };

  const handleSubmitRequest = (message: string) => {
    if (!requestListing || requestListing.userId === 'you') return;
    const threadId = createRequestThread({
      participantId: requestListing.userId,
      listingId: requestListing.id,
      petName: requestListing.name,
      requesterMessage: message,
      requesterName: users.you.name,
    });
    const requestId = submitRequest({
      listingId: requestListing.id,
      listingName: requestListing.name,
      posterId: requestListing.userId,
      message,
      threadId,
    });
    attachThreadToRequest(requestId, threadId);
    setRequestListing(null);
    navigation.navigate('Confirmation', { listingId: requestListing.id, requestId });
  };

  const handleQueueRequest = (requestId: string) => {
    const req = inboxRequests.find(r => r.id === requestId);
    queueRequest(requestId);
    if (req && inboxListing) {
      const position = inboxRequests.filter(r => r.status === 'queued').length + 1;
      if (req.threadId) {
        notifyRequestQueued(req.threadId, inboxListing.name, position);
      }
      setToast({
        msg: `${req.requesterName} added to queue · #${position}`,
        icon: 'check',
        tone: 'success',
      });
    }
  };

  const listHeader = (
    <View>
      {scrollHeader}
      {!hubBarPinned && <AdoptionHubBar tab={tab} onTabChange={setTab} />}
      {tab === 'discover' && !filterPinned && (
        <AdoptionSpeciesRow active={species} onChange={setSpecies} />
      )}
      {tab === 'threads' && myNotifications.length > 0 && (
        <View style={[styles.notice, { backgroundColor: colors.warningBg, borderColor: colors.warning + '33' }]}>
          <Text style={[styles.noticeText, { color: colors.warning }]}>
            {myNotifications[0].title} — {myNotifications[0].body}
          </Text>
        </View>
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

  if (tab === 'adopted') {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
        <ScrollView
          contentContainerStyle={[styles.adoptedScroll, { paddingBottom: tabBarPad }]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={embedded}
          {...tabBarScrollProps}
        >
          {listHeader}
          <AdoptedRecordsPanel
            onOpenRecord={id => navigation.navigate('AdoptedDetail', { recordId: id })}
          />
        </ScrollView>
      </View>
    );
  }

  if (tab === 'threads') {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
        <FlatList
          style={styles.list}
          data={adoptionThreads}
          keyExtractor={t => t.id}
          nestedScrollEnabled={embedded}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarPad },
            adoptionThreads.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          {...tabBarScrollProps}
          renderItem={({ item }) => (
            <AdoptionThreadRow
              thread={item}
              records={records}
              onPress={() => setActiveThread(item)}
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No requests yet — request a pet from Browse to start one
            </Text>
          }
        />

        <Modal visible={!!activeThread} animationType="slide" onRequestClose={() => setActiveThread(null)}>
          {activeThread && (
            <ChatThreadScreen thread={activeThread} onClose={() => setActiveThread(null)} />
          )}
        </Modal>
      </View>
    );
  }

  const renderBrowseItem = ({ item }: { item: AdoptionListing }) => {
    if (tab === 'discover') {
      const myRequest = getRequestForListing(item.id);
      return (
        <FlipAdoptionCard
          listing={item}
          saved={isSaved(item.id)}
          myRequest={myRequest}
          onViewDetails={() => navigation.navigate('Detail', { listingId: item.id })}
          onRequest={() => setRequestListing(item)}
          onSave={() => {
            const wasSaved = isSaved(item.id);
            toggleSaved(item.id);
            setToast({
              msg: wasSaved ? `Removed ${item.name} from saved` : `Saved ${item.name}`,
              icon: 'heart',
              tone: 'accent',
            });
          }}
          onShare={() => setToast({ msg: `${item.name} shared`, icon: 'forward', tone: 'success' })}
          onOpenThread={() => {
            if (!myRequest) return;
            const thread = myRequest.threadId
              ? threads.find(t => t.id === myRequest.threadId)
              : threads.find(t => t.adoptionPostId === item.id && t.participantId === item.userId);
            if (thread) setActiveThread(thread);
            else setTab('threads');
          }}
        />
      );
    }

    if (tab === 'listings') {
      const reqs = getRequestsForListing(item.id);
      const pendingCount = reqs.filter(r => r.status === 'pending').length;
      return (
        <AdoptionOwnerCard
          listing={item}
          requestCount={reqs.length}
          pendingCount={pendingCount}
          onManageRequests={() => setInboxListing(item)}
          onEdit={() => navigation.navigate('EditPost', { listingId: item.id })}
          onMarkAdopted={() => navigation.navigate('ManagePost', { listingId: item.id })}
        />
      );
    }

    return (
      <AdoptionListingRow
        listing={item}
        saved={isSaved(item.id)}
        onPress={() => navigation.navigate('Detail', { listingId: item.id })}
        onSave={() => {
          const wasSaved = isSaved(item.id);
          toggleSaved(item.id);
          setToast({
            msg: wasSaved ? `Removed ${item.name} from saved` : `Saved ${item.name}`,
            icon: 'heart',
            tone: 'accent',
          });
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
          tab === 'discover' || tab === 'listings' ? styles.hubListPad : styles.hubListPadTop,
          { paddingBottom: tabBarPad },
          listingsShown.length === 0 && styles.listEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
        renderItem={renderBrowseItem}
        ListEmptyComponent={
          <Empty
            icon={tab === 'saved' ? 'heart' : 'adoption'}
            title={
              tab === 'saved' ? 'No saved pets yet'
                : tab === 'listings' ? 'No posts yet'
                  : 'No pets match'
            }
            body={
              tab === 'saved' ? 'Tap the heart on a listing to save pets you love.'
                : tab === 'listings' ? 'Post a pet when you\'re ready to help them find a home.'
                  : 'Try a different species filter.'
            }
          />
        }
      />

      <AdoptionRequestSheet
        visible={!!requestListing}
        listing={requestListing}
        onClose={() => setRequestListing(null)}
        onSubmit={handleSubmitRequest}
      />

      <AdoptionPosterInbox
        visible={!!inboxListing}
        listing={inboxListing}
        requests={inboxRequests}
        onClose={() => setInboxListing(null)}
        onQueue={handleQueueRequest}
        onApprove={(id) => {
          approveRequest(id);
          setToast({ msg: 'Request approved — chat to coordinate', icon: 'check', tone: 'success' });
        }}
        onReject={(id) => {
          rejectRequest(id);
          setToast({ msg: 'Request passed', icon: 'close', tone: 'primary' });
        }}
        onMarkAdopted={(id) => {
          const req = inboxRequests.find(r => r.id === id);
          completeAdoption(id, `Successfully adopted through Parul 🐾`);
          if (req && inboxListing) {
            if (req.threadId && !getRecordByThread(req.threadId)) {
              proposeAdoption({
                threadId: req.threadId,
                adoptionPostId: inboxListing.id,
                posterId: 'you',
                adopterId: req.requesterId,
                petName: inboxListing.name,
                species: inboxListing.species,
                icon: inboxListing.icon,
                tint: inboxListing.tint,
              });
            }
            markAdopted(inboxListing.id);
          }
          setInboxListing(null);
          setToast({ msg: 'Marked successfully adopted!', icon: 'adoption', tone: 'success' });
        }}
        onOpenThread={(req) => {
          setInboxListing(null);
          openThreadForRequest(req.requesterId, req.listingId, req.threadId);
          const thread = req.threadId
            ? threads.find(t => t.id === req.threadId)
            : threads.find(t => t.participantId === req.requesterId);
          if (thread) setActiveThread(thread);
        }}
      />

      <Modal visible={!!activeThread} animationType="slide" onRequestClose={() => setActiveThread(null)}>
        {activeThread && (
          <ChatThreadScreen thread={activeThread} onClose={() => setActiveThread(null)} />
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
  hubListPadTop: {
    paddingTop: 12,
  },
  adoptedScroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  listEmpty: { flexGrow: 1, justifyContent: 'center', minHeight: 200 },
  emptyText: { ...typography.small, textAlign: 'center', paddingHorizontal: 32, paddingVertical: 32 },
  notice: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noticeText: { fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
});
