import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { companions } from '../data/mockData';
import {
  getRescuesForUser,
  type ProfileTrust,
  type ProfileImpactStats,
} from '../data/profileData';
import {
  filterIncomingAdopted,
  filterOutgoingAdoptions,
  getAdopterTrustSummary,
} from '../data/adoptionRecords';
import { useAdoption } from '../context/AdoptionContext';
import { useFeedPosts } from '../context/FeedPostContext';

const DEFAULT_TRUST: ProfileTrust = { rating: 0, reviewCount: 0, flagCount: 0, status: 'good' };
const DEFAULT_STATS: ProfileImpactStats = { rescues: 0, rehomed: 0, adopted: 0 };

type DbTrustRow = {
  rating: string | number;
  review_count: string | number;
  flag_count: string | number;
  status: ProfileTrust['status'];
};

/** Shared profile feed data for own profile (ProfileHome) and public profile (UserProfile). */
export function useProfileViewData(userId: string) {
  const { records } = useAdoption();
  const { posts: feedPosts } = useFeedPosts();

  // Async data from Supabase
  const [trust, setTrust] = useState<ProfileTrust>(DEFAULT_TRUST);
  const [impactStats, setImpactStats] = useState<ProfileImpactStats>(DEFAULT_STATS);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [trustRes, rescueRes, rehomRes, adoptedRes] = await Promise.all([
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
      ]);

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
      });
    };
    load();
  }, [userId]);

  const companionIds = useMemo(
    () => new Set(
      Object.values(companions)
        .filter(c => c.ownerId === userId)
        .map(c => c.id),
    ),
    [userId],
  );

  const userCompanions = useMemo(
    () => Object.values(companions).filter(c => c.ownerId === userId),
    [userId],
  );

  // Posts/Rescues/Adoptions: still from mock sources until Wave 2–4 wire them
  const posts = useMemo(
    () => feedPosts.filter(p => {
      const isOwner =
        p.userId === userId ||
        (p.companionAuthorId != null && companionIds.has(p.companionAuthorId));
      return isOwner && !p.circle;
    }),
    [feedPosts, userId, companionIds],
  );

  const rescues = useMemo(() => getRescuesForUser(userId), [userId]);
  const outgoingAdoptions = useMemo(
    () => filterOutgoingAdoptions(records, userId),
    [records, userId],
  );
  const incomingAdopted = useMemo(
    () => filterIncomingAdopted(records, userId),
    [records, userId],
  );
  const adopterTrust = useMemo(
    () => getAdopterTrustSummary(records, userId),
    [records, userId],
  );

  return {
    posts,
    rescues,
    outgoingAdoptions,
    incomingAdopted,
    impactStats,
    trust,
    adopterTrust,
    userCompanions,
  };
}
