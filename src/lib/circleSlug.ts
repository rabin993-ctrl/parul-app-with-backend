import { supabase } from './supabase';

export const CIRCLE_USERNAME_UNAVAILABLE = 'Username not available';

export type CircleSlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function toSlugDraft(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function slugStatusFromDraft(raw: string): CircleSlugStatus {
  const normalized = toSlugDraft(raw);
  if (!normalized) return 'idle';
  if (normalized.length < 2) return 'invalid';
  return 'checking';
}

export async function fetchCircleSlugAvailability(
  raw: string,
  opts?: { excludeSlug?: string },
): Promise<CircleSlugStatus> {
  const normalized = toSlugDraft(raw);
  if (!normalized) return 'idle';
  if (normalized.length < 2) return 'invalid';
  if (opts?.excludeSlug && normalized === toSlugDraft(opts.excludeSlug)) {
    return 'available';
  }

  const { data } = await supabase.rpc(
    'check_circle_slug' as never,
    { p_slug: normalized } as never,
  ) as { data: { available: boolean } | null };

  return data?.available ? 'available' : 'taken';
}

export function circleSlugIndicator(
  status: CircleSlugStatus,
  colors: { textTertiary: string; success: string },
): { label: string; color: string } | null {
  if (status === 'checking') return { label: 'Checking…', color: colors.textTertiary };
  if (status === 'available') return { label: 'Available', color: colors.success };
  if (status === 'taken') return { label: CIRCLE_USERNAME_UNAVAILABLE, color: '#E5424F' };
  if (status === 'invalid') return { label: 'Min 2 characters', color: '#E5424F' };
  return null;
}
