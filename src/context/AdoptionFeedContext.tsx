import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { registerDevReset } from '../dev/devResetRegistry';
import {
  DEMO_ADOPTION_LISTINGS,
  AdoptionListing,
  AdoptionStatus,
  VaccinationStatus,
  AdoptionSpecies,
} from '../data/adoptionData';
import { users } from '../data/mockData';

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
};

const MISTY_LISTING: AdoptionListing = {
  id: 'a8',
  pet: null,
  name: 'Misty',
  species: 'cat',
  icon: 'cat',
  breed: 'Indie Shorthair',
  age: '2 yrs',
  ageGroup: 'young',
  gender: 'Female',
  loc: 'Dhanmondi',
  location: 'Dhanmondi',
  vacc: 'Done',
  tint: '#7A5AE0',
  owner: 'you',
  userId: 'you',
  urgent: false,
  status: 'Available',
  rating: 4.9,
  reviews: 24,
  personality: 'Soft-hearted window watcher who purrs like a motor.',
  story: 'Misty was fostered after a monsoon rescue. She loves quiet evenings and gentle chin scratches.',
  requirements: ['Indoor home', 'Patient introduction to other pets', 'Daily play time'],
  neutered: true,
  microchipped: true,
  healthNotes: 'Fully vaccinated · spayed · microchipped',
  gallery: ['#7A5AE0', '#7A5AE099'],
  postedAt: '3 days ago',
};

const OREO_LISTING: AdoptionListing = {
  id: 'p-you-adopt2',
  pet: null,
  name: 'Oreo',
  species: 'other',
  icon: 'dog',
  breed: 'Mini lop',
  age: '1 yr',
  ageGroup: 'young',
  gender: 'Male',
  loc: 'Banani',
  location: 'Banani',
  vacc: 'Done',
  tint: '#7C5CBF',
  owner: 'you',
  userId: 'you',
  urgent: false,
  status: 'Adopted',
  rating: 4.8,
  reviews: 12,
  personality: 'Gentle bunny who loves quiet corners.',
  story: 'Oreo was fostered locally and is ready for a bunny-experienced home.',
  requirements: ['Bunny-safe space', 'No dogs', 'Patient adopters'],
  neutered: true,
  microchipped: true,
  healthNotes: 'Neutered · vaccinated',
  gallery: ['#7C5CBF', '#7C5CBF99'],
  postedAt: '4 months ago',
  adoptedDate: '4 months ago',
  adoptedNote: 'Adopted through Parul',
};

