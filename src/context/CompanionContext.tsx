import React, {
  createContext, useCallback, useContext, useMemo, useEffect, useRef, useState,
} from 'react';
import { companions as mockCompanions, type Companion } from '../data/mockData';
import type { AdoptionRecord } from '../data/adoptionRecords';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function defaultIcon(species: string): string {
  if (species === 'cat') return 'cat';
  if (species === 'dog') return 'dog';
  return 'paw';
}

function defaultTint(species: string): string {
  if (species === 'dog') return '#F2972E';
  if (species === 'cat') return '#7A5AE0';
  return '#7C5CBF';
}

function uuid4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

type DbCompanionRow = {
  id: string;
  owner_id: string;
  name: string;
  handle: string | null;
  species: string;
  breed: string | null;
  age: string | null;
  gender: string | null;
  icon: string | null;
  tint: string | null;
  traits: string[];
  mood: string | null;
  about: string | null;
  vaccinated: boolean;
  neutered: boolean;
  microchipped: boolean;
  pawprints: number;
  verified: boolean;
};

function dbRowToCompanion(row: DbCompanionRow, siblingIds: string[] = []): Companion {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    icon: row.icon ?? defaultIcon(row.species),
    breed: row.breed ?? '—',
    age: row.age ?? '—',
    gender: row.gender ?? '—',
    owner: row.owner_id,
    ownerId: row.owner_id,
    tint: row.tint ?? defaultTint(row.species),
    traits: row.traits ?? [],
    vaccinated: row.vaccinated,
    neutered: row.neutered,
    microchipped: row.microchipped,
    about: row.about ?? '',
    handle: row.handle ?? undefined,
    mood: row.mood ?? undefined,
    followers: 0,
    pawprints: row.pawprints,
    treats: 0,
    postsCount: 0,
    siblings: siblingIds,
    online: false,
    verified: row.verified,
  };
}

type CompanionContextValue = {
  revision: number;
  companionsLoaded: boolean;
  getCompanion: (id: string) => Companion | null;
  getMyCompanions: (ownerId: string) => Companion[];
  hasCompanionForAdoption: (record: AdoptionRecord) => boolean;
  addFromAdoption: (record: AdoptionRecord) => Companion | null;
  addManual: (input: { name: string; species: 'dog' | 'cat' | 'other'; age: string; ownerId: string }) => Companion | null;
  addManualAsync: (input: { name: string; species: 'dog' | 'cat' | 'other'; age: string; ownerId: string }) => Promise<Companion | null>;
  removeCompanion: (id: string, ownerId: string) => Companion | null;
};

