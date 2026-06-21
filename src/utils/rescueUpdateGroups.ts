import type { RescueUpdate } from '../data/profileData';

export type RescueUpdateDayGroup = 'Today' | 'Yesterday' | 'Earlier';

export type GroupedRescueUpdates = {
  group: RescueUpdateDayGroup;
  updates: RescueUpdate[];
};

function dayGroupFromTime(time: string): RescueUpdateDayGroup {
  if (time.startsWith('Today,')) return 'Today';
  if (time.startsWith('Yesterday,')) return 'Yesterday';
  return 'Earlier';
}

/** Clock portion from formatted rescue update time, e.g. "5:53 AM". */
export function rescueUpdateClock(time: string): string {
  const comma = time.indexOf(', ');
  if (comma === -1) return time;
  return time.slice(comma + 2);
}

export function groupRescueUpdatesByDay(updates: RescueUpdate[]): GroupedRescueUpdates[] {
  const groups: GroupedRescueUpdates[] = [];
  for (const update of updates) {
    const group = dayGroupFromTime(update.time);
    const last = groups[groups.length - 1];
    if (last?.group === group) {
      last.updates.push(update);
    } else {
      groups.push({ group, updates: [update] });
    }
  }
  return groups;
}
