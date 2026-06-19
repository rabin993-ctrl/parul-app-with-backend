import React, { useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { Empty } from '../../components/ui/Empty';
import { Toast, ToastData } from '../../components/ui/Toast';
import { AdoptionHubBrowseCard } from '../../components/adoption/AdoptionHubBrowseCard';
import { AdoptionPosterInbox } from '../../components/adoption/AdoptionPosterInbox';
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
import { useAdoption } from '../../context/AdoptionContext';
import { canPosterRelistAdoption, getAdoptionRecordForListing } from '../../data/adoptionRecords';
import { performPosterRelist } from '../../utils/adoptionRelist';
import { openAdoptionRequestChat } from '../../utils/openAdoptionRequestChat';
import { mergeAdoptionHubListings } from '../../utils/adoptionPostListing';
import {
  DEFAULT_ADOPTION_FILTERS,
  AdoptionFilters,
  filterAdoptionListings,
} from '../../data/adoptionData';
import type { AdoptionRequest } from '../../context/AdoptionFeedContext';
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
}: {
  embedded?: boolean;
  scrollHeader?: React.ReactNode;
  hubTab?: AdoptionHubTab;
  onHubTabChange?: (tab: AdoptionHubTab) => void;
  hubBarPinned?: boolean;
  browseFilter?: AdoptionBrowseFilter;
  onBrowseFilterChange?: (filter: AdoptionBrowseFilter) => void;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const {
    listings,
    listingsLoaded,
    requests,
    rejectRequest,
    approveRequest,
    relistListing,
    clearRequestOnRelist,
    getRequestsForListing,
    getMyOutgoingRequests,
  } = useAdoptionFeed();
  const {
    records,
    relistAdoptionPlacement,
    dismissAdoptionThread,
    reloadThreads,
  } = useAdoption();
  const { openAdoptionListing, posts: feedPosts } = useFeedPosts();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const listScrollPad = tabBarPad + 48;

  const [tabInternal, setTabInternal] = useState<AdoptionHubTab>('discover');
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
  const [inboxListing, setInboxListing] = useState<AdoptionListing | null>(null);

  const hubListings = useMemo(
    () => mergeAdoptionHubListings(listings, feedPosts),
    [listings, feedPosts],
  );

  const listingsShown = useMemo(() => {
    const base = filterAdoptionListings(hubListings, {
      filters: { ...filters, species },
    });
    if (tab === 'listings') return base.filter(l => l.userId === user?.id);
    if (browseFilter === 'requested') {
      const requestedIds = new Set(
        getMyOutgoingRequests()
          .filter(isActiveAdoptionRequest)
          .map(r => r.listingId),
      );
      return base.filter(l => requestedIds.has(l.id));
    }
    return base.sort((a, b) => {
      const aOwn = a.userId === user?.id ? 0 : 1;
      const bOwn = b.userId === user?.id ? 0 : 1;
      return aOwn - bOwn;
    });
  }, [hubListings, filters, species, browseFilter, tab, user?.id, getMyOutgoingRequests]);

  const inboxRequests = useMemo(
    () => (inboxListing ? getRequestsForListing(inboxListing.id) : []),
    [inboxListing, getRequestsForListing, listings],
  );

  const openChatForRequest = async (req: AdoptionRequest) => {
    const opened = await openAdoptionRequestChat({
      request: req,
      approveRequest,
      reloadThreads,
      navigation,
    });
    if (opened) {
      setInboxListing(null);
    }
  };

  const acceptAndOpenChat = async (req: AdoptionRequest) => {
    await openChatForRequest(req);
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

  const renderBrowseItem = ({ item }: { item: AdoptionListing }) => {
    if (tab === 'listings') {
      const reqs = getRequestsForListing(item.id);
      const adoptionRecord = getAdoptionRecordForListing(records, item.id, user?.id);
      const canRelist = item.status === 'Adopted'
        && user?.id
        && adoptionRecord
        && canPosterRelistAdoption(adoptionRecord, user.id);
      return (
        <AdoptionHubBrowseCard
          listing={item}
          onToast={setToast}
          onEditNavigate={() => navigation.navigate('EditPost', { listingId: item.id })}
          onShare={() => navigation.navigate('Detail', { listingId: item.id })}
          ownerRequestCount={reqs.length}
          onManageRequests={() => setInboxListing(item)}
          onRelist={canRelist && adoptionRecord ? () => {
            const ok = performPosterRelist(
              adoptionRecord,
              relistAdoptionPlacement,
              relistListing,
              clearRequestOnRelist,
              dismissAdoptionThread,
              adoptionRecord.chatThreadId,
            );
            if (!ok) return;
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
      <AdoptionHubBrowseCard
        listing={item}
        onToast={setToast}
        onEditNavigate={() => navigation.navigate('EditPost', { listingId: item.id })}
        onShare={() => navigation.navigate('Detail', { listingId: item.id })}
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
          (tab === 'discover' || tab === 'listings') && styles.cardList,
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
                  : 'Try a different species filter, or list a pet with the button below.'
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
          }
          setToast({ msg: 'Applicant passed', icon: 'close', tone: 'primary' });
        }}
        onAccept={acceptAndOpenChat}
        onOpenChat={openChatForRequest}
      />

      <Toast data={toast} onHide={() => setToast(null)} />
      <AdoptionListFab onPress={handleCreateListing} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, position: 'relative' },
  list: { flex: 1 },
  cardList: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  hubListPad: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listEmpty: { flexGrow: 1, justifyContent: 'center', minHeight: 200 },
});
