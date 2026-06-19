import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { formatVoiceDuration } from '../lib/circleChatMedia';

export function useCircleVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [active, setActive] = useState(false);

  const start = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') return false;
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) return false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setActive(true);
    return true;
  }, [recorder]);

  const cancel = useCallback(async () => {
    if (recorder.isRecording) await recorder.stop();
    setActive(false);
  }, [recorder]);

  const finish = useCallback(async (): Promise<{ uri: string; durationMs: number } | null> => {
    if (recorder.isRecording) await recorder.stop();
    const status = recorder.getStatus();
    const uri = recorder.uri ?? status.url ?? null;
    const durationMs = status.durationMillis || Math.round(recorder.currentTime * 1000);
    setActive(false);
    if (!uri || durationMs < 500) return null;
    return { uri, durationMs };
  }, [recorder]);

  return {
    active,
    durationLabel: formatVoiceDuration(state.durationMillis),
    start,
    cancel,
    finish,
  };
}
