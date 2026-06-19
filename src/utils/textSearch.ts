/** Split query into lowercase tokens; strips leading @ from usernames. */
export function parseSearchTokens(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(token => (token.startsWith('@') ? token.slice(1) : token));
}

/** Every token must appear somewhere in the combined searchable text. */
export function matchesSearchTokens(
  fields: Array<string | null | undefined>,
  tokens: string[],
): boolean {
  if (tokens.length === 0) return false;
  const haystack = fields
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();
  if (!haystack) return false;
  return tokens.every(token => haystack.includes(token));
}

export function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}
