import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { loadListingMediaUrls, uploadListingPhotos } from '../lib/adoptionMedia';
import { useAuth } from '../context/AuthContext';
import type { AdoptionListing, AdoptionStatus, VaccinationStatus } from '../data/adoptionData';
import type { CreateListingInput } from '../context/AdoptionFeedContext';

type DbListingRow = {
  id: string;
  poster_user_id: string;
  name: string;
  species: string;
  breed: string | null;
  age: string | null;
  age_group: string | null;
  gender: string | null;
  location: string | null;
  icon: string | null;
  tint: string | null;
  vaccination: string;
  neutered: boolean;
  microchipped: boolean;
  health_notes: string | null;
  personality: string | null;
  story: string | null;
  requirements: string[];
  urgent: boolean;
  status: string;
  posted_at: string;
  adopted_date: string | null;
  adopted_note: string | null;
  poster: { name: string; handle: string | null; tint: string | null } | null;
};

function rowToListing(
  row: DbListingRow,
  savedIds: Set<string>,
  mediaUrls?: string[],
): AdoptionListing {
  const tint = row.tint ?? (row.species === 'dog' ? '#E0503F' : '#7A5AE0');
  const urls = mediaUrls?.length ? mediaUrls : undefined;
  return {
    id: row.id,
    pet: null,
    name: row.name,
    species: (row.species as 'dog' | 'cat' | 'other'),
    icon: row.icon ?? row.species,
    breed: row.breed ?? '',
    age: row.age ?? '',
    ageGroup: (row.age_group as AdoptionListing['ageGroup']) ?? 'adult',
    gender: (row.gender as 'Male' | 'Female') ?? 'Female',
    loc: row.location ?? '',
    location: row.location ?? '',
    vacc: (row.vaccination as VaccinationStatus),
    tint,
    owner: row.poster_user_id,
    userId: row.poster_user_id,
    urgent: row.urgent,
    status: (row.status as AdoptionStatus),
    personality: row.personality ?? '',
    story: row.story ?? '',
    requirements: row.requirements ?? [],
    neutered: row.neutered,
    microchipped: row.microchipped,
    healthNotes: row.health_notes ?? '',
    gallery: urls ?? [tint],
    mediaUrls: urls,
    postedAt: new Date(row.posted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    adoptedDate: row.adopted_date ? new Date(row.adopted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined,
    adoptedNote: row.adopted_note ?? undefined,
    posterName: row.poster?.name,
    posterHandle: row.poster?.handle ?? undefined,
    posterTint: row.poster?.tint ?? undefined,
  };
}

function ageGroupFromAge(age: string): AdoptionListing['ageGroup'] {
  if (age.includes('week') || (age.includes('month') && parseInt(age, 10) < 12)) return 'puppy-kitten';
  if (age.includes('yr') && parseInt(age, 10) >= 7) return 'senior';
  if (age.includes('yr')) return 'adult';
  return 'young';
}

export function useAdoptionListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<AdoptionListing[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const savedIdsRef = useRef<Set<string>>(new Set());
  savedIdsRef.current = savedIds;

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: listingRows }, { data: saves }] = await Promise.all([
      supabase
        .from('adoption_listings')
        .select('*, poster:users!poster_user_id(name,handle,tint)')
        .is('deleted_at', null)
        .order('posted_at', { ascending: false }),
      supabase
        .from('adoption_listing_saves')
        .select('listing_id')
        .eq('user_id', user.id),
    ]);
    const ids = new Set<string>((saves ?? []).map((s: { listing_id: string }) => s.listing_id));
    setSavedIds(ids);
    savedIdsRef.current = ids;
    const rows = (listingRows ?? []) as DbListingRow[];
    const listingIds = rows.map(r => r.id);
    const mediaMap = await loadListingMediaUrls(listingIds);
    setListings(rows.map((r: DbListingRow) => rowToListing(r, ids, mediaMap[r.id])));
    setLoaded(true);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('adoption-listings-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'adoption_listings' },
        () => { load(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const toggleSaved = useCallback((id: string) => {
    if (!user) return;
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        supabase.from('adoption_listing_saves')
          .delete().eq('listing_id', id).eq('user_id', user.id)
          .then(({ error }) => { if (error) setSavedIds(p => { const r = new Set(p); r.add(id); return r; }); });
      } else {
        next.add(id);
        supabase.from('adoption_listing_saves')
          .insert({ listing_id: id, user_id: user.id })
          .then(({ error }) => { if (error) setSavedIds(p => { const r = new Set(p); r.delete(id); return r; }); });
      }
      return next;
    });
  }, [user]);

  const addListing = useCallback((input: CreateListingInput): Promise<AdoptionListing> => {
    if (!user) return Promise.reject(new Error('Not authenticated'));
    const tint = input.species === 'dog' ? '#E0503F' : '#7A5AE0';
    const optimisticId = `opt-${Date.now()}`;
    const localUrls = input.photos?.map(p => p.uri);
    const listing: AdoptionListing = {
      id: optimisticId,
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
      owner: user.id,
      userId: user.id,
      urgent: input.urgent || input.status === 'Urgent',
      status: input.status ?? (input.urgent ? 'Urgent' : 'Available'),
      personality: input.personality.trim(),
      story: input.story.trim(),
      requirements: input.requirements.filter(Boolean),
      neutered: input.neutered,
      microchipped: false,
      healthNotes: `Vaccination: ${input.vacc} · Sterilization: ${input.neutered ? 'Yes' : 'No'}`,
      gallery: localUrls?.length ? localUrls : [tint],
      mediaUrls: localUrls,
      postedAt: 'Just now',
    };
    setListings(prev => [listing, ...prev]);

    return new Promise((resolve, reject) => {
      supabase.from('adoption_listings').insert({
        poster_user_id: user.id,
        name: listing.name,
        species: listing.species,
        breed: listing.breed,
        age: listing.age,
        age_group: listing.ageGroup,
        gender: listing.gender,
        location: listing.location,
        icon: listing.icon,
        tint: listing.tint,
        vaccination: listing.vacc,
        neutered: listing.neutered,
        microchipped: false,
        health_notes: listing.healthNotes,
        personality: listing.personality,
        story: listing.story,
        requirements: listing.requirements,
        urgent: listing.urgent,
        status: listing.status,
      }).select('id').single().then(async ({ data, error }) => {
        if (error || !data) {
          setListings(prev => prev.filter(l => l.id !== optimisticId));
          reject(error ?? new Error('Failed to create listing'));
          return;
        }
        const realId = (data as { id: string }).id;
        let resolved = { ...listing, id: realId };
        setListings(prev => prev.map(l => l.id === optimisticId ? resolved : l));

        if (input.photos?.length) {
          try {
            const urls = await uploadListingPhotos(realId, user.id, input.photos);
            resolved = { ...resolved, mediaUrls: urls, gallery: urls };
            setListings(prev => prev.map(l => (
              l.id === realId ? resolved : l
            )));
          } catch {
            // listing saved without photos
          }
        }
        resolve(resolved);
      });
    });
  }, [user]);

  const updateListing = useCallback((id: string, patch: Partial<AdoptionListing>) => {
    setListings(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.species !== undefined) dbPatch.species = patch.species;
    if (patch.breed !== undefined) dbPatch.breed = patch.breed;
    if (patch.age !== undefined) { dbPatch.age = patch.age; dbPatch.age_group = ageGroupFromAge(patch.age); }
    if (patch.gender !== undefined) dbPatch.gender = patch.gender;
    if (patch.location !== undefined) dbPatch.location = patch.location;
    if (patch.vacc !== undefined) dbPatch.vaccination = patch.vacc;
    if (patch.neutered !== undefined) dbPatch.neutered = patch.neutered;
    if (patch.personality !== undefined) dbPatch.personality = patch.personality;
    if (patch.story !== undefined) dbPatch.story = patch.story;
    if (patch.requirements !== undefined) dbPatch.requirements = patch.requirements;
    if (patch.urgent !== undefined) dbPatch.urgent = patch.urgent;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.adoptedNote !== undefined) dbPatch.adopted_note = patch.adoptedNote;
    if (Object.keys(dbPatch).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.from('adoption_listings').update(dbPatch as any).eq('id', id).then(() => {});
    }
  }, []);

  const markAdopted = useCallback((id: string, note?: string) => {
    setListings(prev => prev.map(l => l.id === id ? {
      ...l, status: 'Adopted' as AdoptionStatus, urgent: false,
      adoptedDate: 'Just now', adoptedNote: note ?? 'Successfully adopted through Parul',
    } : l));
    supabase.from('adoption_listings').update({
      status: 'Adopted',
      urgent: false,
      adopted_date: new Date().toISOString(),
      adopted_note: note ?? 'Successfully adopted through Parul',
    }).eq('id', id).then(() => {});
  }, []);

  const relistListing = useCallback((id: string) => {
    if (!user) return;
    setListings(prev => prev.map(l =>
      l.id === id && l.userId === user.id
        ? { ...l, status: 'Available' as AdoptionStatus, urgent: false, adoptedDate: undefined, adoptedNote: undefined, postedAt: 'Just now' }
        : l,
    ));
    supabase.from('adoption_listings').update({
      status: 'Available', urgent: false, adopted_date: null, adopted_note: null,
      posted_at: new Date().toISOString(),
    }).eq('id', id).eq('poster_user_id', user.id).then(() => {});
  }, [user]);

  return {
    listings, setListings, savedIds, loaded, toggleSaved,
    addListing, updateListing, markAdopted, relistListing,
    reload: load,
  };
}
