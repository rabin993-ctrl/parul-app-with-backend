/** Create a new Paw Circle from the hub header. */
export const CREATE_CIRCLE_ICON = 'plus';

export const CREATE_CIRCLE_A11Y_LABEL = 'Create circle';

/** Pending circle join requests — people waiting to join, not settings or notifications. */
export const PENDING_JOIN_REQUESTS_ICON = 'user-plus';

export const PENDING_JOIN_REQUESTS_A11Y_LABEL = 'Pending join requests';

/** Sheet title: "1 join request" vs "3 join requests" (handles loading placeholders). */
export function formatJoinRequestsTitle(
  displayCount: number | string,
  countForPlural?: number,
): string {
  const parsedDisplay = typeof displayCount === 'number'
    ? displayCount
    : Number.parseInt(displayCount, 10);
  const n = countForPlural ?? (Number.isFinite(parsedDisplay) ? parsedDisplay : NaN);
  const word = n === 1 ? 'request' : 'requests';
  const display = typeof displayCount === 'number' ? String(displayCount) : displayCount;
  return `${display} join ${word}`;
}
