import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { upsertUserPrivacySettings } from '../utils/userPrivacySettings';
import { refreshUserPrivacyFlags } from '../lib/userPrivacyFlagCache';
import { touchOnlinePresence } from '../lib/onlinePresence';
import { useAuth } from './AuthContext';
import { useTreatWallet } from './TreatWalletContext';

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

export const DEFAULT_PRIVACY_SETTINGS: UserPrivacySettings = {
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

type UserPrivacyContextValue = {
  settings: UserPrivacySettings;
  blockedUserIds: string[];
  patchSettings: (patch: Partial<UserPrivacySettings>) => Promise<boolean>;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  isBlocked: (userId: string) => boolean;
  reportUser: (userId: string, reason?: string) => void;
};

const UserPrivacyContext = createContext<UserPrivacyContextValue | null>(null);

function UserPrivacyProviderInner({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { syncShowTreatsOnProfile } = useTreatWallet();
  const [settings, setSettings] = useState<UserPrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_PRIVACY_SETTINGS);
      setBlockedUserIds([]);
      return;
    }
    const load = async () => {
      const [privRes, blockRes] = await Promise.all([
        supabase
          .from('user_privacy_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('blocked_users')
          .select('blocked_id')
          .eq('blocker_id', user.id),
      ]);

      if (privRes.data) {
        const loaded = rowToSettings(privRes.data as DbRow);
        setSettings(loaded);
        syncShowTreatsOnProfile(loaded.showTreatsOnProfile);
        if (loaded.showOnline) void touchOnlinePresence();
      } else if (!privRes.error || privRes.error.code === 'PGRST116') {
        const inserted = await upsertUserPrivacySettings(user.id, DEFAULT_PRIVACY_SETTINGS);
        if (inserted.ok) {
          setSettings(DEFAULT_PRIVACY_SETTINGS);
          syncShowTreatsOnProfile(DEFAULT_PRIVACY_SETTINGS.showTreatsOnProfile);
          if (DEFAULT_PRIVACY_SETTINGS.showOnline) void touchOnlinePresence();
        }
      }

      if (!blockRes.error && blockRes.data) {
        setBlockedUserIds((blockRes.data as { blocked_id: string }[]).map(r => r.blocked_id));
      }
    };
    load();
  }, [user?.id, syncShowTreatsOnProfile]);

  const patchSettings = useCallback(async (patch: Partial<UserPrivacySettings>): Promise<boolean> => {
    if (!user) return false;

    let prev!: UserPrivacySettings;
    let next!: UserPrivacySettings;
    setSettings(current => {
      prev = current;
      next = { ...current, ...patch };
      return next;
    });

    if ('showTreatsOnProfile' in patch) {
      syncShowTreatsOnProfile(next.showTreatsOnProfile);
    }

    const result = await upsertUserPrivacySettings(user.id, next);
    if (!result.ok) {
      setSettings(prev);
      if ('showTreatsOnProfile' in patch) {
        syncShowTreatsOnProfile(prev.showTreatsOnProfile);
      }
      if (__DEV__) {
        console.warn('[UserPrivacyContext] patchSettings failed:', result.message);
      }
      return false;
    }
    void refreshUserPrivacyFlags([user.id]);
    if (next.showOnline) {
      void touchOnlinePresence();
    }
    return true;
  }, [user, syncShowTreatsOnProfile]);

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

  const reportUser = useCallback((userId: string, reason?: string) => {
    if (!user) return;
    supabase.from('reports').insert({
      reporter_user_id: user.id,
      target_type: 'user',
      target_id: userId,
      reason: reason ?? 'User report',
    }).then(() => {});
  }, [user]);

  const value = useMemo(
    () => ({ settings, blockedUserIds, patchSettings, blockUser, unblockUser, isBlocked, reportUser }),
    [settings, blockedUserIds, patchSettings, blockUser, unblockUser, isBlocked, reportUser],
  );

  return (
    <UserPrivacyContext.Provider value={value}>
      {children}
    </UserPrivacyContext.Provider>
  );
}

export function UserPrivacyProvider({ children }: { children: React.ReactNode }) {
  return <UserPrivacyProviderInner>{children}</UserPrivacyProviderInner>;
}

export function useUserPrivacy() {
  const ctx = useContext(UserPrivacyContext);
  if (!ctx) throw new Error('useUserPrivacy must be used within UserPrivacyProvider');
  return ctx;
}
