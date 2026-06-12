export type FeedPostDestination =
  | { type: 'feed' }
  | { type: 'community'; id: string; label: string; icon: string; tint: string };

export type GroupPostDestination = {
  id: string;
  label: string;
  icon: string;
  tint: string;
};

export function feedDestinationKey(dest: FeedPostDestination): string {
  return dest.type === 'feed' ? 'feed' : dest.id;
}

export function groupDestinationKey(dest: GroupPostDestination): string {
  return dest.id;
}

export function toggleFeedDestination(
  list: FeedPostDestination[],
  dest: FeedPostDestination,
): FeedPostDestination[] {
  const key = feedDestinationKey(dest);
  const exists = list.some(d => feedDestinationKey(d) === key);
  if (exists) {
    const next = list.filter(d => feedDestinationKey(d) !== key);
    return next.length > 0 ? next : list;
  }
  return [...list, dest];
}

export function toggleGroupDestination(
  list: GroupPostDestination[],
  dest: GroupPostDestination,
): GroupPostDestination[] {
  const exists = list.some(d => d.id === dest.id);
  if (exists) {
    const next = list.filter(d => d.id !== dest.id);
    return next.length > 0 ? next : list;
  }
  return [...list, dest];
}

export function formatFeedDestinationsLabel(dests: FeedPostDestination[]): string {
  if (dests.length === 0) return 'Choose audience';
  if (dests.length === 1) {
    return dests[0]!.type === 'feed' ? 'Feed' : dests[0]!.label;
  }
  const names = dests.map(d => (d.type === 'feed' ? 'Feed' : d.label));
  if (names.length === 2) return `${names[0]} + ${names[1]}`;
  return `${names.length} places`;
}

export function formatGroupDestinationsLabel(dests: GroupPostDestination[]): string {
  if (dests.length === 0) return 'Choose group';
  if (dests.length === 1) return dests[0]!.label;
  if (dests.length === 2) return `${dests[0]!.label} + ${dests[1]!.label}`;
  return `${dests.length} groups`;
}

export function splitComposerText(text: string): { title: string; body: string } {
  const trimmed = text.trim();
  const newlineIdx = trimmed.indexOf('\n');
  if (newlineIdx > 0) {
    const title = trimmed.slice(0, newlineIdx).trim();
    const body = trimmed.slice(newlineIdx + 1).trim();
    return { title, body: body || trimmed };
  }
  return { title: trimmed, body: trimmed };
}
