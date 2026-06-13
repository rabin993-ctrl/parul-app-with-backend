import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ProfileTrust } from '../data/profileData';

export type ReviewItem = {
  id: string;
  authorId: string;
  authorName: string;
  authorTint: string;
  authorHandle: string;
  rating: number;
  body: string;
  createdAt: string;
};

const DEFAULT_TRUST: ProfileTrust = { rating: 0, reviewCount: 0, flagCount: 0, status: 'good' };

type DbReviewRow = {
  id: string;
  author_user_id: string;
  rating: number;
  body: string;
  created_at: string;
  author: { name: string; tint: string | null; handle: string } | null;
};

type DbTrustRow = {
  rating: string | number;
  review_count: string | number;
  flag_count: string | number;
  status: ProfileTrust['status'];
};

export function useReviews(userId: string | undefined) {
  const [trust, setTrust] = useState<ProfileTrust>(DEFAULT_TRUST);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setTrust(DEFAULT_TRUST);
      setReviews([]);
      return;
    }
    setLoading(true);
    const load = async () => {
      const [trustRes, reviewsRes] = await Promise.all([
        supabase
          .from('profile_trust')
          .select('rating,review_count,flag_count,status')
          .eq('user_id', userId)
          .single(),
        supabase
          .from('reviews')
          .select('id,author_user_id,rating,body,created_at,author:users!author_user_id(name,tint,handle)')
          .eq('subject_user_id', userId)
          .order('created_at', { ascending: false }),
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

      if (!reviewsRes.error && reviewsRes.data) {
        setReviews(
          (reviewsRes.data as DbReviewRow[]).map(r => ({
            id: r.id,
            authorId: r.author_user_id,
            authorName: r.author?.name ?? 'Unknown',
            authorTint: r.author?.tint ?? '#888888',
            authorHandle: r.author?.handle ?? '',
            rating: r.rating,
            body: r.body,
            createdAt: r.created_at,
          })),
        );
      }
    };
    load().finally(() => setLoading(false));
  }, [userId]);

  const addReview = useCallback(
    async (subjectUserId: string, rating: number, body: string) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('reviews')
        .insert({ subject_user_id: subjectUserId, author_user_id: authUser.id, rating, body });
      if (error) throw error;
      // Refetch
      setLoading(true);
      const [trustRes, reviewsRes] = await Promise.all([
        supabase
          .from('profile_trust')
          .select('rating,review_count,flag_count,status')
          .eq('user_id', subjectUserId)
          .single(),
        supabase
          .from('reviews')
          .select('id,author_user_id,rating,body,created_at,author:users!author_user_id(name,tint,handle)')
          .eq('subject_user_id', subjectUserId)
          .order('created_at', { ascending: false }),
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
      if (!reviewsRes.error && reviewsRes.data) {
        setReviews(
          (reviewsRes.data as DbReviewRow[]).map(r => ({
            id: r.id,
            authorId: r.author_user_id,
            authorName: r.author?.name ?? 'Unknown',
            authorTint: r.author?.tint ?? '#888888',
            authorHandle: r.author?.handle ?? '',
            rating: r.rating,
            body: r.body,
            createdAt: r.created_at,
          })),
        );
      }
      setLoading(false);
    },
    [],
  );

  return { trust, reviews, loading, addReview };
}
