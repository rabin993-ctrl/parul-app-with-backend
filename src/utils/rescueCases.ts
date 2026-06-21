import { supabase } from '../lib/supabase';
import { loadRescueUpdateMediaUrls } from '../lib/rescueMedia';
import {
  formatRescueUpdateTime,
  type RescueCase,
  type RescueStatus,
  type RescueUpdate,
} from '../data/profileData';

const SPECIES_META = {
  dog: { tint: '#14A697', icon: 'dog' },
  cat: { tint: '#7A5AE0', icon: 'cat' },
  other: { tint: '#C98E2A', icon: 'paw' },
} as const;

type DbCaseRow = {
  id: string;
  poster_user_id: string;
  case_code: string | null;
  name: string;
  species: string;
  icon: string | null;
  tint: string | null;
  status: string;
  location: string | null;
  headline: string | null;
  story: string | null;
  tags: string[];
  post_id: string | null;
  created_at: string;
};

type DbUpdateRow = {
  id: string;
  case_id: string;
  text: string | null;
  photo_count: number;
  created_at: string;
};

function formatDate(iso: string): string {
  return formatRescueUpdateTime(new Date(iso));
}

function mapCaseRow(
  row: DbCaseRow,
  updates: DbUpdateRow[],
  followerCount: number,
): RescueCase {
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
    status: row.status as RescueStatus,
    date: formatDate(row.created_at),
    location: row.location ?? '',
    story: row.story ?? '',
    postId: row.post_id ?? undefined,
    caseId: row.case_code ?? undefined,
    headline: row.headline ?? undefined,
    tags: row.tags ?? [],
    followers: followerCount,
    updates: updates.map(u => ({
      id: u.id,
      time: formatDate(u.created_at),
      text: u.text ?? '',
      photoCount: u.photo_count ?? 0,
      hasPhoto: (u.photo_count ?? 0) > 0,
    } satisfies RescueUpdate)),
  };
}

async function attachMediaToCase(item: RescueCase): Promise<RescueCase> {
  const updates = item.updates ?? [];
  if (updates.length === 0) return item;
  const mediaMap = await loadRescueUpdateMediaUrls(updates.map(u => u.id));
  return {
    ...item,
    updates: updates.map(u => ({
      ...u,
      mediaUrls: mediaMap[u.id] ?? u.mediaUrls,
      photoCount: mediaMap[u.id]?.length ?? u.photoCount ?? 0,
    })),
  };
}

/** Load a single rescue case from Supabase (for deep links / notification routes outside RescueFeedProvider). */
export async function fetchRescueCaseById(caseId: string): Promise<RescueCase | null> {
  const [caseRes, updatesRes, followersRes] = await Promise.all([
    supabase
      .from('rescue_cases')
      .select('id, poster_user_id, case_code, name, species, icon, tint, status, location, headline, story, tags, post_id, created_at')
      .eq('id', caseId)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('rescue_updates')
      .select('id, case_id, text, photo_count, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false }),
    supabase
      .from('rescue_case_followers')
      .select('case_id', { count: 'exact', head: true })
      .eq('case_id', caseId),
  ]);

  if (caseRes.error || !caseRes.data) return null;

  const item = mapCaseRow(
    caseRes.data as DbCaseRow,
    (updatesRes.data ?? []) as DbUpdateRow[],
    followersRes.count ?? 0,
  );
  return attachMediaToCase(item);
}