const SEED_REQUESTS: AdoptionRequest[] = [
  {
    id: 'req-pepper-you',
    listingId: 'a1',
    listingName: 'Pepper',
    posterId: 'dev',
    requesterId: 'you',
    requesterName: users.you.name,
    message: 'We\'re so excited to bring Pepper home.',
    submittedAt: '1d ago',
    status: 'approved',
    threadId: 't-adopt-dev-pending',
  },
  {
    id: 'req-mochi-you',
    listingId: 'a2',
    listingName: 'Mochi',
    posterId: 'sam',
    requesterId: 'you',
    requesterName: users.you.name,
    message: 'We have a sunny windowsill ready for Mochi.',
    submittedAt: '5d ago',
    status: 'adopted',
    threadId: 't-adopt-mochi',
  },
  {
    id: 'req-seed-1',
    listingId: 'a8',
    listingName: 'Misty',
    posterId: 'you',
    requesterId: 'priya',
    requesterName: users.priya.name,
    message: 'We have a calm apartment and experience with shy cats. Happy to do a home visit.',
    submittedAt: '2h ago',
    status: 'submitted',
    threadId: 't-misty-priya',
  },
  {
    id: 'req-seed-2',
    listingId: 'a8',
    listingName: 'Misty',
    posterId: 'you',
    requesterId: 'omar',
    requesterName: users.omar.name,
    message: 'Rocky is gentle with cats — we would love to meet Misty this weekend.',
    submittedAt: '5h ago',
    status: 'approved',
    threadId: 't-misty-omar',
  },
  {
    id: 'req-biscuit-you',
    listingId: 'a3',
    listingName: 'Biscuit',
    posterId: 'sam',
    requesterId: 'you',
    requesterName: users.you.name,
    message: 'I\'d love to meet Biscuit — we have a secure yard.',
    submittedAt: '6h ago',
    status: 'submitted',
    threadId: 't-adopt-biscuit',
  },
  {
    id: 'req-olive-you',
    listingId: 'a4',
    listingName: 'Olive',
    posterId: 'lena',
    requesterId: 'you',
    requesterName: users.you.name,
    message: 'Calm home ready for Olive.',
    submittedAt: '8d ago',
    status: 'adopted',
    threadId: 't-adopt-olive',
  },
  {
    id: 'req-coco-priya',
    listingId: 'p-you-adopt',
    listingName: 'Coco',
    posterId: 'you',
    requesterId: 'priya',
    requesterName: users.priya.name,
    message: 'Misty sounds perfect for our apartment.',
    submittedAt: '90d ago',
    status: 'adopted',
    threadId: 't-adopt-priya',
  },
  {
    id: 'req-oreo-lena',
    listingId: 'p-you-adopt2',
    listingName: 'Oreo',
    posterId: 'you',
    requesterId: 'lena',
    requesterName: users.lena.name,
    message: 'We have a bunny-safe space ready for Oreo.',
    submittedAt: '120d ago',
    status: 'adopted',
    threadId: 't-adopt-lena',
  },
  {
    id: 'req-bruno-omar',
    listingId: 'a5',
    listingName: 'Bruno',
    posterId: 'you',
    requesterId: 'omar',
    requesterName: users.omar.name,
    message: 'We have a calm home ready for Bruno.',
    submittedAt: '50d ago',
    status: 'adopted',
    threadId: 't-adopt-bruno',
  },
];

const AdoptionFeedContext = createContext<{
  listings: AdoptionListing[];
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
  approveRequest: (requestId: string) => void;
  rejectRequest: (requestId: string) => void;
  cancelRequest: (requestId: string) => void;
  completeAdoption: (requestId: string, note?: string) => void;
  getRequestsForListing: (listingId: string) => AdoptionRequest[];
  getMyOutgoingRequests: () => AdoptionRequest[];
  getIncomingRequests: () => AdoptionRequest[];
  getRequestForListing: (listingId: string, requesterId?: string) => AdoptionRequest | undefined;
  markNotificationRead: (id: string) => void;
  getMyNotifications: () => AdoptionFeedNotification[];
  attachThreadToRequest: (requestId: string, threadId: string) => void;
  addListing: (input: CreateListingInput) => AdoptionListing;
  updateListing: (id: string, patch: Partial<AdoptionListing>) => void;
  markAdopted: (id: string, note?: string) => void;
  relistListing: (id: string) => void;
  clearRequestOnRelist: (listingId: string, requesterId: string) => void;
} | null>(null);

function ageGroupFromAge(age: string): AdoptionListing['ageGroup'] {
  if (age.includes('week') || (age.includes('month') && parseInt(age, 10) < 12)) return 'puppy-kitten';
  if (age.includes('yr') && parseInt(age, 10) >= 7) return 'senior';
  if (age.includes('yr')) return 'adult';
  return 'young';
}

function pushNotification(
  prev: AdoptionFeedNotification[],
  n: Omit<AdoptionFeedNotification, 'read'>,
): AdoptionFeedNotification[] {
  return [{ ...n, read: false }, ...prev];
}

