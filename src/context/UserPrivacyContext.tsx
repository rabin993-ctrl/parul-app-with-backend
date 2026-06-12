import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
};

const DEFAULT_SETTINGS: UserPrivacySettings = {
  profileVisibility: 'everyone',
  postVisibility: 'everyone',
  messagePolicy: 'everyone',
  discoverable: true,
  showOnline: true,
  showLocation: true,
  showCompanions: true,
};

const SETTINGS_KEY = 'parul:privacySettings';
const BLOCKED_KEY = 'parul:blockedUsers';

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
  const [settings, setSettings] = useState<UserPrivacySettings>(DEFAULT_SETTINGS);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(SETTINGS_KEY),
      AsyncStorage.getItem(BLOCKED_KEY),
    ]).then(([rawSettings, rawBlocked]) => {
      if (rawSettings) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) });
        } catch {
          /* keep defaults */
        }
      }
      if (rawBlocked) {
        try {
          const parsed = JSON.parse(rawBlocked);
          if (Array.isArray(parsed)) setBlockedUserIds(parsed);
        } catch {
          /* keep empty */
        }
      }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(BLOCKED_KEY, JSON.stringify(blockedUserIds)).catch(() => {});
  }, [blockedUserIds, ready]);

  const patchSettings = useCallback((patch: Partial<UserPrivacySettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const blockUser = useCallback((userId: string) => {
    setBlockedUserIds(prev => (prev.includes(userId) ? prev : [...prev, userId]));
  }, []);

  const unblockUser = useCallback((userId: string) => {
    setBlockedUserIds(prev => prev.filter(id => id !== userId));
  }, []);

  const isBlocked = useCallback(
    (userId: string) => blockedUserIds.includes(userId),
    [blockedUserIds],
  );

  const value = useMemo(
    () => ({
      settings,
      blockedUserIds,
      patchSettings,
      blockUser,
      unblockUser,
      isBlocked,
    }),
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
