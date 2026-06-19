import { useMemo } from 'react';
import { usePawCircles } from '../context/PawCircleContext';
import { useCommunityGroups } from '../context/CommunityGroupsContext';
import { buildMentionRegistry } from '../utils/mentionText';
import type { PawCircle } from '../data/pawCircles';

export function useMentionRegistry(extraCircles?: PawCircle[]) {
  const { createdCircles, joinedCircles, exploreCircles } = usePawCircles();
  const { joinedCommunities } = useCommunityGroups();

  return useMemo(() => {
    const byId = new Map<string, PawCircle>();
    for (const c of [
      ...createdCircles,
      ...joinedCircles,
      ...exploreCircles,
      ...(extraCircles ?? []),
    ]) {
      byId.set(c.id, c);
    }
    return buildMentionRegistry({
      circles: [...byId.values()],
      communities: joinedCommunities,
    });
  }, [createdCircles, joinedCircles, exploreCircles, joinedCommunities, extraCircles]);
}