export function AdoptionFeedProvider({ children }: { children: React.ReactNode }) {
  const [listings, setListings] = useState<AdoptionListing[]>([
    MISTY_LISTING,
    OREO_LISTING,
    ...DEMO_ADOPTION_LISTINGS,
  ]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(['a2']));
  const [requests, setRequests] = useState<AdoptionRequest[]>(SEED_REQUESTS);
  const [notifications, setNotifications] = useState<AdoptionFeedNotification[]>([]);

  const resetDevState = useCallback(() => {
    setListings([MISTY_LISTING, OREO_LISTING, ...DEMO_ADOPTION_LISTINGS]);
    setSavedIds(new Set(['a2']));
    setRequests(SEED_REQUESTS);
    setNotifications([]);
  }, []);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

  const toggleSaved = useCallback((id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  const getRequestsForListing = useCallback(
    (listingId: string) => requests
      .filter(r => r.listingId === listingId)
      .sort((a, b) => {
        const order = { submitted: 0, approved: 1, adopted: 2, rejected: 3 };
        return order[a.status] - order[b.status];
      }),
    [requests],
  );

  const getMyOutgoingRequests = useCallback(
    () => requests.filter(r => r.requesterId === 'you'),
    [requests],
  );

  const getIncomingRequests = useCallback(
    () => requests.filter(r => r.posterId === 'you'),
    [requests],
  );

  const getRequestForListing = useCallback(
    (listingId: string, requesterId = 'you') =>
      requests.find(r => (
        r.listingId === listingId
        && r.requesterId === requesterId
        && isActiveAdoptionRequest(r)
      )),
    [requests],
  );

  const submitRequest = useCallback((input: {
    listingId: string;
    listingName: string;
    posterId: string;
    message: string;
    threadId?: string;
  }) => {
    const reqId = `req-${Date.now()}`;
    const me = users.you;
    setRequests(prev => [
      {
        id: reqId,
        listingId: input.listingId,
        listingName: input.listingName,
        posterId: input.posterId,
        requesterId: 'you',
        requesterName: me.name,
        message: input.message.trim(),
        submittedAt: 'Just now',
        status: 'submitted',
        threadId: input.threadId,
      },
      ...prev,
    ]);
    if (input.posterId === 'you') {
      setNotifications(prev => pushNotification(prev, {
        id: `n-poster-${reqId}`,
        type: 'request_received',
        title: `New request for ${input.listingName}`,
        body: `${me.name} wants to adopt ${input.listingName}. Review their message in Requests.`,
        listingId: input.listingId,
        requestId: reqId,
        recipientId: 'you',
        time: 'Just now',
      }));
    }
    return reqId;
  }, []);

  const approveRequest = useCallback((requestId: string) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === requestId);
      if (!target) return prev;
      setNotifications(n => pushNotification(n, {
        id: `n-approve-${requestId}`,
        type: 'approved',
        title: `${target.listingName} — request approved`,
        body: 'The poster approved your request. Open your thread to coordinate a meet-up.',
        listingId: target.listingId,
        requestId,
        recipientId: target.requesterId,
        time: 'Just now',
      }));
      return prev.map(r => (
        r.id === requestId ? { ...r, status: 'approved' as AdoptionRequestStatus } : r
      ));
    });
  }, []);

  const cancelRequest = useCallback((requestId: string) => {
    setRequests(prev => prev.filter(r => r.id !== requestId));
  }, []);

  const rejectRequest = useCallback((requestId: string) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === requestId);
      if (!target) return prev;
      setNotifications(n => pushNotification(n, {
        id: `n-reject-${requestId}`,
        type: 'rejected',
        title: `Update on ${target.listingName}`,
        body: 'The poster passed on this request. Browse other pets still looking for homes.',
        listingId: target.listingId,
        requestId,
        recipientId: target.requesterId,
        time: 'Just now',
      }));
      return prev.map(r => (
        r.id === requestId ? { ...r, status: 'rejected' as AdoptionRequestStatus } : r
      ));
    });
  }, []);

  const completeAdoption = useCallback((requestId: string, note?: string) => {
    setRequests(prev => {
      const target = prev.find(r => r.id === requestId);
      if (!target) return prev;
      setListings(ls => ls.map(l => (
        l.id === target.listingId
          ? {
            ...l,
            status: 'Adopted' as AdoptionStatus,
            urgent: false,
            adoptedDate: 'Just now',
            adoptedNote: note ?? `Successfully adopted by ${target.requesterName}`,
          }
          : l
      )));
      setNotifications(n => pushNotification(n, {
        id: `n-adopted-${requestId}`,
        type: 'adopted',
        title: `${target.listingName} found a home!`,
        body: note ?? 'The poster marked this adoption complete. Celebrate in your thread!',
        listingId: target.listingId,
        requestId,
        recipientId: target.requesterId,
        time: 'Just now',
      }));
      return prev.map(r => (
        r.id === requestId
          ? { ...r, status: 'adopted' as AdoptionRequestStatus }
          : r.listingId === target.listingId && r.status !== 'rejected'
            ? { ...r, status: 'rejected' as AdoptionRequestStatus }
            : r
      ));
    });
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const getMyNotifications = useCallback(
    () => notifications.filter(n => n.recipientId === 'you'),
    [notifications],
  );

  const attachThreadToRequest = useCallback((requestId: string, threadId: string) => {
    setRequests(prev => prev.map(r => (
      r.id === requestId ? { ...r, threadId } : r
    )));
  }, []);

  const addListing = useCallback((input: CreateListingInput): AdoptionListing => {
    const tint = input.species === 'dog' ? '#E0503F' : '#7A5AE0';
    const listing: AdoptionListing = {
      id: `a-${Date.now()}`,
      pet: null,
      name: input.name.trim(),
      species: input.species,
      icon: input.species === 'dog' ? 'dog' : 'cat',
      breed: input.breed.trim(),
      age: input.age.trim(),
      ageGroup: ageGroupFromAge(input.age),
      gender: input.gender,
      loc: input.location,
      location: input.location,
      vacc: input.vacc,
      tint,
      owner: 'you',
      userId: 'you',
      urgent: input.urgent || input.status === 'Urgent',
      status: input.status ?? (input.urgent ? 'Urgent' : 'Available'),
      personality: input.personality.trim(),
      story: input.story.trim(),
      requirements: input.requirements.filter(Boolean),
      neutered: input.neutered,
      microchipped: false,
      healthNotes: `Vaccination: ${input.vacc} · Sterilization: ${input.neutered ? 'Yes' : 'No'}`,
      gallery: input.withImage ? [tint, tint + '99'] : [tint],
      postedAt: 'Just now',
      rating: usersRatingFallback(),
    };
    setListings(prev => [listing, ...prev]);
    return listing;
  }, []);

  const updateListing = useCallback((id: string, patch: Partial<AdoptionListing>) => {
    setListings(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  const markAdopted = useCallback((id: string, note?: string) => {
    setListings(prev => prev.map(l => (
      l.id === id
        ? {
          ...l,
          status: 'Adopted' as AdoptionStatus,
          urgent: false,
          adoptedDate: 'Just now',
          adoptedNote: note ?? 'Successfully adopted through Parul',
        }
        : l
    )));
  }, []);

  const relistListing = useCallback((id: string) => {
    setListings(prev => prev.map(l => (
      l.id === id && l.userId === 'you'
        ? {
          ...l,
          status: 'Available' as AdoptionStatus,
          urgent: false,
          adoptedDate: undefined,
          adoptedNote: undefined,
          postedAt: 'Just now',
        }
        : l
    )));
  }, []);

  const clearRequestOnRelist = useCallback((listingId: string, requesterId: string) => {
    setRequests(prev => prev.filter(r => !(
      r.listingId === listingId && r.requesterId === requesterId
    )));
  }, []);

  const value = useMemo(
    () => ({
      listings,
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
      getMyNotifications,
      attachThreadToRequest,
      addListing,
      updateListing,
      markAdopted,
      relistListing,
      clearRequestOnRelist,
    }),
    [
      listings, savedIds, requests, notifications, toggleSaved, isSaved,
      submitRequest, approveRequest, rejectRequest, cancelRequest, completeAdoption,
      getRequestsForListing, getMyOutgoingRequests, getIncomingRequests,
      getRequestForListing, markNotificationRead, getMyNotifications, attachThreadToRequest,
      addListing, updateListing, markAdopted, relistListing, clearRequestOnRelist,
    ],
  );

  return (
    <AdoptionFeedContext.Provider value={value}>
      {children}
    </AdoptionFeedContext.Provider>
  );
}

function usersRatingFallback() {
  return 4.9;
}

export function useAdoptionFeed() {
  const ctx = useContext(AdoptionFeedContext);
  if (!ctx) throw new Error('useAdoptionFeed must be used within AdoptionFeedProvider');
  return ctx;
}
