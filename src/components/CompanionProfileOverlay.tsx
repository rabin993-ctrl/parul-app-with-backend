import React, { useEffect, useState } from 'react';
import { CompanionMiniSheet, CompanionFullProfile } from './CompanionProfile';
import { ToastData } from './ui/Toast';

/** Mini sheet + full profile stack (same as feed home). */
export function CompanionProfileOverlay({
  companionId,
  onCompanionIdChange,
  onOwnerPress,
  onToast,
  onOpenPostDetail,
}: {
  companionId: string | null;
  onCompanionIdChange: (id: string | null) => void;
  onOwnerPress?: (ownerId: string) => void;
  onToast: (t: ToastData) => void;
  onOpenPostDetail?: (postId: string, companionId: string) => void;
}) {
  const [fullOpen, setFullOpen] = useState(false);

  useEffect(() => {
    if (!companionId) setFullOpen(false);
  }, [companionId]);

  if (!companionId) return null;

  const closeAll = () => {
    setFullOpen(false);
    onCompanionIdChange(null);
  };

  const closeFullProfile = () => {
    setFullOpen(false);
  };

  const handleOwnerPress = (ownerId: string) => {
    closeAll();
    onOwnerPress?.(ownerId);
  };

  const handleOpenPostDetail = (postId: string, cid: string) => {
    closeAll();
    onOpenPostDetail?.(postId, cid);
  };

  return (
    <>
      <CompanionMiniSheet
        companionId={companionId}
        visible={!fullOpen}
        onClose={closeAll}
        onViewProfile={() => setFullOpen(true)}
        onOwnerPress={handleOwnerPress}
        onToast={onToast}
      />
      <CompanionFullProfile
        companionId={companionId}
        visible={fullOpen}
        onClose={closeFullProfile}
        onSwitchCompanion={onCompanionIdChange}
        onOwnerPress={handleOwnerPress}
        onToast={onToast}
        onOpenPostDetail={onOpenPostDetail ? handleOpenPostDetail : undefined}
      />
    </>
  );
}
