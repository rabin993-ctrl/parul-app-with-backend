import React, {
  createContext, useCallback, useContext, useMemo, useState,
} from 'react';
import { clearDevPersistedState } from '../dev/devResetStorage';
import { runAllDevResets } from '../dev/devResetRegistry';

type DevResetContextValue = {
  resetAll: () => Promise<void>;
  resetting: boolean;
};

const DevResetContext = createContext<DevResetContextValue | null>(null);

export function DevResetProvider({ children }: { children: React.ReactNode }) {
  const [resetting, setResetting] = useState(false);

  const resetAll = useCallback(async () => {
    setResetting(true);
    try {
      await clearDevPersistedState();
      await runAllDevResets();
    } finally {
      setResetting(false);
    }
  }, []);

  const value = useMemo(
    () => ({ resetAll, resetting }),
    [resetAll, resetting],
  );

  return (
    <DevResetContext.Provider value={value}>
      {children}
    </DevResetContext.Provider>
  );
}

export function useDevReset() {
  const ctx = useContext(DevResetContext);
  if (!ctx) throw new Error('useDevReset must be used within DevResetProvider');
  return ctx;
}
