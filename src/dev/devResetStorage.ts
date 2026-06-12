import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/treatWallet';

/** AsyncStorage keys cleared on global dev reset (theme is intentionally kept). */
export const DEV_RESET_STORAGE_KEYS = [
  'parul:currentUserProfile:you',
  'parul:privacySettings',
  'parul:blockedUsers',
  STORAGE_KEYS.wallet,
  STORAGE_KEYS.gifts,
  STORAGE_KEYS.showTreatsOnProfile,
  'parul:pawCircles:v1',
] as const;

export async function clearDevPersistedState(): Promise<void> {
  await AsyncStorage.multiRemove([...DEV_RESET_STORAGE_KEYS]);
}
