import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../lib/env';

const STORAGE_PREFIX = '@parul/tutorial_completed_v1/';

export function useAppTutorial(userId: string | undefined) {
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(true);

  useEffect(() => {
    if (!ENV.APP_TUTORIAL_ENABLED || !userId) {
      setCompleted(true);
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);

    AsyncStorage.getItem(`${STORAGE_PREFIX}${userId}`)
      .then(value => {
        if (cancelled) return;
        setCompleted(value === '1');
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setCompleted(false);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const markComplete = useCallback(async () => {
    if (!userId) return;
    setCompleted(true);
    try {
      await AsyncStorage.setItem(`${STORAGE_PREFIX}${userId}`, '1');
    } catch {
      // Still hide tutorial — local state is enough for this session.
    }
  }, [userId]);

  return {
    ready,
    completed,
    markComplete,
    enabled: ENV.APP_TUTORIAL_ENABLED,
  };
}
