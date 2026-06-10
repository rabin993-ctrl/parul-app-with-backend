import React, {
  createContext, useCallback, useContext, useMemo, useState,
} from 'react';
import {
  DEMO_ADOPTION_LISTINGS,
  AdoptionListing,
  AdoptionStatus,
  VaccinationStatus,
  AdoptionSpecies,
} from '../data/adoptionData';

export type AdoptionRequest = {
  id: string;
  listingId: string;
  listingName: string;
  submittedAt: string;
  status: 'pending' | 'approved';
};

export type CreateListingInput = {
  name: string;
  species: AdoptionSpecies;
  breed: string;
  age: string;
  gender: 'Male' | 'Female';
  location: string;
  vacc: VaccinationStatus;
  personality: string;
  story: string;
  requirements: string[];
  urgent: boolean;
  withImage?: boolean;
};

const AdoptionFeedContext = createContext<{
  listings: AdoptionListing[];
  savedIds: Set<string>;
  requests: AdoptionRequest[];
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
  submitRequest: (listingId: string, listingName: string) => string;
  addListing: (input: CreateListingInput) => AdoptionListing;
  updateListing: (id: string, patch: Partial<AdoptionListing>) => void;
  markAdopted: (id: string, note?: string) => void;
} | null>(null);

function ageGroupFromAge(age: string): AdoptionListing['ageGroup'] {
  if (age.includes('week') || (age.includes('month') && parseInt(age, 10) < 12)) return 'puppy-kitten';
  if (age.includes('yr') && parseInt(age, 10) >= 7) return 'senior';
  if (age.includes('yr')) return 'adult';
  return 'young';
}

export function AdoptionFeedProvider({ children }: { children: React.ReactNode }) {
  const [listings, setListings] = useState<AdoptionListing[]>(DEMO_ADOPTION_LISTINGS);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(['a2']));
  const [requests, setRequests] = useState<AdoptionRequest[]>([]);

  const toggleSaved = useCallback((id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  const submitRequest = useCallback((listingId: string, listingName: string) => {
    const reqId = `req-${Date.now()}`;
    setRequests(prev => [
      { id: reqId, listingId, listingName, submittedAt: 'Just now', status: 'pending' },
      ...prev,
    ]);
    setListings(prev => prev.map(l => (
      l.id === listingId && l.status === 'Available'
        ? { ...l, status: 'Pending' as AdoptionStatus }
        : l
    )));
    return reqId;
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
      urgent: input.urgent,
      status: input.urgent ? 'Urgent' : 'Available',
      personality: input.personality.trim(),
      story: input.story.trim(),
      requirements: input.requirements.filter(Boolean),
      neutered: false,
      microchipped: false,
      healthNotes: `Vaccination: ${input.vacc}`,
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

  const value = useMemo(
    () => ({
      listings,
      savedIds,
      requests,
      toggleSaved,
      isSaved,
      submitRequest,
      addListing,
      updateListing,
      markAdopted,
    }),
    [listings, savedIds, requests, toggleSaved, isSaved, submitRequest, addListing, updateListing, markAdopted],
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
