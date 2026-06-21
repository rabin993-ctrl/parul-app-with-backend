/** First segment before comma for display (e.g. "Dhanmondi, Dhaka" → "Dhanmondi"). */
export function formatPostLocDisplay(loc: string | null | undefined): string {
  const trimmed = loc?.trim() ?? '';
  if (!trimmed) return '';
  return trimmed.split(',')[0]?.trim() ?? trimmed;
}

/** Build feed author meta: "2h · Dhanmondi · posted an alert". */
export function formatPostTimeLocMeta({
  time,
  loc,
  suffix,
}: {
  time: string;
  loc?: string | null;
  suffix?: string | null;
}): string {
  const parts = [time];
  const locDisplay = formatPostLocDisplay(loc);
  if (locDisplay) parts.push(locDisplay);
  if (suffix?.trim()) parts.push(suffix.trim());
  return parts.join(' · ');
}

/** Search result line: "@author · Name · loc" (omit empty segments). */
export function formatFeedSearchPostMeta(post: {
  author: string;
  authorName?: string;
  loc?: string;
}): string {
  const parts = [`@${post.author}`];
  if (post.authorName && post.author !== post.authorName) {
    parts.push(post.authorName);
  }
  const locDisplay = formatPostLocDisplay(post.loc);
  if (locDisplay) parts.push(locDisplay);
  return parts.join(' · ');
}
