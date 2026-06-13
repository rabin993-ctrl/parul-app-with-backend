import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import type { User } from '../data/mockData';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type UserProfilePatch = {
  bio?: string;
  location?: string;
};

type CurrentUserProfileContextValue = {
  ready: boolean;
  me: User;
  updateProfile: (patch: UserProfilePatch) => Promise<void>;
};

const EMPTY_USER: User = {
  id: '',
  name: '',
  handle: '',
  tint: '#888888',
  loc: '',
  verified: false,
};

const CurrentUserProfileContext = createContext<CurrentUserProfileContextValue | null>(null);

type DbUserRow = {
  id: string;
  handle: string;
  name: string;
  tint: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  verified: boolean;
  joined_at: string;
};

function rowToUser(row: DbUserRow): User {
  const loc = row.location ?? '';
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    tint: row.tint ?? '#888888',
    loc,
    location: loc || undefined,
    verified: row.verified,
    bio: row.bio ?? undefined,
    website: row.website ?? undefined,
    joinedDate: row.joined_at,
  };
}

export function CurrentUserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<User>(EMPTY_USER);

  useEffect(() => {
    if (!user) {
      setMe(EMPTY_USER);
      setReady(false);
      return;
    }
    setReady(false);
    const load = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id,handle,name,tint,bio,location,website,verified,joined_at')
        .eq('id', user.id)
        .single();
      if (!error && data) setMe(rowToUser(data as DbUserRow));
      setReady(true);
    };
    load();
  }, [user?.id]);

  const updateProfile = useCallback(async (patch: UserProfilePatch) => {
    if (!user) return;
    const update: Partial<DbUserRow> = {};
    if (patch.bio !== undefined) update.bio = patch.bio;
    if (patch.location !== undefined) update.location = patch.location;
    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', user.id)
      .select('id,handle,name,tint,bio,location,website,verified,joined_at')
      .single();
    if (!error && data) setMe(rowToUser(data as DbUserRow));
  }, [user]);

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
