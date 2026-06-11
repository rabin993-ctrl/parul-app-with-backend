import React, {
  createContext, useCallback, useContext, useMemo, useState,
} from 'react';
import { communities as initialCommunities, type Community } from '../data/mockData';
import { COMMUNITY_RULES } from '../data/communityPosts';

export type CommunityAdminSettings = {
  name: string;
  about: string;
  tint: string;
  defaultCategory: string;
  enabledTopics: string[];
  requirePhotoLostFound: boolean;
  allowLinks: boolean;
  postApproval: boolean;
  joinPolicy: 'open' | 'request' | 'invite';
  membersOnly: boolean;
  showLocation: boolean;
  discoverable: boolean;
  guidelines: string[];
};

const DEFAULT_ADMIN: Omit<CommunityAdminSettings, 'name' | 'about' | 'tint'> = {
  defaultCategory: 'general',
  enabledTopics: ['general', 'rescue', 'health', 'lost-found', 'tips', 'events'],
  requirePhotoLostFound: true,
  allowLinks: true,
  postApproval: false,
  joinPolicy: 'open',
  membersOnly: false,
  showLocation: true,
  discoverable: true,
  guidelines: [...COMMUNITY_RULES],
};

function buildAdminDefaults(community: Community): CommunityAdminSettings {
  return {
    name: community.name,
    about: community.about,
    tint: community.tint,
    ...DEFAULT_ADMIN,
  };
}

type CommunityGroupsContextValue = {
  communities: Community[];
  joinedCommunities: Community[];
  modCommunities: Community[];
  isMod: (communityId: string) => boolean;
  getCommunity: (id: string) => Community | undefined;
  toggleJoin: (id: string) => void;
  getAdminSettings: (communityId: string) => CommunityAdminSettings;
  updateAdminSettings: (communityId: string, patch: Partial<CommunityAdminSettings>) => void;
};

const CommunityGroupsContext = createContext<CommunityGroupsContextValue | null>(null);

export function CommunityGroupsProvider({ children }: { children: React.ReactNode }) {
  const [communities, setCommunities] = useState<Community[]>(initialCommunities);
  const [adminByGroup, setAdminByGroup] = useState<Record<string, CommunityAdminSettings>>(() => {
    const map: Record<string, CommunityAdminSettings> = {};
    initialCommunities.forEach(c => { map[c.id] = buildAdminDefaults(c); });
    return map;
  });

  const toggleJoin = useCallback((id: string) => {
    setCommunities(prev => prev.map(c => (
      c.id === id
        ? { ...c, joined: !c.joined, role: !c.joined ? 'Member' : null }
        : c
    )));
  }, []);

  const getCommunity = useCallback(
    (id: string) => communities.find(c => c.id === id),
    [communities],
  );

  const getAdminSettings = useCallback((communityId: string) => {
    const community = communities.find(c => c.id === communityId);
    if (!community) return { ...DEFAULT_ADMIN, name: '', about: '', tint: '#7C5CBF' };
    return adminByGroup[communityId] ?? buildAdminDefaults(community);
  }, [adminByGroup, communities]);

  const updateAdminSettings = useCallback((communityId: string, patch: Partial<CommunityAdminSettings>) => {
    setAdminByGroup(prev => {
      const community = communities.find(c => c.id === communityId);
      const base = prev[communityId] ?? (community ? buildAdminDefaults(community) : null);
      if (!base) return prev;
      return { ...prev, [communityId]: { ...base, ...patch } };
    });
    if (patch.name || patch.about) {
      setCommunities(prev => prev.map(c => (
        c.id === communityId
          ? { ...c, ...(patch.name ? { name: patch.name } : {}), ...(patch.about ? { about: patch.about } : {}) }
          : c
      )));
    }
  }, [communities]);

  const joinedCommunities = useMemo(() => communities.filter(c => c.joined), [communities]);
  const modCommunities = useMemo(
    () => communities.filter(c => c.joined && (c.role === 'Moderator' || c.role === 'Admin')),
    [communities],
  );

  const isMod = useCallback(
    (communityId: string) => {
      const c = communities.find(x => x.id === communityId);
      return c?.role === 'Moderator' || c?.role === 'Admin';
    },
    [communities],
  );

  const value = useMemo(
    () => ({
      communities,
      joinedCommunities,
      modCommunities,
      isMod,
      getCommunity,
      toggleJoin,
      getAdminSettings,
      updateAdminSettings,
    }),
    [communities, joinedCommunities, modCommunities, isMod, getCommunity, toggleJoin, getAdminSettings, updateAdminSettings],
  );

  return (
    <CommunityGroupsContext.Provider value={value}>
      {children}
    </CommunityGroupsContext.Provider>
  );
}

export function useCommunityGroups() {
  const ctx = useContext(CommunityGroupsContext);
  if (!ctx) throw new Error('useCommunityGroups must be used within CommunityGroupsProvider');
  return ctx;
}
