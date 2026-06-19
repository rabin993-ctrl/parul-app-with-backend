import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlipAdoptionCard } from './FlipAdoptionCard';
import { AdoptionListingDetailModal } from './AdoptionListingDetailModal';
import type { AdoptionListing } from '../../data/adoptionData';
import type { ToastData } from '../ui/Toast';
import { isActiveAdoptionRequest, useAdoptionFeed } from '../../context/AdoptionFeedContext';
import { useAuth } from '../../context/AuthContext';

export function AdoptionHubBrowseCard({
  listing,
  onToast,
  onEditNavigate,
  onShare,
  ownerRequestCount,
  onManageRequests,
  onRelist,
}: {
  listing: AdoptionListing;
  onToast?: (t: ToastData) => void;
  onEditNavigate?: () => void;
  onShare?: () => void;
  ownerRequestCount?: number;
  onManageRequests?: () => void;
  onRelist?: () => void;
}) {
  const { user } = useAuth();
  const {
    submitRequest,
    cancelRequest,
    getRequestForListing,
  } = useAdoptionFeed();
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const isOwner = listing.userId === user?.id;
  const myRequest = useMemo(
    () => getRequestForListing(listing.id, user?.id),
    [getRequestForListing, listing.id, user?.id],
  );

  const openEdit = () => {
    if (onEditNavigate) {
      onEditNavigate();
      return;
    }
    setEditOpen(true);
  };

  const handleRequest = () => {
    if (isOwner) return;
    submitRequest({
      listingId: listing.id,
      listingName: listing.name,
      posterId: listing.userId,
      message: `I'd like to adopt ${listing.name}.`,
    });
    onToast?.({ msg: `Request sent for ${listing.name}`, icon: 'adoption', tone: 'success' });
  };

  const handleCancelRequest = () => {
    if (!myRequest) return;
    cancelRequest(myRequest.id);
    onToast?.({ msg: 'Request cancelled', icon: 'check', tone: 'primary' });
  };

  return (
    <View style={styles.wrap}>
      <FlipAdoptionCard
        listing={listing}
        myRequest={myRequest}
        onViewDetails={() => setDetailOpen(true)}
        onEditPost={isOwner ? openEdit : undefined}
        onRequest={handleRequest}
        onCancelRequest={myRequest && isActiveAdoptionRequest(myRequest) ? handleCancelRequest : undefined}
        onShare={onShare ?? (() => setDetailOpen(true))}
        ownerRequestCount={ownerRequestCount}
        onManageRequests={onManageRequests}
        onRelist={onRelist}
      />

      <AdoptionListingDetailModal
        listingId={listing.id}
        visible={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
      <AdoptionListingDetailModal
        listingId={listing.id}
        editMode
        visible={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
  },
});
