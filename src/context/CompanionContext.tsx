import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { registerDevReset } from '../dev/devResetRegistry';
import { restoreCompanionsStore } from '../dev/seedSnapshots';
import { companions as companionsStore, type Companion } from '../data/mockData';
import type { AdoptionRecord } from '../data/adoptionRecords';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function defaultIcon(species: string): string {
  if (species === 'cat') return 'cat';
  if (species === 'dog') return 'dog';
  return 'paw';
}

function companionFromAdoption(record: AdoptionRecord): Companion {
  const id = slugify(record.petName);
  const siblings = Object.values(companionsStore)
    .filter(c => c.ownerId === record.adopterId && c.id !== id)
    .map(c => c.id);

  return {
    id,
    name: record.petName,
    species: record.species,
    icon: record.icon,
    breed: 'Adopted',
    age: '—',
    gender: '—',
    owner: 'you',
    ownerId: record.adopterId,
    tint: record.tint,
    traits: ['New family member'],
    vaccinated: false,
    neutered: false,
    microchipped: false,
    about: record.newHome
      ? `Adopted ${record.confirmedAt ?? 'recently'}. Now at ${record.newHome}.`
      : `Adopted ${record.confirmedAt ?? 'recently'}.`,
    handle: id,
    mood: 'Settling in at home 🐾',
    followers: 0,
    pawprints: 0,
    treats: 0,
    postsCount: 0,
    siblings,
    online: true,
    verified: false,
  };
}

function companionFromManual(input: {
  name: string;
  species: 'dog' | 'cat' | 'other';
  age: string;
  ownerId: string;
}): Companion {
  const id = slugify(input.name) || `companion-${Date.now()}`;
  const species = input.species === 'other' ? 'pet' : input.species;
  const tint = input.species === 'dog' ? '#F2972E' : input.species === 'cat' ? '#7A5AE0' : '#7C5CBF';
  const siblings = Object.values(companionsStore)
    .filter(c => c.ownerId === input.ownerId && c.id !== id)
    .map(c => c.id);

  return {
    id,
    name: input.name.trim(),
    species,
    icon: defaultIcon(species),
    breed: '—',
    age: input.age.trim() || '—',
    gender: '—',
    owner: input.ownerId,
    ownerId: input.ownerId,
    tint,
    traits: [],
    vaccinated: false,
    neutered: false,
    microchipped: false,
    about: '',
    handle: id,
    mood: 'New on the block 🐾',
    followers: 0,
    pawprints: 0,
    treats: 0,
    postsCount: 0,
    siblings,
    online: true,
    verified: false,
  };
}

function linkSiblings(newId: string, siblingIds: string[]) {
  for (const sid of siblingIds) {
    const s = companionsStore[sid];
    if (s && !s.siblings?.includes(newId)) {
      companionsStore[sid] = { ...s, siblings: [...(s.siblings ?? []), newId] };
    }
  }
}

function unlinkSibling(removedId: string) {
  for (const c of Object.values(companionsStore)) {
    if (c.siblings?.includes(removedId)) {
      companionsStore[c.id] = {
        ...c,
        siblings: c.siblings.filter(s => s !== removedId),
      };
    }
  }
}

type CompanionContextValue = {
  revision: number;
  getMyCompanions: (ownerId: string) => Companion[];
  hasCompanionForAdoption: (record: AdoptionRecord) => boolean;
  addFromAdoption: (record: AdoptionRecord) => Companion | null;
  addManual: (input: { name: string; species: 'dog' | 'cat' | 'other'; age: string; ownerId: string }) => Companion | null;
  removeCompanion: (id: string, ownerId: string) => Companion | null;
};

const CompanionContext = createContext<CompanionContextValue | null>(null);

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const [revision, setRevision] = useState(0);

  const bump = useCallback(() => setRevision(r => r + 1), []);

  const resetDevState = useCallback(() => {
    restoreCompanionsStore();
    bump();
  }, [bump]);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

  const getMyCompanions = useCallback((ownerId: string) => {
    return Object.values(companionsStore).filter(c => c.ownerId === ownerId);
  }, [revision]);

  const hasCompanionForAdoption = useCallback((record: AdoptionRecord) => {
    const id = slugify(record.petName);
    if (companionsStore[id]) return true;
    return Object.values(companionsStore).some(
      c => c.ownerId === record.adopterId
        && c.name.toLowerCase() === record.petName.toLowerCase(),
    );
  }, [revision]);

  const registerCompanion = useCallback((companion: Companion): Companion | null => {
    if (companionsStore[companion.id]) return null;
    companionsStore[companion.id] = companion;
    linkSiblings(companion.id, companion.siblings ?? []);
    bump();
    return companion;
  }, [bump]);

  const addFromAdoption = useCallback((record: AdoptionRecord) => {
    if (hasCompanionForAdoption(record)) return null;
    return registerCompanion(companionFromAdoption(record));
  }, [hasCompanionForAdoption, registerCompanion]);

  const addManual = useCallback((input: {
    name: string;
    species: 'dog' | 'cat' | 'other';
    age: string;
    ownerId: string;
  }) => {
    const trimmed = input.name.trim();
    if (!trimmed) return null;
    const id = slugify(trimmed);
    if (companionsStore[id]) return null;
    return registerCompanion(companionFromManual(input));
  }, [registerCompanion]);

  const removeCompanion = useCallback((id: string, ownerId: string) => {
    const companion = companionsStore[id];
    if (!companion || companion.ownerId !== ownerId) return null;
    delete companionsStore[id];
    unlinkSibling(id);
    bump();
    return companion;
  }, [bump]);

  const value = useMemo<CompanionContextValue>(() => ({
    revision,
    getMyCompanions,
    hasCompanionForAdoption,
    addFromAdoption,
    addManual,
    removeCompanion,
  }), [revision, getMyCompanions, hasCompanionForAdoption, addFromAdoption, addManual, removeCompanion]);

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
