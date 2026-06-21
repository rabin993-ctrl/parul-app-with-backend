import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { registerDevReset } from '../dev/devResetRegistry';
import type {
  AdoptionListing, AdoptionStatus, AdoptionSpecies, VaccinationStatus,
} from '../data/adoptionData';
import type { PickedAsset } from '../hooks/useMediaPicker';
import { useAdoptionListings } from '../hooks/useAdoptionListings';
import { useAdoptionRequests } from '../hooks/useAdoptionRequests';

export type AdoptionRequestStatus = 'submitted' | 'approved' | 'rejected' | 'adopted';

export function isActiveAdoptionRequest(request: AdoptionRequest): boolean {
  return request.status === 'submitted' || request.status === 'approved';
}

export type AdoptionRequest = {
  id: string;
  listingId: string;
  listingName: string;
  posterId: string;
  requesterId: string;
  requesterName: string;
  message: string;
  submittedAt: string;
  status: AdoptionRequestStatus;
  threadId?: string;
};

export type AdoptionFeedNotification = {
  id: string;
  type: 'request_received' | 'approved' | 'rejected' | 'adopted';
  title: string;
  body: string;
  listingId: string;
  requestId: string;
  recipientId: string;
  time: string;
  read: boolean;
};

export type CreateListingInput = {
  name: string;
  species: AdoptionSpecies;
  breed: string;
  age: string;
  gender: 'Male' | 'Female';
  location: string;
  vacc: VaccinationStatus;
  neutered: boolean;
  personality: string;
  story: string;
  requirements: string[];
  urgent: boolean;
  status?: AdoptionStatus;
  withImage?: boolean;
  photos?: PickedAsset[];
};

const AdoptionFeedContext = createContext<{
  listings: AdoptionListing[];
  listingsLoaded: boolean;
  savedIds: Set<string>;
  requests: AdoptionRequest[];
  notifications: AdoptionFeedNotification[];
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
  submitRequest: (input: {
    listingId: string;
    listingName: string;
    posterId: string;
    message: string;
    threadId?: string;
  }) => string;
  approveRequest: (requestId: string) => Promise<string | null>;
  rejectRequest: (requestId: string) => void;
  cancelRequest: (requestId: string) => void;
  completeAdoption: (requestId: string, note?: string) => void;
  getRequestsForListing: (listingId: string) => AdoptionRequest[];
  getMyOutgoingRequests: () => AdoptionRequest[];
  getIncomingRequests: () => AdoptionRequest[];
  getRequestForListing: (listingId: string, requesterId?: string) => AdoptionRequest | undefined;
  markNotificationRead: (id: string) => void;
  markListingRequestNotificationsRead: (listingId: string) => void;
  getMyNotifications: () => AdoptionFeedNotification[];
  attachThreadToRequest: (requestId: string, threadId: string) => void;
  addListing: (input: CreateListingInput) => Promise<AdoptionListing>;
  updateListing: (id: string, patch: Partial<AdoptionListing>) => void;
  markAdopted: (id: string, note?: string) => void;
  relistListing: (id: string) => void;
  clearRequestOnRelist: (listingId: string, requesterId: string) => void;
  pendingReviewListingId: string | null;
  queueAdoptionReviewPopup: (listingId: string) => void;
  clearPendingAdoptionReviewPopup: () => void;
} | null>(null);

export function AdoptionFeedProvider({ children }: { children: React.ReactNode }) {
  const {
    listings, loaded: listingsLoaded, savedIds, toggleSaved, addListing, updateListing,
    markAdopted, relistListing, reload: reloadListings,
  } = useAdoptionListings();

  const {
    requests, notifications,
    submitRequest, approveRequest: approveRequestRpc, rejectRequest, cancelRequest,
    completeAdoption, attachThreadToRequest, clearRequestOnRelist,
    markNotificationRead, reload: reloadRequests,
    markListingRequestNotificationsRead,
  } = useAdoptionRequests();

  const [pendingReviewListingId, setPendingReviewListingId] = useState<string | null>(null);
  const queueAdoptionReviewPopup = useCallback((listingId: string) => {
    setPendingReviewListingId(listingId);
  }, []);
  const clearPendingAdoptionReviewPopup = useCallback(() => {
    setPendingReviewListingId(null);
  }, []);

  const resetDevState = useCallback(() => {
    reloadListings();
    reloadRequests();
  }, [reloadListings, reloadRequests]);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  const getRequestsForListing = useCallback(
    (listingId: string) => requests
      .filter(r => r.listingId === listingId && isActiveAdoptionRequest(r))
      .sort((a, b) => {
        const order: Record<AdoptionRequestStatus, number> = { submitted: 0, approved: 1, adopted: 2, rejected: 3 };
        return order[a.status] - order[b.status];
      }),
    [requests],
  );

  const getMyOutgoingRequests = useCallback(
    () => requests.filter(r => r.status !== 'rejected'),
    [requests],
  );

  const getIncomingRequests = useCallback(
    () => requests,
    [requests],
  );

  const getRequestForListing = useCallback(
    (listingId: string, requesterId?: string) =>
      requests.find(r =>
        r.listingId === listingId
        && (requesterId == null || r.requesterId === requesterId)
        && isActiveAdoptionRequest(r),
      ),
    [requests],
  );

  const approveRequest = useCallback((requestId: string) => (
    approveRequestRpc(requestId).then(threadId => {
      if (threadId) attachThreadToRequest(requestId, threadId);
      return threadId;
    })
  ), [approveRequestRpc, attachThreadToRequest]);

  const getMyNotifications = useCallback(
    () => notifications,
    [notifications],
  );

  const value = useMemo(
    () => ({
      listings,
      listingsLoaded,
      savedIds,
      requests,
      notifications,
      toggleSaved,
      isSaved,
      submitRequest,
      approveRequest,
      rejectRequest,
      cancelRequest,
      completeAdoption,
      getRequestsForListing,
      getMyOutgoingRequests,
      getIncomingRequests,
      getRequestForListing,
      markNotificationRead,
      markListingRequestNotificationsRead,
      getMyNotifications,
      attachThreadToRequest,
      addListing,
      updateListing,
      markAdopted,
      relistListing,
      clearRequestOnRelist,
      pendingReviewListingId,
      queueAdoptionReviewPopup,
      clearPendingAdoptionReviewPopup,
    }),
    [
      listings, listingsLoaded, savedIds, requests, notifications, toggleSaved, isSaved,
      submitRequest, approveRequest, rejectRequest, cancelRequest, completeAdoption,
      getRequestsForListing, getMyOutgoingRequests, getIncomingRequests,
      getRequestForListing, markNotificationRead, markListingRequestNotificationsRead,
      getMyNotifications, attachThreadToRequest,
      addListing, updateListing, markAdopted, relistListing, clearRequestOnRelist,
      pendingReviewListingId, queueAdoptionReviewPopup, clearPendingAdoptionReviewPopup,
    ],
  );

  return (
    <AdoptionFeedContext.Provider value={value}>
      {children}
    </AdoptionFeedContext.Provider>
  );
}

export function useAdoptionFeed() {
  const ctx = useContext(AdoptionFeedContext);
  if (!ctx) throw new Error('useAdoptionFeed must be used within AdoptionFeedProvider');
  return ctx;
}
