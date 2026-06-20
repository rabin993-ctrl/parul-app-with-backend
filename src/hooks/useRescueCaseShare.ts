import { useCallback, useState } from 'react';
import type { ForwardDest } from '../components/ForwardSheet';
import type { RescueCase } from '../data/profileData';
import type { ToastData } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { usePawCircles } from '../context/PawCircleContext';
import { useCommunityGroups } from '../context/CommunityGroupsContext';
import { shareRescueCase } from '../utils/shareRescueCase';

export function useRescueCaseShare(onToast: (t: ToastData) => void) {
  const { user } = useAuth();
  const { createdCircles, joinedCircles } = usePawCircles();
  const { joinedCommunities } = useCommunityGroups();
  const [shareCase, setShareCase] = useState<RescueCase | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const openShare = useCallback((caseItem: RescueCase) => {
    setShareCase(caseItem);
    setShareOpen(true);
  }, []);

  const closeShare = useCallback(() => {
    setShareOpen(false);
  }, []);

  const completeShare = useCallback(async (dests: ForwardDest[], note?: string) => {
    if (!shareCase || !user || dests.length === 0) return;
    await shareRescueCase(shareCase, dests, user.id, note);
    setShareOpen(false);
    const label = dests.map(d => d.label).join(', ');
    onToast({ msg: `Shared to ${label}`, icon: 'forward', tone: 'success' });
  }, [shareCase, user, onToast]);

  return {
    shareOpen,
    openShare,
    closeShare,
    completeShare,
    createdCircles,
    joinedCircles,
    joinedCommunities,
  };
}
