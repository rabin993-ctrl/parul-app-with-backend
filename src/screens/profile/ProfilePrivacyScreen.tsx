import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { ProfileSubHeader } from '../../components/profile/ProfileChrome';
import {
  ProfileMenuIntro,
  ProfileMenuPickerRow,
  ProfileMenuSection,
  ProfileMenuToggleRow,
  profileMenuStyles,
} from '../../components/profile/ProfileSettingsRows';
import { Toast, ToastData } from '../../components/ui/Toast';
import {
  MessagePolicy,
  ProfileVisibility,
  useUserPrivacy,
} from '../../context/UserPrivacyContext';
import { useTabBarScrollPadding } from '../../navigation/tabBarInsets';
import { useTabBarScrollProps } from '../../context/TabBarScrollContext';

const VISIBILITY_OPTIONS = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'circles', label: 'Circles' },
  { id: 'only_me', label: 'Only me' },
] as const;

const MESSAGE_OPTIONS = [
  { id: 'everyone', label: 'Everyone' },
  { id: 'circles', label: 'Circles' },
  { id: 'none', label: 'No one' },
] as const;

export function ProfilePrivacyScreen() {
  const { colors } = useTheme();
  const tabBarPad = useTabBarScrollPadding();
  const tabBarScrollProps = useTabBarScrollProps();
  const { settings, patchSettings } = useUserPrivacy();
  const [toast, setToast] = useState<ToastData | null>(null);

  const saveSetting = useCallback(async (
    patch: Parameters<typeof patchSettings>[0],
    failureMessage: string,
  ) => {
    const ok = await patchSettings(patch);
    if (!ok) {
      setToast({ msg: failureMessage, icon: 'close', tone: 'danger' });
    }
  }, [patchSettings]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ProfileSubHeader title="Privacy settings" />

      <ScrollView
        contentContainerStyle={[profileMenuStyles.scroll, { paddingBottom: tabBarPad + 32 }]}
        showsVerticalScrollIndicator={false}
        {...tabBarScrollProps}
      >
        <ProfileMenuIntro>
          You're in control of who sees you and how you show up.
        </ProfileMenuIntro>

        <ProfileMenuSection title="profile" kicker first>
          <ProfileMenuPickerRow
            icon="user"
            label="Who can see your profile"
            barTint={colors.primary}
            value={settings.profileVisibility}
            options={[...VISIBILITY_OPTIONS]}
            onChange={id => { void saveSetting({ profileVisibility: id as ProfileVisibility }, 'Could not save profile visibility'); }}
          />
          <ProfileMenuToggleRow
            icon="search"
            label="Discoverable in search"
            barTint={colors.primary}
            value={settings.discoverable}
            onValueChange={v => { void saveSetting({ discoverable: v }, 'Could not save discoverability setting'); }}
          />
          <ProfileMenuToggleRow
            icon="eye"
            label="Show when you're online"
            barTint={colors.primary}
            value={settings.showOnline}
            onValueChange={v => { void saveSetting({ showOnline: v }, 'Could not save online visibility'); }}
          />
          <ProfileMenuToggleRow
            icon="bone"
            label="Show treat count on profile"
            hint="Let others see how many treats you have left to give"
            barTint={colors.primary}
            value={settings.showTreatsOnProfile}
            onValueChange={v => { void saveSetting({ showTreatsOnProfile: v }, 'Could not save treat count visibility'); }}
          />
        </ProfileMenuSection>

        <ProfileMenuSection title="posts & paws" kicker>
          <ProfileMenuPickerRow
            icon="grid"
            label="Who can see your posts"
            barTint={colors.accent}
            value={settings.postVisibility}
            options={[...VISIBILITY_OPTIONS]}
            onChange={id => { void saveSetting({ postVisibility: id as ProfileVisibility }, 'Could not save post visibility'); }}
          />
          <ProfileMenuToggleRow
            icon="mapPin"
            barTint={colors.accent}
            label="Show location on posts"
            value={settings.showLocation}
            onValueChange={v => { void saveSetting({ showLocation: v }, 'Could not save location visibility'); }}
          />
          <ProfileMenuToggleRow
            icon="paw"
            barTint={colors.accent}
            label="Show companions on profile"
            value={settings.showCompanions}
            onValueChange={v => { void saveSetting({ showCompanions: v }, 'Could not save companion visibility'); }}
          />
        </ProfileMenuSection>

        <ProfileMenuSection title="messaging" kicker>
          <ProfileMenuPickerRow
            icon="comment"
            label="Who can message you"
            barTint={colors.success}
            value={settings.messagePolicy}
            options={[...MESSAGE_OPTIONS]}
            onChange={id => { void saveSetting({ messagePolicy: id as MessagePolicy }, 'Could not save messaging policy'); }}
          />
        </ProfileMenuSection>
      </ScrollView>

      <Toast data={toast} onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
