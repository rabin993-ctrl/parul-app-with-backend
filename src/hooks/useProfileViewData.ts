import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  type ProfileTrust,
  type ProfileImpactStats,
  type RescueCase,
  RESCUE_STATUS_META,
  formatRescueUpdateTime,
} from '../data/profileData';
import {
  filterIncomingAdopted,
  filterOutgoingAdoptions,
} from '../data/adoptionRecords';
import { useAdoption } from '../context/AdoptionContext';
import { useFeedPosts } from '../context/FeedPostContext';
import { useCompanions } from '../context/CompanionContext';
import { useAuth } from '../context/AuthContext';
import type { Companion } from '../data/mockData';
import { isUserProfileFeedPost } from '../utils/postCompanion';
import { fetchUserPrivacyFlags, getCachedUserPrivacyFlags } from '../lib/userPrivacyFlagCache';

const DEFAULT_TRUST: ProfileTrust = { rating: 0, reviewCount: 0, flagCount: 0, status: 'good' };
const DEFAULT_STATS: ProfileImpactStats = { rescues: 0, rehomed: 0, adopted: 0, following: 0 };

type DbTrustRow = {
  rating: string | number;
  review_count: string | number;
  flag_count: string | number;
  status: ProfileTrust['status'];
};

type DbRescaseCaseRow = {
  id: string;
  poster_user_id: string;
  case_code: string | null;
  name: string;
  species: string;
  icon: string | null;
  tint: string | null;
  status: string;
  location: string | null;
  story: string | null;
  tags: string[];
  created_at: string;
};

const SPECIES_META = {
  dog: { tint: '#14A697', icon: 'dog' },
  cat: { tint: '#7A5AE0', icon: 'cat' },
  other: { tint: '#C98E2A', icon: 'paw' },
} as const;

function mapDbRescue(row: DbRescaseCaseRow): RescueCase {
  const speciesKey = (row.species as keyof typeof SPECIES_META) in SPECIES_META
    ? (row.species as keyof typeof SPECIES_META)
    : 'other';
  return {
    id: row.id,
    userId: row.poster_user_id,
    name: row.name,
    species: row.species,
    icon: row.icon ?? SPECIES_META[speciesKey].icon,
    tint: row.tint ?? SPECIES_META[speciesKey].tint,
    status: (row.status ?? 'active') as RescueCase['status'],
    date: formatRescueUpdateTime(new Date(row.created_at)),
    location: row.location ?? '',
    story: row.story ?? '',
    caseId: row.case_code ?? undefined,
    tags: row.tags ?? [],
    followers: 0,
    updates: [],
  };
}

/** Shared profile feed data for own profile (ProfileHome) and public profile (UserProfile). */
export function useProfileViewData(userId: string) {
  const { user: authUser } = useAuth();
  const { records } = useAdoption();
  const { posts: feedPosts } = useFeedPosts();
  const { getMyCompanions, fetchCompanionsForOwner } = useCompanions();

  // Async data from Supabase
  const [trust, setTrust] = useState<ProfileTrust>(DEFAULT_TRUST);
  const [impactStats, setImpactStats] = useState<ProfileImpactStats>(DEFAULT_STATS);
  const [rescues, setRescues] = useState<RescueCase[]>([]);
  const [userCompanions, setUserCompanions] = useState<Companion[]>([]);
  const [skipCompanions, setSkipCompanions] = useState(false);

  useEffect(() => {
    if (!userId || authUser?.id === userId) {
      setSkipCompanions(false);
      return;
    }
    let cancelled = false;
    void fetchUserPrivacyFlags([userId]).then(() => {
      if (cancelled) return;
      const flags = getCachedUserPrivacyFlags(userId);
      setSkipCompanions(flags?.showCompanions === false);
    });
    return () => { cancelled = true; };
  }, [userId, authUser?.id]);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [trustRes, rescueRes, rehomRes, adoptedRes, rescueCasesRes, companionFollowRes] = await Promise.all([
        supabase
          .from('profile_trust')
          .select('rating,review_count,flag_count,status')
          .eq('user_id', userId)
          .single(),
        // Count rescue cases opened by this user
        supabase
          .from('rescue_cases')
          .select('id', { count: 'exact', head: true })
          .eq('poster_user_id', userId)
          .is('deleted_at', null),
        // Count adoption listings the user rehomed (status = 'Adopted')
        supabase
          .from('adoption_listings')
          .select('id', { count: 'exact', head: true })
          .eq('poster_user_id', userId)
          .eq('status', 'Adopted')
          .is('deleted_at', null),
        // Count adoption records where this user is the adopter
        supabase
          .from('adoption_records')
          .select('id', { count: 'exact', head: true })
          .eq('adopter_user_id', userId),
        // Fetch rescue cases for display
        supabase
          .from('rescue_cases')
          .select('id,poster_user_id,case_code,name,species,icon,tint,status,location,story,tags,created_at')
          .eq('poster_user_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
          .from('companion_followers')
          .select('companion_id')
          .eq('user_id', userId),
      ]);

      const companionFollowIds = (companionFollowRes.data ?? []).map(r => r.companion_id);

      const activeCompanionFollowsRes = companionFollowIds.length > 0
        ? await supabase
            .from('companions')
            .select('id')
            .in('id', companionFollowIds)
            .is('deleted_at', null)
        : { data: [] as { id: string }[], error: null };

      if (!trustRes.error && trustRes.data) {
        const t = trustRes.data as DbTrustRow;
        setTrust({
          rating: Number(t.rating),
          reviewCount: Number(t.review_count),
          flagCount: Number(t.flag_count),
          status: t.status,
        });
      }

      setImpactStats({
        rescues: rescueRes.count ?? 0,
        rehomed: rehomRes.count ?? 0,
        adopted: adoptedRes.count ?? 0,
        following: activeCompanionFollowsRes.data?.length ?? 0,
      });

      if (!rescueCasesRes.error && rescueCasesRes.data) {
        setRescues((rescueCasesRes.data as DbRescaseCaseRow[]).map(mapDbRescue));
      }
    };
    load();
  }, [userId]);

  useEffect(() => {
    if (!userId || skipCompanions) {
      if (skipCompanions) setUserCompanions([]);
      return;
    }
    const cached = getMyCompanions(userId);
    if (cached.length > 0) setUserCompanions(cached);

    let cancelled = false;
    fetchCompanionsForOwner(userId).then(companions => {
      if (!cancelled) setUserCompanions(companions);
    });
    return () => { cancelled = true; };
  }, [userId, skipCompanions, getMyCompanions, fetchCompanionsForOwner]);

  // Posts/Rescues/Adoptions: still from mock sources until Wave 2–4 wire them
  const posts = useMemo(
    () => feedPosts.filter(p => isUserProfileFeedPost(p, userId)),
    [feedPosts, userId],
  );

  const outgoingAdoptions = useMemo(
    () => filterOutgoingAdoptions(records, userId),
    [records, userId],
  );
  const incomingAdopted = useMemo(
    () => filterIncomingAdopted(records, userId),
    [records, userId],
  );

  return {
    posts,
    rescues,
    outgoingAdoptions,
    incomingAdopted,
    impactStats,
    trust,
    userCompanions,
  };
}
