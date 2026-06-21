import React, {
  createContext, useCallback, useContext, useMemo, useEffect, useRef, useState,
} from 'react';
import type { Companion } from '../data/mockData';
import type { AdoptionRecord } from '../data/adoptionRecords';
import { avatarUrlsFromMedia } from '../lib/avatarMedia';
import type { PickedAsset } from '../hooks/useMediaPicker';
import { uploadMediaAsset, triggerThumbGeneration } from '../lib/uploads';
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
  avatar_media_id: string | null;
};

const COMPANION_SELECT =
  'id,owner_id,name,handle,species,breed,age,gender,icon,tint,traits,mood,about,vaccinated,neutered,microchipped,pawprints,verified,avatar_media_id';

async function loadAvatarMediaMap(
  rows: DbCompanionRow[],
): Promise<Map<string, { url: string; thumb_url: string | null }>> {
  const mediaIds = rows
    .map(row => row.avatar_media_id)
    .filter((id): id is string => !!id);
  if (mediaIds.length === 0) return new Map();
  const { data } = await supabase
    .from('media_assets')
    .select('id,url,thumb_url')
    .in('id', mediaIds);
  const map = new Map<string, { url: string; thumb_url: string | null }>();
  for (const row of data ?? []) {
    map.set(row.id, { url: row.url, thumb_url: row.thumb_url });
  }
  return map;
}

function dbRowToCompanion(
  row: DbCompanionRow,
  siblingIds: string[] = [],
  avatarMedia?: { url: string; thumb_url: string | null } | null,
): Companion {
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
    ...avatarUrlsFromMedia(avatarMedia),
  };
}

type CompanionContextValue = {
  revision: number;
  companionsLoaded: boolean;
  getCompanion: (id: string) => Companion | null;
  getMyCompanions: (ownerId: string) => Companion[];
  fetchCompanionById: (id: string) => Promise<Companion | null>;
  fetchCompanionsForOwner: (ownerId: string) => Promise<Companion[]>;
  hasCompanionForAdoption: (record: AdoptionRecord) => boolean;
  addFromAdoption: (record: AdoptionRecord) => Companion | null;
  addManual: (input: { name: string; species: 'dog' | 'cat' | 'other'; age: string; ownerId: string }) => Companion | null;
  addManualAsync: (input: { name: string; species: 'dog' | 'cat' | 'other'; age: string; ownerId: string }) => Promise<Companion | null>;
  removeCompanion: (id: string) => Promise<Companion | null>;
  updateCompanionAvatar: (companionId: string, asset: PickedAsset) => Promise<void>;
  updateCompanionProfile: (
    companionId: string,
    patch: Partial<Pick<Companion, 'about' | 'mood' | 'breed' | 'age' | 'gender' | 'traits' | 'vaccinated' | 'neutered' | 'microchipped'>>,
  ) => Promise<void>;
};

const CompanionContext = createContext<CompanionContextValue | null>(null);

function rebuildSiblingLinks(map: Record<string, Companion>): void {
  for (const c of Object.values(map)) {
    c.siblings = Object.values(map)
      .filter(s => s.ownerId === c.ownerId && s.id !== c.id)
      .map(s => s.id);
  }
}

