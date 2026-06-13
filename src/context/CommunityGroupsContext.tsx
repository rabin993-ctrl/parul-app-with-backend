import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { COMMUNITY_RULES } from '../data/communityPosts';
import type { Community } from '../data/mockData';

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

export type CreateCommunityInput = {
  name: string;
  about: string;
  tint: string;
  icon: string;
  joinPolicy: CommunityAdminSettings['joinPolicy'];
  enabledTopics: string[];
};

export type CommunityPendingRequest = {
  id: string;
  communityId: string;
  userId: string;
  time: string;
  authorProfile?: {
    name: string;
    handle: string;
    tint: string | null;
  };
};

type DbCommunityRow = {
  id: string;
  name: string;
  about: string | null;
  icon: string | null;
  tint: string | null;
  join_policy: 'open' | 'request' | 'invite';
  default_category: string;
  enabled_topics: string[];
  guidelines: string[];
  require_photo_lost_found: boolean;
  allow_links: boolean;
  post_approval: boolean;
  members_only: boolean;
  show_location: boolean;
  discoverable: boolean;
  member_count: number;
};

type CommunityGroupsContextValue = {
  communities: Community[];
  joinedCommunities: Community[];
  adminCommunities: Community[];
  modCommunities: Community[];
  loading: boolean;
  isAdmin: (communityId: string) => boolean;
  isMod: (communityId: string) => boolean;
  getCommunity: (id: string) => Community | undefined;
  getPendingRequestCount: (communityId: string) => number;
  getPendingRequests: (communityId?: string) => CommunityPendingRequest[];
  acceptJoinRequest: (requestId: string) => void;
  declineJoinRequest: (requestId: string) => void;
  getCommunityMemberIds: (communityId: string) => string[];
  getCommunityMemberCount: (communityId: string) => number;
  formatCommunityMemberLabel: (communityId: string) => string;
  removeCommunityMember: (communityId: string, userId: string) => boolean;
  toggleJoin: (id: string) => void;
  createCommunity: (input: CreateCommunityInput) => Promise<Community>;
  getAdminSettings: (communityId: string) => CommunityAdminSettings;
  updateAdminSettings: (communityId: string, patch: Partial<CommunityAdminSettings>) => void;
};

const CommunityGroupsContext = createContext<CommunityGroupsContextValue | null>(null);

function formatMemberCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function mapToFrontendCommunity(row: DbCommunityRow, role: 'admin' | 'member' | null): Community {
  return {
    id: row.id,
    name: row.name,
    about: row.about ?? '',
    icon: row.icon ?? 'dog',
    tint: row.tint ?? '#F2972E',
    members: formatMemberCount(row.member_count),
    joined: role !== null,
    role: role === 'admin' ? 'Admin' : role === 'member' ? 'Member' : null,
    joinPolicy: row.join_policy,
  };
}

function mapToAdminSettings(row: DbCommunityRow): CommunityAdminSettings {
  return {
    name: row.name,
    about: row.about ?? '',
    tint: row.tint ?? '#7C5CBF',
    defaultCategory: row.default_category,
    enabledTopics: row.enabled_topics ?? ['general'],
    requirePhotoLostFound: row.require_photo_lost_found,
    allowLinks: row.allow_links,
    postApproval: row.post_approval,
    joinPolicy: row.join_policy,
    membersOnly: row.members_only,
    showLocation: row.show_location,
    discoverable: row.discoverable,
    guidelines: row.guidelines?.length ? row.guidelines : [...COMMUNITY_RULES],
  };
}

