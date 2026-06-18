import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';

type SheetOverlayContextValue = {
  openCount: number;
  registerOpen: () => void;
  registerClose: () => void;
};

const SheetOverlayContext = createContext<SheetOverlayContextValue | null>(null);

export function SheetOverlayProvider({ children }: { children: React.ReactNode }) {
  const [openCount, setOpenCount] = useState(0);

  const registerOpen = useCallback(() => {
    setOpenCount(c => c + 1);
  }, []);

  const registerClose = useCallback(() => {
    setOpenCount(c => Math.max(0, c - 1));
  }, []);

  const value = useMemo(
    () => ({ openCount, registerOpen, registerClose }),
    [openCount, registerOpen, registerClose],
  );

  return (
    <SheetOverlayContext.Provider value={value}>
      {children}
    </SheetOverlayContext.Provider>
  );
}

export function useSheetOverlayOpen(): boolean {
  const ctx = useContext(SheetOverlayContext);
  return (ctx?.openCount ?? 0) > 0;
}

export function useSheetOverlay() {
  const ctx = useContext(SheetOverlayContext);
  if (!ctx) {
    throw new Error('useSheetOverlay must be used within SheetOverlayProvider');
  }
  return ctx;
}

/** Hides the glass tab bar while mounted (full-screen chat, sheets, etc.). */
export function useHideTabBarWhileMounted() {
  const { registerOpen, registerClose } = useSheetOverlay();
  useEffect(() => {
    registerOpen();
    return registerClose;
  }, [registerOpen, registerClose]);
}
