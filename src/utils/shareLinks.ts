import { Platform, Share } from 'react-native';

async function shareDeepLink(link: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch {
      return false;
    }
  }
  try {
    await Share.share({ message: link });
    return true;
  } catch {
    return false;
  }
}

export function userProfileDeepLink(userId: string): string {
  return `parul://user/${userId}`;
}

export function companionProfileDeepLink(companionId: string): string {
  return `parul://companion/${companionId}`;
}

export async function shareUserProfileLink(userId: string): Promise<boolean> {
  return shareDeepLink(userProfileDeepLink(userId));
}

export async function shareCompanionProfileLink(companionId: string): Promise<boolean> {
  return shareDeepLink(companionProfileDeepLink(companionId));
}
