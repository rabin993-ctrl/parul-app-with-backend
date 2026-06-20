import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCompanions } from '../context/CompanionContext';
import type { Companion } from '../data/mockData';

export const TRAIT_OPTIONS = ['Friendly', 'Playful', 'Calm', 'Energetic', 'Shy', 'Curious'] as const;

export type CompanionProfileDraft = {
  about: string;
  mood: string;
  breed: string;
  age: string;
  gender: string;
  traits: string[];
  vaccinated: boolean;
  neutered: boolean;
  microchipped: boolean;
};

function draftFromCompanion(companion: Companion): CompanionProfileDraft {
  return {
    about: companion.about ?? '',
    mood: companion.mood ?? '',
    breed: companion.breed === '—' ? '' : companion.breed,
    age: companion.age === '—' ? '' : companion.age,
    gender: companion.gender === '—' ? '' : companion.gender,
    traits: companion.traits ?? [],
    vaccinated: companion.vaccinated,
    neutered: companion.neutered,
    microchipped: companion.microchipped,
  };
}

function draftsEqual(a: CompanionProfileDraft, b: CompanionProfileDraft): boolean {
  return (
    a.about === b.about
    && a.mood === b.mood
    && a.breed === b.breed
    && a.age === b.age
    && a.gender === b.gender
    && a.vaccinated === b.vaccinated
    && a.neutered === b.neutered
    && a.microchipped === b.microchipped
    && a.traits.length === b.traits.length
    && a.traits.every((trait, index) => trait === b.traits[index])
  );
}

function emptyDraft(): CompanionProfileDraft {
  return {
    about: '',
    mood: '',
    breed: '',
    age: '',
    gender: '',
    traits: [],
    vaccinated: false,
    neutered: false,
    microchipped: false,
  };
}

export function useCompanionProfileEdit(companion: Companion | null | undefined) {
  const { updateCompanionProfile } = useCompanions();
  const [draft, setDraft] = useState<CompanionProfileDraft>(() => (
    companion ? draftFromCompanion(companion) : emptyDraft()
  ));
  const [baseline, setBaseline] = useState<CompanionProfileDraft>(() => (
    companion ? draftFromCompanion(companion) : emptyDraft()
  ));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companion) return;
    const next = draftFromCompanion(companion);
    setDraft(next);
    setBaseline(next);
  }, [companion?.id, companion?.about, companion?.mood, companion?.breed, companion?.age,
    companion?.gender, companion?.traits, companion?.vaccinated, companion?.neutered,
    companion?.microchipped]);

  const isDirty = useMemo(() => !draftsEqual(draft, baseline), [draft, baseline]);

  const reset = useCallback(() => {
    setDraft(baseline);
  }, [baseline]);

  const save = useCallback(async () => {
    if (!companion || saving || !isDirty) return false;
    setSaving(true);
    try {
      await updateCompanionProfile(companion.id, {
        about: draft.about.trim(),
        mood: draft.mood.trim() || undefined,
        breed: draft.breed.trim() || '—',
        age: draft.age.trim() || '—',
        gender: draft.gender.trim() || '—',
        traits: draft.traits,
        vaccinated: draft.vaccinated,
        neutered: draft.neutered,
        microchipped: draft.microchipped,
      });
      const saved = {
        ...draft,
        about: draft.about.trim(),
        mood: draft.mood.trim(),
        breed: draft.breed.trim() || '—',
        age: draft.age.trim() || '—',
        gender: draft.gender.trim() || '—',
      };
      setDraft(saved);
      setBaseline(saved);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [companion, draft, isDirty, saving, updateCompanionProfile]);

  const patchDraft = useCallback((patch: Partial<CompanionProfileDraft>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  }, []);

  const toggleTrait = useCallback((trait: string) => {
    setDraft(prev => ({
      ...prev,
      traits: prev.traits.includes(trait)
        ? prev.traits.filter(t => t !== trait)
        : [...prev.traits, trait],
    }));
  }, []);

  return {
    draft,
    patchDraft,
    toggleTrait,
    isDirty,
    saving,
    save,
    reset,
  };
}