export function CommunityGroupsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [dbRows, setDbRows] = useState<Record<string, DbCommunityRow>>({});
  const [pendingRequests, setPendingRequests] = useState<CommunityPendingRequest[]>([]);
  const [membersByGroup, setMembersByGroup] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!user) {
      setCommunities([]);
      setDbRows({});
      setPendingRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [
      { data: comms },
      { data: memberships },
      { data: requests },
    ] = await Promise.all([
      supabase.from('communities').select('*').order('name'),
      supabase.from('community_members')
        .select('community_id, role')
        .eq('user_id', user.id),
      supabase.from('community_join_requests')
        .select('id, community_id, user_id, created_at, requester:users!community_join_requests_user_id_fkey(name, handle, tint)')
        .eq('state', 'pending'),
    ]);

    const myRoles = new Map<string, 'admin' | 'member'>(
      (memberships ?? []).map(m => [m.community_id, m.role as 'admin' | 'member']),
    );

    const rows = (comms ?? []) as DbCommunityRow[];
    const rowMap: Record<string, DbCommunityRow> = {};
    rows.forEach(r => { rowMap[r.id] = r; });

    const mapped = rows.map(r => mapToFrontendCommunity(r, myRoles.get(r.id) ?? null));

    const pending: CommunityPendingRequest[] = (requests ?? []).map((r: any) => ({
      id: r.id,
      communityId: r.community_id,
      userId: r.user_id,
      time: formatRelativeTime(r.created_at),
      authorProfile: r.requester ?? undefined,
    }));

    setDbRows(rowMap);
    setCommunities(mapped);
    setPendingRequests(pending);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleJoin = useCallback((id: string) => {
    if (!user) return;
    const community = communities.find(c => c.id === id);
    if (!community || community.role === 'Admin') return;
    const isJoined = community.joined;
    const row = dbRows[id];

    setCommunities(prev => prev.map(c =>
      c.id !== id ? c : { ...c, joined: !isJoined, role: !isJoined ? 'Member' : null },
    ));

    if (isJoined) {
      supabase.rpc('leave_community', { p_community: id });
    } else if (row?.join_policy === 'request') {
      supabase.rpc('send_community_request', { p_community: id });
      // Pending approval — revert joined flag
      setCommunities(prev => prev.map(c =>
        c.id !== id ? c : { ...c, joined: false, role: null },
      ));
    } else {
      supabase.rpc('join_community', { p_community: id });
    }
  }, [user, communities, dbRows]);

  const createCommunity = useCallback(async (input: CreateCommunityInput): Promise<Community> => {
    if (!user) throw new Error('not_authenticated');

    const { data: newId, error } = await supabase.rpc('create_community', {
      p_name: input.name.trim(),
      p_about: input.about.trim(),
      p_icon: input.icon,
      p_tint: input.tint,
      p_join_policy: input.joinPolicy,
    });
    if (error || !newId) throw error ?? new Error('create_failed');

    const { data: newRow } = await supabase.from('communities').select('*').eq('id', newId).single();

    const community: Community = {
      id: newId,
      name: input.name.trim(),
      about: input.about.trim(),
      icon: input.icon,
      tint: input.tint,
      members: '1',
      joined: true,
      role: 'Admin',
    };

    if (newRow) {
      setDbRows(prev => ({ ...prev, [newId]: newRow as DbCommunityRow }));
    }
    setCommunities(prev => [...prev, community]);
    setMembersByGroup(prev => ({ ...prev, [newId]: [user.id] }));

    return community;
  }, [user]);

  const getCommunity = useCallback(
    (id: string) => communities.find(c => c.id === id),
    [communities],
  );

  const getPendingRequestCount = useCallback(
    (communityId: string) => pendingRequests.filter(r => r.communityId === communityId).length,
    [pendingRequests],
  );

  const getPendingRequests = useCallback(
    (communityId?: string) =>
      communityId ? pendingRequests.filter(r => r.communityId === communityId) : pendingRequests,
    [pendingRequests],
  );

  const acceptJoinRequest = useCallback((requestId: string) => {
    supabase.rpc('accept_community_request', { p_request_id: requestId }).then(() => loadAll());
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  }, [loadAll]);

  const declineJoinRequest = useCallback((requestId: string) => {
    supabase.rpc('decline_community_request', { p_request_id: requestId });
    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
  }, []);

  const getCommunityMemberIds = useCallback(
    (communityId: string) => membersByGroup[communityId] ?? [],
    [membersByGroup],
  );

  const getCommunityMemberCount = useCallback(
    (communityId: string) => {
      const row = dbRows[communityId];
      if (row) return row.member_count;
      return membersByGroup[communityId]?.length ?? 0;
    },
    [dbRows, membersByGroup],
  );

  const formatCommunityMemberLabel = useCallback(
    (communityId: string) => {
      const n = getCommunityMemberCount(communityId);
      return `${n} member${n !== 1 ? 's' : ''}`;
    },
    [getCommunityMemberCount],
  );

  const removeCommunityMember = useCallback((communityId: string, userId: string) => {
    if (!user || userId === user.id) return false;
    supabase.rpc('remove_community_member', { p_community: communityId, p_user: userId });
    setMembersByGroup(prev => {
      const current = prev[communityId] ?? [];
      if (!current.includes(userId)) return prev;
      return { ...prev, [communityId]: current.filter(id => id !== userId) };
    });
    setDbRows(prev => {
      const row = prev[communityId];
      if (!row) return prev;
      return { ...prev, [communityId]: { ...row, member_count: Math.max(0, row.member_count - 1) } };
    });
    setCommunities(prev => prev.map(c => {
      if (c.id !== communityId) return c;
      const row = dbRows[communityId];
      const newCount = row ? Math.max(0, row.member_count - 1) : 0;
      return { ...c, members: formatMemberCount(newCount) };
    }));
    return true;
  }, [user, dbRows]);

  const getAdminSettings = useCallback((communityId: string): CommunityAdminSettings => {
    const row = dbRows[communityId];
    if (row) return mapToAdminSettings(row);
    const community = communities.find(c => c.id === communityId);
    return {
      name: community?.name ?? '',
      about: community?.about ?? '',
      tint: community?.tint ?? '#7C5CBF',
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
  }, [dbRows, communities]);

  const updateAdminSettings = useCallback((communityId: string, patch: Partial<CommunityAdminSettings>) => {
    setDbRows(prev => {
      const row = prev[communityId];
      if (!row) return prev;
      return {
        ...prev,
        [communityId]: {
          ...row,
          ...(patch.name != null ? { name: patch.name } : {}),
          ...(patch.about != null ? { about: patch.about } : {}),
          ...(patch.tint != null ? { tint: patch.tint } : {}),
          ...(patch.joinPolicy != null ? { join_policy: patch.joinPolicy } : {}),
          ...(patch.allowLinks != null ? { allow_links: patch.allowLinks } : {}),
          ...(patch.postApproval != null ? { post_approval: patch.postApproval } : {}),
          ...(patch.membersOnly != null ? { members_only: patch.membersOnly } : {}),
          ...(patch.discoverable != null ? { discoverable: patch.discoverable } : {}),
          ...(patch.guidelines != null ? { guidelines: patch.guidelines } : {}),
          ...(patch.enabledTopics != null ? { enabled_topics: patch.enabledTopics } : {}),
          ...(patch.requirePhotoLostFound != null ? { require_photo_lost_found: patch.requirePhotoLostFound } : {}),
        },
      };
    });
    if (patch.name || patch.about || patch.tint) {
      setCommunities(prev => prev.map(c =>
        c.id === communityId
          ? {
            ...c,
            ...(patch.name ? { name: patch.name } : {}),
            ...(patch.about ? { about: patch.about } : {}),
            ...(patch.tint ? { tint: patch.tint } : {}),
          }
          : c,
      ));
    }

    supabase.rpc('update_community_settings', {
      p_community: communityId,
      ...(patch.name != null ? { p_name: patch.name } : {}),
      ...(patch.about != null ? { p_about: patch.about } : {}),
      ...(patch.tint != null ? { p_tint: patch.tint } : {}),
      ...(patch.joinPolicy != null ? { p_join_policy: patch.joinPolicy } : {}),
      ...(patch.allowLinks != null ? { p_allow_links: patch.allowLinks } : {}),
      ...(patch.postApproval != null ? { p_post_approval: patch.postApproval } : {}),
      ...(patch.membersOnly != null ? { p_members_only: patch.membersOnly } : {}),
      ...(patch.discoverable != null ? { p_discoverable: patch.discoverable } : {}),
    });
  }, []);

  const joinedCommunities = useMemo(() => communities.filter(c => c.joined), [communities]);
  const adminCommunities = useMemo(
    () => communities.filter(c => c.joined && c.role === 'Admin'),
    [communities],
  );
  const modCommunities = useMemo(
    () => communities.filter(c => c.joined && (c.role === 'Moderator' || c.role === 'Admin')),
    [communities],
  );

  const isAdmin = useCallback(
    (communityId: string) => communities.find(x => x.id === communityId)?.role === 'Admin',
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
      adminCommunities,
      modCommunities,
      loading,
      isAdmin,
      isMod,
      getCommunity,
      getPendingRequestCount,
      getPendingRequests,
      acceptJoinRequest,
      declineJoinRequest,
      getCommunityMemberIds,
      getCommunityMemberCount,
      formatCommunityMemberLabel,
      removeCommunityMember,
      toggleJoin,
      createCommunity,
      getAdminSettings,
      updateAdminSettings,
    }),
    [
      communities, joinedCommunities, adminCommunities, modCommunities, loading,
      isAdmin, isMod, getCommunity, getPendingRequestCount, getPendingRequests,
      acceptJoinRequest, declineJoinRequest, getCommunityMemberIds,
      getCommunityMemberCount, formatCommunityMemberLabel, removeCommunityMember,
      toggleJoin, createCommunity, getAdminSettings, updateAdminSettings,
    ],
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
