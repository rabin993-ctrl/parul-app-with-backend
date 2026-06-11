import React, { useEffect, useState } from 'react';
import { CompanionMiniSheet, CompanionFullProfile } from './CompanionProfile';
import { ToastData } from './ui/Toast';

/** Mini sheet + full profile stack (same as feed home). */
export function CompanionProfileOverlay({
  companionId,
  onCompanionIdChange,
  onToast,
}: {
  companionId: string | null;
  onCompanionIdChange: (id: string | null) => void;
  onToast: (t: ToastData) => void;
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

  return (
    <>
      <CompanionMiniSheet
        companionId={companionId}
        visible={!fullOpen}
        onClose={closeAll}
        onViewProfile={() => setFullOpen(true)}
        onToast={onToast}
      />
      <CompanionFullProfile
        companionId={companionId}
        visible={fullOpen}
        onClose={closeAll}
        onSwitchCompanion={onCompanionIdChange}
        onToast={onToast}
      />
    </>
  );
}
