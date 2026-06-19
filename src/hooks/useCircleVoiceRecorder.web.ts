import { useCallback } from 'react';

/** Web stub — expo-audio recording is native-only. */
export function useCircleVoiceRecorder() {
  const start = useCallback(async (): Promise<boolean> => false, []);
  const cancel = useCallback(async () => {}, []);
  const finish = useCallback(async (): Promise<{ uri: string; durationMs: number } | null> => null, []);

  return {
    active: false,
    durationLabel: '0:00',
    start,
    cancel,
    finish,
  };
}
