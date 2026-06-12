import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerDevReset } from '../dev/devResetRegistry';
import { restoreUserYou } from '../dev/seedSnapshots';
import { users, type User } from '../data/mockData';

const STORAGE_KEY = 'parul:currentUserProfile:you';

export type UserProfilePatch = {
  bio?: string;
  location?: string;
};

type CurrentUserProfileContextValue = {
  ready: boolean;
  me: User;
  updateProfile: (patch: UserProfilePatch) => Promise<void>;
};

const CurrentUserProfileContext = createContext<CurrentUserProfileContextValue | null>(null);

function applyPatchToUser(patch: UserProfilePatch) {
  if (patch.bio !== undefined) users.you.bio = patch.bio;
  if (patch.location !== undefined) {
    users.you.location = patch.location;
    users.you.loc = patch.location;
  }
}

export function CurrentUserProfileProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [patch, setPatch] = useState<UserProfilePatch>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as UserProfilePatch;
          applyPatchToUser(parsed);
          setPatch(parsed);
        } catch {
          /* keep seed data */
        }
      })
      .finally(() => setReady(true));
  }, []);

  const resetDevState = useCallback(async () => {
    restoreUserYou();
    setPatch({});
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => registerDevReset(resetDevState), [resetDevState]);

  const updateProfile = useCallback(async (next: UserProfilePatch) => {
    const merged: UserProfilePatch = { ...patch, ...next };
    applyPatchToUser(merged);
    setPatch(merged);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }, [patch]);

  const me = useMemo(
    () => ({ ...users.you, ...patch }),
    [patch],
  );

  const value = useMemo<CurrentUserProfileContextValue>(
    () => ({ ready, me, updateProfile }),
    [ready, me, updateProfile],
  );

  return (
    <CurrentUserProfileContext.Provider value={value}>
      {children}
    </CurrentUserProfileContext.Provider>
  );
}

export function useCurrentUserProfile() {
  const ctx = useContext(CurrentUserProfileContext);
  if (!ctx) throw new Error('useCurrentUserProfile must be used within CurrentUserProfileProvider');
  return ctx;
}
