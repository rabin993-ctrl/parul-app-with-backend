import React, { createContext, useContext, useMemo } from 'react';
import { usePawCircles } from './PawCircleContext';
import { useCirclePreviews, type CirclePreviewData } from '../hooks/useCirclePreviews';

const EMPTY_PREVIEW: CirclePreviewData = {
  lastMessage: '',
  lastMessageTime: '',
  unread: 0,
};

type CirclePreviewContextValue = {
  previews: Record<string, CirclePreviewData>;
  totalUnread: number;
};

const CirclePreviewContext = createContext<CirclePreviewContextValue>({
  previews: {},
  totalUnread: 0,
});

/** Single shared subscription for circle chat previews + unread counts. */
export function CirclePreviewProvider({ children }: { children: React.ReactNode }) {
  const { joinedCircles, getDbId } = usePawCircles();
  const entries = useMemo(
    () => joinedCircles.map(c => ({ id: c.id, dbId: getDbId(c.id) ?? '' })),
    [joinedCircles, getDbId],
  );
  const previews = useCirclePreviews(entries);
  const totalUnread = useMemo(
    () => Object.values(previews).reduce((sum, p) => sum + (p.unread ?? 0), 0),
    [previews],
  );

  const value = useMemo(
    () => ({ previews, totalUnread }),
    [previews, totalUnread],
  );

  return (
    <CirclePreviewContext.Provider value={value}>
      {children}
    </CirclePreviewContext.Provider>
  );
}

export function useCirclePreviewMap(): Record<string, CirclePreviewData> {
  return useContext(CirclePreviewContext).previews;
}

export function useCircleUnreadCount(): number {
  return useContext(CirclePreviewContext).totalUnread;
}

export function useCirclePreview(circleId: string): CirclePreviewData {
  const { previews } = useContext(CirclePreviewContext);
  return previews[circleId] ?? EMPTY_PREVIEW;
}
