import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import type { User } from '../data/mockData';
import { avatarUrlsFromMedia, fetchAvatarMedia } from '../lib/avatarMedia';
import type { PickedAsset } from '../hooks/useMediaPicker';
import { invalidateUserProfile } from '../hooks/useUserProfile';
import { supabase } from '../lib/supabase';
import { uploadMediaAsset, triggerThumbGeneration } from '../lib/uploads';
import { formatMemberSinceDate } from '../utils/time';
import { geocodeProfileLocation } from '../lib/alertFanOut';
import { persistUserCoordinates } from '../lib/geolocation';
import { useAuth } from './AuthContext';

export type UserProfilePatch = {
  bio?: string;
  location?: string;
  name?: string;
  handle?: string;
};

type CurrentUserProfileContextValue = {
  ready: boolean;
  me: User;
  updateProfile: (patch: UserProfilePatch) => Promise<void>;
  updateAvatar: (asset: PickedAsset) => Promise<void>;
};

const EMPTY_USER: User = {
  id: '',
  name: '',
  handle: '',
  tint: '#888888',
  loc: '',
  verified: false,
};

const USER_SELECT =
  'id,handle,name,tint,bio,location,website,verified,joined_at,avatar_media_id,location_lat';

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
  avatar_media_id: string | null;
  location_lat: number | null;
};

async function rowToUser(row: DbUserRow): Promise<User> {
  const loc = row.location ?? '';
  const base: User = {
    id: row.id,
    name: row.name,
    handle: row.handle,
    tint: row.tint ?? '#888888',
    loc,
    location: loc || undefined,
    verified: row.verified,
    bio: row.bio ?? undefined,
    website: row.website ?? undefined,
    joinedDate: formatMemberSinceDate(row.joined_at),
  };
  if (!row.avatar_media_id) return base;
  const media = await fetchAvatarMedia(row.avatar_media_id);
  return { ...base, ...avatarUrlsFromMedia(media) };
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
        .select(USER_SELECT)
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setMe(await rowToUser(data as DbUserRow));
        const row = data as DbUserRow;
        if (row.location_lat == null && row.location?.trim()) {
          const geocoded = await geocodeProfileLocation(row.location);
          if (geocoded) await persistUserCoordinates(geocoded);
        }
      }
      setReady(true);
    };
    load();
  }, [user?.id]);

  const updateProfile = useCallback(async (patch: UserProfilePatch) => {
    if (!user) return;
    const update: Partial<DbUserRow> = {};
    if (patch.bio !== undefined) update.bio = patch.bio;
    if (patch.location !== undefined) update.location = patch.location;
    if (patch.name !== undefined) update.name = patch.name.trim();
    if (patch.handle !== undefined) update.handle = patch.handle.trim().toLowerCase();
    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', user.id)
      .select(USER_SELECT)
      .single();
    if (error) {
      if (error.code === '23505') throw new Error('That username is already taken');
      throw error;
    }
    if (data) {
      setMe(await rowToUser(data as DbUserRow));
      invalidateUserProfile(user.id);
      if (patch.location !== undefined) {
        const geocoded = await geocodeProfileLocation(patch.location);
        if (geocoded) await persistUserCoordinates(geocoded);
      }
    }
  }, [user]);

  const updateAvatar = useCallback(async (asset: PickedAsset) => {
    if (!user) return;
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
    const { data, error } = await supabase
      .from('users')
      .update({ avatar_media_id: mediaId })
      .eq('id', user.id)
      .select(USER_SELECT)
      .single();
    if (error || !data) throw error ?? new Error('Failed to save profile photo');
    const next = await rowToUser(data as DbUserRow);
    setMe({
      ...next,
      avatarUrl: uploaded.originalUrl,
      avatarFallbackUrl: uploaded.originalUrl,
    });
    triggerThumbGeneration();
    invalidateUserProfile(user.id);
  }, [user]);

  const value = useMemo<CurrentUserProfileContextValue>(
    () => ({ ready, me, updateProfile, updateAvatar }),
    [ready, me, updateProfile, updateAvatar],
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
