import type { CirclePreviewData } from '../hooks/useCirclePreviews';

type ThreadRecencySource = {
  time: string;
  lastMessageAt?: string;
};

const EMPTY_CIRCLE_PREVIEW: CirclePreviewData = {
  lastMessage: '',
  lastMessageTime: '',
  unread: 0,
};

/** Higher = more recent. Used to sort inbox rows newest-first. */
export function recencyMillisFromThreadTime(time: string): number {
  if (!time) return 0;
  const now = Date.now();

  if (time === 'Now') return now;

  const minuteMatch = time.match(/^(\d+)m$/);
  if (minuteMatch) return now - parseInt(minuteMatch[1]!, 10) * 60_000;

  const hourMatch = time.match(/^(\d+)h$/);
  if (hourMatch) return now - parseInt(hourMatch[1]!, 10) * 3_600_000;

  const dayMatch = time.match(/^(\d+)d$/);
  if (dayMatch) return now - parseInt(dayMatch[1]!, 10) * 86_400_000;

  const parsed = Date.parse(time);
  if (!Number.isNaN(parsed)) return parsed;

  const withYear = Date.parse(`${time} ${new Date().getFullYear()}`);
  if (!Number.isNaN(withYear)) return withYear;

  return 0;
}

function recencyMillisFromCircleDisplayTime(time: string): number {
  if (!time) return 0;
  const now = new Date();

  if (time === 'Yesterday') {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    d.setHours(12, 0, 0, 0);
    return d.getTime();
  }

  const todayAt = Date.parse(`${now.toDateString()} ${time}`);
  if (!Number.isNaN(todayAt) && todayAt <= now.getTime() + 60_000) {
    return todayAt;
  }

  const parsed = Date.parse(time);
  if (!Number.isNaN(parsed)) return parsed;

  const withYear = Date.parse(`${time} ${now.getFullYear()}`);
  if (!Number.isNaN(withYear)) return withYear;

  return 0;
}

export function recencyMillisFromCirclePreview(
  preview: CirclePreviewData | undefined,
): number {
  if (!preview) return 0;
  if (preview.lastMessageAt) {
    const ms = new Date(preview.lastMessageAt).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return recencyMillisFromCircleDisplayTime(preview.lastMessageTime);
}

export function compareInboxRecencyDesc(
  aMs: number,
  bMs: number,
  aUnread = 0,
  bUnread = 0,
): number {
  if (bMs !== aMs) return bMs - aMs;
  return bUnread - aUnread;
}

export function sortThreadsByRecency<T extends { time: string; unread?: number }>(threads: T[]): T[] {
  return [...threads].sort((a, b) =>
    compareInboxRecencyDesc(
      recencyMillisFromThreadTime(a.time),
      recencyMillisFromThreadTime(b.time),
      a.unread ?? 0,
      b.unread ?? 0,
    ),
  );
}

export function sortCirclesByRecency<T extends { id: string }>(
  circles: T[],
  previews: Record<string, CirclePreviewData | undefined>,
): T[] {
  return [...circles].sort((a, b) =>
    compareInboxRecencyDesc(
      recencyMillisFromCirclePreview(previews[a.id] ?? EMPTY_CIRCLE_PREVIEW),
      recencyMillisFromCirclePreview(previews[b.id] ?? EMPTY_CIRCLE_PREVIEW),
      previews[a.id]?.unread ?? 0,
      previews[b.id]?.unread ?? 0,
    ),
  );
}