export function CompanionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const store = useRef<Record<string, Companion>>({});
  const pendingDeletes = useRef(new Set<string>());
  const inflightFetches = useRef(new Map<string, Promise<Companion | null>>());
  const loadGeneration = useRef(0);
  const [revision, setRevision] = useState(0);
  const [companionsLoaded, setCompanionsLoaded] = useState(false);
  const bump = useCallback(() => setRevision(r => r + 1), []);

  const mergeCompanionRows = useCallback((
    rows: DbCompanionRow[],
    avatarMediaMap: Map<string, { url: string; thumb_url: string | null }>,
  ) => {
    if (rows.length === 0) return;
    for (const row of rows) {
      if (pendingDeletes.current.has(row.id)) continue;
      const media = row.avatar_media_id
        ? avatarMediaMap.get(row.avatar_media_id) ?? null
        : null;
      store.current[row.id] = dbRowToCompanion(row, [], media);
    }
    rebuildSiblingLinks(store.current);
    bump();
  }, [bump]);

  const applyCompanionRows = useCallback((
    rows: DbCompanionRow[],
    avatarMediaMap: Map<string, { url: string; thumb_url: string | null }>,
  ) => {
    const map: Record<string, Companion> = {};
    for (const row of rows) {
      if (pendingDeletes.current.has(row.id)) continue;
      const media = row.avatar_media_id
        ? avatarMediaMap.get(row.avatar_media_id) ?? null
        : null;
      map[row.id] = dbRowToCompanion(row, [], media);
    }
    rebuildSiblingLinks(map);
    store.current = map;
    bump();
  }, [bump]);

  useEffect(() => {
    if (!user) {
      store.current = {};
      pendingDeletes.current.clear();
      setCompanionsLoaded(false);
      bump();
      return;
    }
    const generation = ++loadGeneration.current;
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('companions')
          .select(COMPANION_SELECT)
          .eq('owner_id', user.id)
          .is('deleted_at', null);
        if (cancelled || generation !== loadGeneration.current) return;
        if (!error && data) {
          const rows = data as DbCompanionRow[];
          const avatarMediaMap = await loadAvatarMediaMap(rows);
          if (cancelled || generation !== loadGeneration.current) return;
          applyCompanionRows(rows, avatarMediaMap);
        }
      } finally {
        if (!cancelled && generation === loadGeneration.current) setCompanionsLoaded(true);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const getCompanion = useCallback(
    (id: string): Companion | null => store.current[id] ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  const getMyCompanions = useCallback(
    (ownerId: string) => Object.values(store.current).filter(c => c.ownerId === ownerId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  const fetchCompanionById = useCallback(async (id: string): Promise<Companion | null> => {
    const cached = store.current[id];
    if (cached) return cached;

    const inflight = inflightFetches.current.get(id);
    if (inflight) return inflight;

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from('companions')
          .select(COMPANION_SELECT)
          .eq('id', id)
          .is('deleted_at', null)
          .maybeSingle();
        if (error || !data) return null;

        const row = data as DbCompanionRow;
        const avatarMediaMap = await loadAvatarMediaMap([row]);
        mergeCompanionRows([row], avatarMediaMap);
        return store.current[id] ?? null;
      } finally {
        inflightFetches.current.delete(id);
      }
    })();

    inflightFetches.current.set(id, promise);
    return promise;
  }, [mergeCompanionRows]);

  const fetchCompanionsForOwner = useCallback(async (ownerId: string): Promise<Companion[]> => {
    const { data, error } = await supabase
      .from('companions')
      .select(COMPANION_SELECT)
      .eq('owner_id', ownerId)
      .is('deleted_at', null);
    if (error || !data || data.length === 0) {
      return getMyCompanions(ownerId);
    }

    const rows = data as DbCompanionRow[];
    const avatarMediaMap = await loadAvatarMediaMap(rows);
    mergeCompanionRows(rows, avatarMediaMap);
    return getMyCompanions(ownerId);
  }, [getMyCompanions, mergeCompanionRows]);

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
      online: false,
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
    if (!user || input.ownerId !== user.id) return null;
    const trimmed = input.name.trim();
    if (!trimmed) return null;
    const nameTaken = Object.values(store.current).some(
      c => c.ownerId === user.id && c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (nameTaken) return null;

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
      online: false,
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
      online: false,
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

  const removeCompanion = useCallback(async (id: string): Promise<Companion | null> => {
    if (!user) return null;
    const companion = store.current[id];
    if (!companion || companion.ownerId !== user.id) return null;

    pendingDeletes.current.add(id);
    const snapshot = { ...companion };
    delete store.current[id];
    for (const c of Object.values(store.current)) {
      if (c.siblings?.includes(id)) {
        store.current[c.id] = { ...c, siblings: c.siblings.filter(s => s !== id) };
      }
    }
    bump();

    const rollback = () => {
      pendingDeletes.current.delete(id);
      store.current[id] = snapshot;
      rebuildSiblingLinks(store.current);
      bump();
    };

    let deleted = false;

    const { data: rpcData, error: rpcError } = await supabase.rpc('soft_delete_companion', {
      p_companion_id: id,
    });

    if (!rpcError) {
      deleted = (rpcData as { ok?: boolean } | null)?.ok === true;
    } else if (
      rpcError.code === '42883'
      || rpcError.code === 'PGRST202'
      || rpcError.message.includes('soft_delete_companion')
    ) {
      const { data: row, error: updateError } = await supabase
        .from('companions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('owner_id', user.id)
        .is('deleted_at', null)
        .select('id')
        .maybeSingle();

      if (updateError) {
        if (__DEV__) console.warn('[removeCompanion]', updateError.message);
        rollback();
        return null;
      }
      deleted = !!row;
    } else {
      if (__DEV__) console.warn('[removeCompanion]', rpcError.message);
      rollback();
      return null;
    }

    if (!deleted) {
      // Row may never have been persisted — keep the local removal.
      const { data: stillThere } = await supabase
        .from('companions')
        .select('id')
        .eq('id', id)
        .eq('owner_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (stillThere) {
        if (__DEV__) console.warn('[removeCompanion] row still present after RPC');
        rollback();
        return null;
      }
    }

    pendingDeletes.current.delete(id);
    return snapshot;
  }, [user, bump]);

  const updateCompanionAvatar = useCallback(async (companionId: string, asset: PickedAsset) => {
    if (!user) return;
    const companion = store.current[companionId];
    if (!companion || companion.ownerId !== user.id) return;

    const mediaId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const uploaded = await uploadMediaAsset({
      bucket: 'avatars',
      userId: user.id,
      mediaId,
      localUri: asset.uri,
      ext: asset.ext,
      mime: asset.mime,
      width: asset.width,
      height: asset.height,
      bytes: asset.bytes,
      generateVariants: false,
    });

    const { error } = await supabase
      .from('companions')
      .update({ avatar_media_id: mediaId })
      .eq('id', companionId)
      .eq('owner_id', user.id);
    if (error) throw error;

    store.current[companionId] = {
      ...companion,
      avatarUrl: uploaded.originalUrl,
      avatarFallbackUrl: uploaded.originalUrl,
    };
    triggerThumbGeneration();
    bump();
  }, [user, bump]);

  const updateCompanionProfile = useCallback(async (
    companionId: string,
    patch: Partial<Pick<Companion, 'about' | 'mood' | 'breed' | 'age' | 'gender' | 'traits' | 'vaccinated' | 'neutered' | 'microchipped'>>,
  ) => {
    if (!user) return;
    const companion = store.current[companionId];
    if (!companion || companion.ownerId !== user.id) return;

    const dbPatch: Record<string, unknown> = {};
    if (patch.about !== undefined) dbPatch.about = patch.about;
    if (patch.mood !== undefined) dbPatch.mood = patch.mood || null;
    if (patch.breed !== undefined) dbPatch.breed = patch.breed || null;
    if (patch.age !== undefined) dbPatch.age = patch.age || null;
    if (patch.gender !== undefined) dbPatch.gender = patch.gender || null;
    if (patch.traits !== undefined) dbPatch.traits = patch.traits;
    if (patch.vaccinated !== undefined) dbPatch.vaccinated = patch.vaccinated;
    if (patch.neutered !== undefined) dbPatch.neutered = patch.neutered;
    if (patch.microchipped !== undefined) dbPatch.microchipped = patch.microchipped;

    const { error } = await supabase
      .from('companions')
      .update(dbPatch as never)
      .eq('id', companionId)
      .eq('owner_id', user.id);
    if (error) throw error;

    store.current[companionId] = { ...companion, ...patch };
    bump();
  }, [user, bump]);

  const value = useMemo<CompanionContextValue>(() => ({
    revision,
    companionsLoaded,
    getCompanion,
    getMyCompanions,
    fetchCompanionById,
    fetchCompanionsForOwner,
    hasCompanionForAdoption,
    addFromAdoption,
    addManual,
    addManualAsync,
    removeCompanion,
    updateCompanionAvatar,
    updateCompanionProfile,
  }), [revision, companionsLoaded, getCompanion, getMyCompanions, fetchCompanionById, fetchCompanionsForOwner, hasCompanionForAdoption, addFromAdoption, addManual, addManualAsync, removeCompanion, updateCompanionAvatar, updateCompanionProfile]);

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