const CompanionContext = createContext<CompanionContextValue | null>(null);

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const store = useRef<Record<string, Companion>>({});
  const [revision, setRevision] = useState(0);
  const [companionsLoaded, setCompanionsLoaded] = useState(false);
  const bump = useCallback(() => setRevision(r => r + 1), []);

  useEffect(() => {
    if (!user) {
      store.current = {};
      setCompanionsLoaded(false);
      bump();
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('companions')
          .select('id,owner_id,name,handle,species,breed,age,gender,icon,tint,traits,mood,about,vaccinated,neutered,microchipped,pawprints,verified')
          .is('deleted_at', null);
        if (cancelled) return;
        if (!error && data) {
          const map: Record<string, Companion> = {};
          for (const row of data as DbCompanionRow[]) {
            map[row.id] = dbRowToCompanion(row);
          }
          for (const c of Object.values(map)) {
            c.siblings = Object.values(map)
              .filter(s => s.ownerId === c.ownerId && s.id !== c.id)
              .map(s => s.id);
          }
          store.current = map;
          bump();
        }
      } finally {
        if (!cancelled) setCompanionsLoaded(true);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const getCompanion = useCallback(
    (id: string): Companion | null => store.current[id] ?? mockCompanions[id] ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  const getMyCompanions = useCallback(
    (ownerId: string) => Object.values(store.current).filter(c => c.ownerId === ownerId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  const hasCompanionForAdoption = useCallback((record: AdoptionRecord) => {
    return Object.values(store.current).some(
      c => c.ownerId === record.adopterId
        && c.name.toLowerCase() === record.petName.toLowerCase(),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision]);

  const addFromAdoption = useCallback((record: AdoptionRecord): Companion | null => {
    if (!user) return null;
    if (hasCompanionForAdoption(record)) return null;

    const id = uuid4();
    const siblingIds = Object.values(store.current)
      .filter(c => c.ownerId === user.id)
      .map(c => c.id);
    const aboutText = record.newHome
      ? `Adopted ${record.confirmedAt ?? 'recently'}. Now at ${record.newHome}.`
      : `Adopted ${record.confirmedAt ?? 'recently'}.`;

    const newCompanion: Companion = {
      id,
      name: record.petName,
      species: record.species,
      icon: record.icon,
      breed: 'Adopted',
      age: '—',
      gender: '—',
      owner: user.id,
      ownerId: user.id,
      tint: record.tint,
      traits: ['New family member'],
      vaccinated: false,
      neutered: false,
      microchipped: false,
      about: aboutText,
      handle: slugify(record.petName) || undefined,
      mood: 'Settling in at home 🐾',
      followers: 0,
      pawprints: 0,
      treats: 0,
      postsCount: 0,
      siblings: siblingIds,
      online: true,
      verified: false,
    };

    for (const sid of siblingIds) {
      const s = store.current[sid];
      if (s) store.current[sid] = { ...s, siblings: [...(s.siblings ?? []), id] };
    }
    store.current[id] = newCompanion;
    bump();

    supabase.from('companions').insert({
      id,
      owner_id: user.id,
      name: record.petName,
      species: record.species as 'dog' | 'cat' | 'other',
      icon: record.icon,
      breed: 'Adopted',
      tint: record.tint,
      traits: ['New family member'],
      about: aboutText,
      handle: slugify(record.petName) || null,
    }).then(({ error: e }) => {
      if (e) {
        delete store.current[id];
        for (const sid of siblingIds) {
          const s = store.current[sid];
          if (s) store.current[sid] = { ...s, siblings: (s.siblings ?? []).filter(x => x !== id) };
        }
        bump();
      }
    });

    return newCompanion;
  }, [user, hasCompanionForAdoption, bump]);

  const addManual = useCallback((input: {
    name: string;
    species: 'dog' | 'cat' | 'other';
    age: string;
    ownerId: string;
  }): Companion | null => {
    if (!user) return null;
    const trimmed = input.name.trim();
    if (!trimmed) return null;

    const duplicate = Object.values(store.current).find(
      c => c.ownerId === user.id && c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) return null;

    const id = uuid4();
    const siblingIds = Object.values(store.current)
      .filter(c => c.ownerId === user.id)
      .map(c => c.id);
    const ageStr = input.age.trim() || '—';

    const newCompanion: Companion = {
      id,
      name: trimmed,
      species: input.species === 'other' ? 'pet' : input.species,
      icon: defaultIcon(input.species),
      breed: '—',
      age: ageStr,
      gender: '—',
      owner: user.id,
      ownerId: user.id,
      tint: defaultTint(input.species),
      traits: [],
      vaccinated: false,
      neutered: false,
      microchipped: false,
      about: '',
      handle: slugify(trimmed) || undefined,
      mood: 'New on the block 🐾',
      followers: 0,
      pawprints: 0,
      treats: 0,
      postsCount: 0,
      siblings: siblingIds,
      online: true,
      verified: false,
    };

    for (const sid of siblingIds) {
      const s = store.current[sid];
      if (s) store.current[sid] = { ...s, siblings: [...(s.siblings ?? []), id] };
    }
    store.current[id] = newCompanion;
    bump();

    supabase.from('companions').insert({
      id,
      owner_id: user.id,
      name: trimmed,
      species: input.species,
      age: ageStr !== '—' ? ageStr : null,
      icon: defaultIcon(input.species),
      tint: defaultTint(input.species),
      handle: slugify(trimmed) || null,
      traits: [],
    }).then(({ error: e }) => {
      if (e) {
        delete store.current[id];
        for (const sid of siblingIds) {
          const s = store.current[sid];
          if (s) store.current[sid] = { ...s, siblings: (s.siblings ?? []).filter(x => x !== id) };
        }
        bump();
      }
    });

    return newCompanion;
  }, [user, bump]);

  const addManualAsync = useCallback(async (input: {
    name: string;
    species: 'dog' | 'cat' | 'other';
    age: string;
    ownerId: string;
  }): Promise<Companion | null> => {
    if (!user) return null;
    const trimmed = input.name.trim();
    if (!trimmed) return null;

    const duplicate = Object.values(store.current).find(
      c => c.ownerId === user.id && c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) return null;

    const id = uuid4();
    const siblingIds = Object.values(store.current)
      .filter(c => c.ownerId === user.id)
      .map(c => c.id);
    const ageStr = input.age.trim() || '—';

    const { error } = await supabase.from('companions').insert({
      id,
      owner_id: user.id,
      name: trimmed,
      species: input.species,
      age: ageStr !== '—' ? ageStr : null,
      icon: defaultIcon(input.species),
      tint: defaultTint(input.species),
      handle: slugify(trimmed) || null,
      traits: [],
    });

    if (error) return null;

    const newCompanion: Companion = {
      id,
      name: trimmed,
      species: input.species === 'other' ? 'pet' : input.species,
      icon: defaultIcon(input.species),
      breed: '—',
      age: ageStr,
      gender: '—',
      owner: user.id,
      ownerId: user.id,
      tint: defaultTint(input.species),
      traits: [],
      vaccinated: false,
      neutered: false,
      microchipped: false,
      about: '',
      handle: slugify(trimmed) || undefined,
      mood: 'New on the block 🐾',
      followers: 0,
      pawprints: 0,
      treats: 0,
      postsCount: 0,
      siblings: siblingIds,
      online: true,
      verified: false,
    };

    for (const sid of siblingIds) {
      const s = store.current[sid];
      if (s) store.current[sid] = { ...s, siblings: [...(s.siblings ?? []), id] };
    }
    store.current[id] = newCompanion;
    bump();

    return newCompanion;
  }, [user, bump]);

  const removeCompanion = useCallback((id: string, ownerId: string): Companion | null => {
    if (!user) return null;
    const companion = store.current[id];
    if (!companion || companion.ownerId !== ownerId) return null;

    delete store.current[id];
    for (const c of Object.values(store.current)) {
      if (c.siblings?.includes(id)) {
        store.current[c.id] = { ...c, siblings: c.siblings.filter(s => s !== id) };
      }
    }
    bump();

    supabase.from('companions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_id', ownerId)
      .then(({ error: e }) => {
        if (e) {
          store.current[id] = companion;
          bump();
        }
      });

    return companion;
  }, [user, bump]);

  const value = useMemo<CompanionContextValue>(() => ({
    revision,
    companionsLoaded,
    getCompanion,
    getMyCompanions,
    hasCompanionForAdoption,
    addFromAdoption,
    addManual,
    addManualAsync,
    removeCompanion,
  }), [revision, companionsLoaded, getCompanion, getMyCompanions, hasCompanionForAdoption, addFromAdoption, addManual, addManualAsync, removeCompanion]);

  return (
    <CompanionContext.Provider value={value}>
      {children}
    </CompanionContext.Provider>
  );
}

export function useCompanions() {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error('useCompanions must be used within CompanionProvider');
  return ctx;
}
