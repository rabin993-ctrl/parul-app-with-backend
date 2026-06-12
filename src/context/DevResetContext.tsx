import React, {
  createContext, useCallback, useContext, useMemo, useState,
} from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearDevPersistedState } from '../dev/devResetStorage';
import { runAllDevResets } from '../dev/devResetRegistry';
import { Button } from '../components/ui/Button';
import { Toast, ToastData } from '../components/ui/Toast';

type DevResetContextValue = {
  resetAll: () => Promise<void>;
  resetting: boolean;
};

const DevResetContext = createContext<DevResetContextValue | null>(null);

export function DevResetProvider({ children }: { children: React.ReactNode }) {
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const insets = useSafeAreaInsets();

  const resetAll = useCallback(async () => {
    setResetting(true);
    try {
      await clearDevPersistedState();
      await runAllDevResets();
      setToast({ msg: 'Demo state reset', icon: 'check', tone: 'success' });
    } catch {
      setToast({ msg: 'Reset failed — try again', icon: 'alert', tone: 'danger' });
    } finally {
      setResetting(false);
    }
  }, []);

  const confirmReset = useCallback(() => {
    const title = 'Reset demo data?';
    const message = 'Restores adoption, chats, feed, circles, treats, and profile to seed state.';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
        void resetAll();
      }
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => { void resetAll(); } },
    ]);
  }, [resetAll]);

  const value = useMemo(
    () => ({ resetAll, resetting }),
    [resetAll, resetting],
  );

  return (
    <DevResetContext.Provider value={value}>
      {children}
      {__DEV__ ? (
        <>
          <View
            pointerEvents="box-none"
            style={[styles.fabWrap, { bottom: Math.max(insets.bottom, 12) + 72 }]}
          >
            <Button
              size="sm"
              variant="soft"
              onPress={confirmReset}
              disabled={resetting}
            >
              {resetting ? 'Resetting…' : 'Reset demo'}
            </Button>
          </View>
          <Toast data={toast} onHide={() => setToast(null)} />
        </>
      ) : null}
    </DevResetContext.Provider>
  );
}

export function useDevReset() {
  const ctx = useContext(DevResetContext);
  if (!ctx) throw new Error('useDevReset must be used within DevResetProvider');
  return ctx;
}

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: 12,
    zIndex: 9999,
    elevation: 12,
  },
});
