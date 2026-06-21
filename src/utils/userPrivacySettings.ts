import { supabase } from '../lib/supabase';
import type { UserPrivacySettings } from '../context/UserPrivacyContext';

type DbRow = {
  user_id: string;
  profile_visibility: UserPrivacySettings['profileVisibility'];
  post_visibility: UserPrivacySettings['postVisibility'];
  message_policy: UserPrivacySettings['messagePolicy'];
  discoverable: boolean;
  show_online: boolean;
  show_location: boolean;
  show_companions: boolean;
  notify_post_activity: boolean;
  notify_adoption_updates: boolean;
  show_treats_on_profile: boolean;
};

export function settingsToDbRow(userId: string, s: UserPrivacySettings): DbRow {
  return {
    user_id: userId,
    profile_visibility: s.profileVisibility,
    post_visibility: s.postVisibility,
    message_policy: s.messagePolicy,
    discoverable: s.discoverable,
    show_online: s.showOnline,
    show_location: s.showLocation,
    show_companions: s.showCompanions,
    notify_post_activity: s.notifyPostActivity,
    notify_adoption_updates: s.notifyAdoptionUpdates,
    show_treats_on_profile: s.showTreatsOnProfile,
  };
}

export async function upsertUserPrivacySettings(
  userId: string,
  settings: UserPrivacySettings,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase
    .from('user_privacy_settings')
    .upsert(settingsToDbRow(userId, settings), { onConflict: 'user_id' });

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function upsertShowTreatsOnProfile(
  userId: string,
  show: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase
    .from('user_privacy_settings')
    .upsert(
      { user_id: userId, show_treats_on_profile: show },
      { onConflict: 'user_id' },
    );

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
