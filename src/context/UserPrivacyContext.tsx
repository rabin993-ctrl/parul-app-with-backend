import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type ProfileVisibility = 'everyone' | 'circles' | 'only_me';
export type MessagePolicy = 'everyone' | 'circles' | 'none';

export type UserPrivacySettings = {
  profileVisibility: ProfileVisibility;
  postVisibility: ProfileVisibility;
  messagePolicy: MessagePolicy;
  discoverable: boolean;
  showOnline: boolean;
  showLocation: boolean;
  showCompanions: boolean;
  notifyPostActivity: boolean;
  notifyAdoptionUpdates: boolean;
  showTreatsOnProfile: boolean;
};

const DEFAULT_SETTINGS: UserPrivacySettings = {
  profileVisibility: 'everyone',
  postVisibility: 'everyone',
  messagePolicy: 'everyone',
  discoverable: true,
  showOnline: true,
  showLocation: true,
  showCompanions: true,
  notifyPostActivity: true,
  notifyAdoptionUpdates: true,
  showTreatsOnProfile: true,
};

type DbRow = {
  profile_visibility: ProfileVisibility;
  post_visibility: ProfileVisibility;
  message_policy: MessagePolicy;
  discoverable: boolean;
  show_online: boolean;
  show_location: boolean;
  show_companions: boolean;
  notify_post_activity: boolean;
  notify_adoption_updates: boolean;
  show_treats_on_profile: boolean;
};

function rowToSettings(row: DbRow): UserPrivacySettings {
  return {
    profileVisibility: row.profile_visibility,
    postVisibility: row.post_visibility,
    messagePolicy: row.message_policy,
    discoverable: row.discoverable,
    showOnline: row.show_online,
    showLocation: row.show_location,
    showCompanions: row.show_companions,
    notifyPostActivity: row.notify_post_activity,
    notifyAdoptionUpdates: row.notify_adoption_updates,
    showTreatsOnProfile: row.show_treats_on_profile,
  };
}

function settingsToRow(s: UserPrivacySettings): Omit<DbRow, never> {
  return {
    profile_visibility: s.profileVisibility,
    post_visibility: s.postVisibility,
    message_policy: s.messagePolicy,
    discoverable: s.discoverable,
    show_online: s.showOnline,
    show_location: s.showLocation,
    show_companions: s.showCompanions,
    notify_post_activity: s.notifyPostActivity,
    notify_adoption_updates: s.notifyAdoptionUpdates,
    show_treats_on_profile: s.showTreatsOnProfile,
  };
}

type UserPrivacyContextValue = {
  settings: UserPrivacySettings;
  blockedUserIds: string[];
  patchSettings: (patch: Partial<UserPrivacySettings>) => void;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  isBlocked: (userId: string) => boolean;
};

const UserPrivacyContext = createContext<UserPrivacyContextValue | null>(null);

export function UserPrivacyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserPrivacySettings>(DEFAULT_SETTINGS);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setBlockedUserIds([]);
      return;
    }
    const load = async () => {
      const [privRes, blockRes] = await Promise.all([
        supabase
          .from('user_privacy_settings')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('blocked_users')
          .select('blocked_id')
          .eq('blocker_id', user.id),
      ]);
      if (!privRes.error && privRes.data) setSettings(rowToSettings(privRes.data as DbRow));
      if (!blockRes.error && blockRes.data) {
        setBlockedUserIds((blockRes.data as { blocked_id: string }[]).map(r => r.blocked_id));
      }
    };
    load();
  }, [user?.id]);

  const patchSettings = useCallback((patch: Partial<UserPrivacySettings>) => {
    if (!user) return;
    setSettings(prev => {
      const next = { ...prev, ...patch };
      supabase
        .from('user_privacy_settings')
        .update(settingsToRow(next))
        .eq('user_id', user.id)
        .then(() => {});
      return next;
    });
  }, [user]);

  const blockUser = useCallback((userId: string) => {
    if (!user) return;
    setBlockedUserIds(prev => (prev.includes(userId) ? prev : [...prev, userId]));
    supabase
      .from('blocked_users')
      .insert({ blocker_id: user.id, blocked_id: userId })
      .then(() => {});
  }, [user]);

  const unblockUser = useCallback((userId: string) => {
    if (!user) return;
    setBlockedUserIds(prev => prev.filter(id => id !== userId));
    supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId)
      .then(() => {});
  }, [user]);

  const isBlocked = useCallback(
    (userId: string) => blockedUserIds.includes(userId),
    [blockedUserIds],
  );

  const value = useMemo(
    () => ({ settings, blockedUserIds, patchSettings, blockUser, unblockUser, isBlocked }),
    [settings, blockedUserIds, patchSettings, blockUser, unblockUser, isBlocked],
  );

  return (
    <UserPrivacyContext.Provider value={value}>
      {children}
    </UserPrivacyContext.Provider>
  );
}

export function useUserPrivacy() {
  const ctx = useContext(UserPrivacyContext);
  if (!ctx) throw new Error('useUserPrivacy must be used within UserPrivacyProvider');
  return ctx;
}
